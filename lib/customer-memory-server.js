import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildMemoryPrompt, cleanText, mergeFacts, parseAiJson, supportedFacts, validIncoming } from "@/lib/customer-memory-core";

const adminClient = () => createAdminClient();


function configuredTelegram() {
  const dedicated = !!(process.env.CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN?.trim() && process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID?.trim());
  return {
    dedicated,
    token: dedicated ? process.env.CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN.trim() : process.env.TELEGRAM_BOT_TOKEN?.trim(),
    chat: dedicated ? process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID.trim() : process.env.TELEGRAM_CHAT_ID?.trim(),
  };
}

export async function telegramCall(method, body) {
  const { token } = configuredTelegram();
  if (!token) return { ok:false, error:"telegram_not_configured" };
  try {
    const res=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
      signal:AbortSignal.timeout(9000),
    });
    const data=await res.json().catch(()=>({}));
    return {ok:res.ok && data.ok===true,result:data.result,error:res.ok?"":"telegram_api_error"};
  } catch {return {ok:false,error:"telegram_unreachable"};}
}

export async function notifyDraft(admin,draft,thread,message) {
  const { token,chat,dedicated }=configuredTelegram();
  if (!token || !chat || draft.telegram_notified_at) return false;
  const base=process.env.CUSTOMER_MEMORY_SITE_URL?.trim();
  const link=base && /^https:\/\/[^ ]+$/.test(base) ? base.replace(/\/$/,"")+"/admin/customer-memory?thread="+thread.id : null;
  const text=dedicated ? "🍵 HOÀNG LONG · Tin khách mới\n"+
    (thread.display_name || "Khách hàng") +" · "+ thread.channel +
    "\n\n📥 Khách: "+message.body.slice(0,1200)+
    (draft.body ? "\n\n✍️ Gợi ý trả lời (CHƯA GỬI):\n"+draft.body.slice(0,1800) : "\n\n⚠️ AI chưa tạo được bản nháp, vui lòng mở CRM và trả lời thủ công.")+
    (thread.next_action?"\n\n⏳ Việc tiếp theo: "+thread.next_action:"")+
    "\n\n⚠️ Kiểm tra giá, số lượng và cam kết trước khi gửi." : "🍵 HOÀNG LONG · Có tin khách mới cần phản hồi. Mở mục Trí nhớ khách hàng trong bàn quản trị để xem và soạn nháp. (Chi tiết khách hàng chỉ gửi qua bot riêng đã cấu hình.)";
  const buttons=[];
  if(dedicated && draft.body) buttons.push([{text:"✅ Duyệt nháp (không gửi)",callback_data:"ready:"+draft.id}]);
  if(dedicated) buttons.push([{text:"⏰ Nhắc ngày mai",callback_data:"snooze:"+draft.id}]);
  if(link) buttons.push([{text:"✏️ Mở & chỉnh sửa trong CRM",url:link}]);
  const result=await telegramCall("sendMessage",{chat_id:chat,text,reply_markup:{inline_keyboard:buttons},disable_web_page_preview:true});
  if (result.ok) await admin.from("customer_memory_drafts").update({telegram_notified_at:new Date().toISOString()}).eq("id",draft.id).is("telegram_notified_at",null);
  return result.ok;
}

function assertDB(result) {
  if(result.error) throw new Error("memory_database_unavailable");
  return result.data;
}

export async function receiveCustomerMessage(input, {generate=true}={}) {
  if(!validIncoming(input)) throw new Error("invalid_input");
  const admin=adminClient();
  const channel=input.channel;
  let thread;
  if(input.threadId){
    const res=await admin.from("customer_memory_threads").select("*").eq("id",input.threadId).maybeSingle();
    thread=assertDB(res);
    if(!thread) throw new Error("thread_not_found");
    // Never allow an incoming payload to silently link unrelated threads.
    if(thread.channel!==channel) throw new Error("channel_mismatch");
  } else {
    const externalId=cleanText(input.externalId,240) || "manual:"+randomUUID();
    const displayName=cleanText(input.name,160) || (channel==="facebook"?"Facebook · "+externalId.slice(-5):"Khách chưa đặt tên");
    const inserted=await admin.from("customer_memory_threads").upsert({channel,external_id:externalId,display_name:displayName},
      {onConflict:"channel,external_id",ignoreDuplicates:true}).select("*").maybeSingle();
    if(inserted.error) throw new Error("memory_database_unavailable");
    if(inserted.data) thread=inserted.data;
    else thread=assertDB(await admin.from("customer_memory_threads").select("*").eq("channel",channel).eq("external_id",externalId).single());
  }
  const messageId=cleanText(input.messageId,240) || "manual:"+randomUUID();
  const occurredAt=input.at && !Number.isNaN(Date.parse(input.at)) ? new Date(input.at).toISOString() : new Date().toISOString();
  const inserted=await admin.from("customer_memory_messages").upsert({
    thread_id:thread.id,external_message_id:messageId,direction:"inbound",
    body:cleanText(input.text,12000),occurred_at:occurredAt,
  },{onConflict:"thread_id,external_message_id",ignoreDuplicates:true}).select("*").maybeSingle();
  if(inserted.error) throw new Error("memory_database_unavailable");
  if(!inserted.data) return {thread_id:thread.id,duplicate:true};
  const message=inserted.data;
  assertDB(await admin.from("customer_memory_threads").update({
    last_message_at:new Date().toISOString(),updated_at:new Date().toISOString(),status:"waiting_us",
    next_action_at:null,last_reminded_at:null,reminder_notified_at:null,
  }).eq("id",thread.id));
  const draft=assertDB(await admin.from("customer_memory_drafts").insert({thread_id:thread.id,message_id:message.id}).select("*").single());
  await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"created"});
  if(!generate) return {thread_id:thread.id,draft_id:draft.id,saved:true,pending:true};
  const generated=await generateDraft(draft.id,admin);
  return {thread_id:thread.id,draft_id:draft.id,saved:true,...generated};
}

