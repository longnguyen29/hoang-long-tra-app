import { createAdminClient } from "@/lib/supabase/admin";
import { generateDraft, telegramCall } from "@/lib/customer-memory-server";

export const runtime="nodejs";
export const maxDuration=60;

export async function GET(request) {
  const secret=process.env.CRON_SECRET?.trim();
  if(!secret || request.headers.get("authorization")!=="Bearer "+secret) return Response.json({ok:false},{status:401});
  const admin=createAdminClient();
  const now=new Date().toISOString();
  const [dueResult, pendingResult]=await Promise.all([
    admin.from("customer_memory_threads").select("id,display_name,channel,next_action,next_action_at")
      .neq("status","done").lte("next_action_at",now).is("last_reminded_at",null).order("next_action_at").limit(20),
    admin.from("customer_memory_drafts").select("id,status,created_at").eq("status","processing")
      .lt("created_at",new Date(Date.now()-5*60000).toISOString()).order("created_at").limit(5),
  ]);
  if(dueResult.error || pendingResult.error) return Response.json({ok:false,error:"database_unavailable"},{status:503});
  let sent=0,failed=0,recovered=0;
  const dedicated=Boolean(process.env.CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN?.trim() && process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID?.trim());
  const botToken=dedicated?process.env.CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN?.trim():process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId=dedicated?process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID?.trim():process.env.TELEGRAM_CHAT_ID?.trim();
  for(const t of dueResult.data || []) {
    if(!botToken || !chatId) break;
    // Claim by compare-and-set. Snoozing a thread resets last_reminded_at to null.
    const claimed=await admin.from("customer_memory_threads").update({last_reminded_at:now})
      .eq("id",t.id).eq("next_action_at",t.next_action_at).is("last_reminded_at",null).select("id").maybeSingle();
    if(claimed.error || !claimed.data) continue;
    const url=process.env.CUSTOMER_MEMORY_SITE_URL?.trim();
    const link=url && /^https:\/\/[^ ]+$/.test(url)?url.replace(/\/$/,"")+"/admin/customer-memory?thread="+t.id:"";
    const message=dedicated ? "⏰ HOÀNG LONG · Nhắc chăm sóc khách\n"+
      (t.display_name||"Khách hàng")+" · "+t.channel+
      "\nViệc cần làm: "+(t.next_action||"Kiểm tra lại hội thoại, quyết định bước tiếp theo")+
      (link?"\nMở hồ sơ: "+link:"") : "⏰ HOÀNG LONG · Có khách đến hạn chăm sóc. Mở mục Trí nhớ khách hàng trong bàn quản trị để xem chi tiết.";
    const result=await telegramCall("sendMessage",{chat_id:chatId,text:message,disable_web_page_preview:true});
    if(result.ok) sent++;
    else {
      failed++;
      // Only unclaim our own receipt; if user snoozed since, do not undo newer state.
      await admin.from("customer_memory_threads").update({last_reminded_at:null})
        .eq("id",t.id).eq("last_reminded_at",now);
    }
  }
  for(const draft of pendingResult.data||[]) {
    try{
      const out=await generateDraft(draft.id,admin);
      if(out.draft_status==="draft") recovered++;
    }catch{/* A later run can retry safely. */}
  }
  return Response.json({ok:true,sent,failed,recovered,scanned:(dueResult.data||[]).length});
}