export async function generateDraft(draftId,admin=adminClient()) {
  const draft=assertDB(await admin.from("customer_memory_drafts").select("*").eq("id",draftId).single());
  if(!["processing","ai_unavailable"].includes(draft.status)) return {draft_status:draft.status};
  const thread=assertDB(await admin.from("customer_memory_threads").select("*").eq("id",draft.thread_id).single());
  const messages=assertDB(await admin.from("customer_memory_messages").select("*").eq("thread_id",thread.id).order("occurred_at",{ascending:false}).limit(16));
  const chronological=messages.reverse();
  const inbound=chronological.find(m=>m.id===draft.message_id);
  if (!inbound) throw new Error("message_not_found");
  const apiKey=process.env.OPENAI_API_KEY?.trim();
  if(!apiKey) {
    const unavailable=assertDB(await admin.from("customer_memory_drafts").update({status:"ai_unavailable",ai_error:"openai_not_configured"}).eq("id",draft.id).select("*").single());
    const telegramNotified=await notifyDraft(admin,unavailable,thread,inbound);
    return {draft_status:"ai_unavailable",error:"openai_not_configured",telegram_notified:telegramNotified};
  }
  try {
    const model=process.env.CUSTOMER_MEMORY_MODEL?.trim() || "gpt-5-mini";
    const res=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
      body:JSON.stringify(buildMemoryPrompt({name:thread.display_name,messages:chronological,
        facts:thread.facts,summary:thread.summary,model})),signal:AbortSignal.timeout(30000)
    });
    if(!res.ok) throw new Error("ai_service_error");
    const data=await res.json();
    const output=parseAiJson(data);
    const supported=supportedFacts(output.facts,chronological);
    const facts=mergeFacts(thread.facts,supported);
    const nextAction=output.nextAction;
    const updated=assertDB(await admin.from("customer_memory_threads").update({
      summary:output.summary || thread.summary, facts,
      next_action:nextAction || thread.next_action,
      updated_at:new Date().toISOString(),
    }).eq("id",thread.id).select("*").single());
    const saved=assertDB(await admin.from("customer_memory_drafts").update({
      body:output.reply,status:"draft",ai_error:"",updated_at:new Date().toISOString(),
    }).eq("id",draft.id).in("status",["processing","ai_unavailable"]).select("*").single());
    await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"ai_ready"});
    const notified=saved.body ? await notifyDraft(admin,saved,updated,inbound) : false;
    return {draft_status:"draft",telegram_notified:notified};
  } catch {
    const unavailable=assertDB(await admin.from("customer_memory_drafts").update({status:"ai_unavailable",ai_error:"ai_unavailable"}).eq("id",draft.id).select("*").single());
    await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"ai_failed"});
    const telegramNotified=await notifyDraft(admin,unavailable,thread,inbound);
    return {draft_status:"ai_unavailable",error:"ai_unavailable",telegram_notified:telegramNotified};
  }
}

export async function applyDraftAction(admin, draftId, action, body) {
  const draft=assertDB(await admin.from("customer_memory_drafts").select("*").eq("id",draftId).single());
  if(action==="regenerate") {
    if(!["ai_unavailable","processing"].includes(draft.status)) throw new Error("action_not_allowed");
    return await generateDraft(draft.id,admin);
  }
  if(action==="save") {
    const text=cleanText(body,4000);
    if(!text || text.length>4000 || draft.status!=="draft") throw new Error("invalid_input");
    const saved=assertDB(await admin.from("customer_memory_drafts").update({body:text,updated_at:new Date().toISOString()})
      .eq("id",draft.id).eq("status","draft").select("id").maybeSingle());
    if(!saved) throw new Error("stale_draft");
    await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"edited"});
    return {status:"draft"};
  }
  if(action==="approve") {
    if(draft.status!=="draft" || !draft.body) throw new Error("action_not_allowed");
    const saved=assertDB(await admin.from("customer_memory_drafts").update({status:"approved",approved_at:new Date().toISOString()})
      .eq("id",draft.id).eq("status","draft").select("id").maybeSingle());
    if(!saved) throw new Error("stale_draft");
    await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"approved",detail:"Approved internally; no external reply was sent"});
    return {status:"approved",external_message_sent:false};
  }
  if(action==="snooze") {
    const tomorrow=new Date(Date.now()+24*3600*1000).toISOString();
    assertDB(await admin.from("customer_memory_threads").update({next_action_at:tomorrow,last_reminded_at:null,reminder_notified_at:null,status:"waiting_us"})
      .eq("id",draft.thread_id));
    await admin.from("customer_memory_events").insert({draft_id:draft.id,event:"snoozed"});
    return {status:"snoozed",next_action_at:tomorrow};
  }
  throw new Error("invalid_action");
}

export async function readCustomerMemory(admin, threadId) {
  const threads=assertDB(await admin.from("customer_memory_threads").select("*").order("last_message_at",{ascending:false}).limit(100));
  if(!threadId) return {threads,messages:[],drafts:[]};
  const thread=threads.find(t=>t.id===threadId);
  if(!thread) throw new Error("thread_not_found");
  const [messageResult,draftResult]=await Promise.all([
    admin.from("customer_memory_messages").select("*").eq("thread_id",threadId).order("occurred_at",{ascending:false}).limit(80),
    admin.from("customer_memory_drafts").select("*").eq("thread_id",threadId).order("created_at",{ascending:false}).limit(25),
  ]);
  return {threads,messages:assertDB(messageResult).reverse(),drafts:assertDB(draftResult)};
}


