import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDraftAction, receiveCustomerMessage, telegramCall } from "@/lib/customer-memory-server";

export const runtime="nodejs";

export async function POST(request) {
  const secret=process.env.CUSTOMER_MEMORY_TELEGRAM_WEBHOOK_SECRET?.trim();
  const received=request.headers.get("x-telegram-bot-api-secret-token") || "";
  const expected=Buffer.from(secret || "");
  const actual=Buffer.from(received);
  if(!secret || actual.length!==expected.length || !timingSafeEqual(actual,expected)) {
    return new Response("Unauthorized",{status:401});
  }
  let update;
  try{update=await request.json();}catch{return Response.json({ok:true});}
  // Low-friction personal Zalo fallback: paste a conversation directly to
  // the owner's private Telegram bot. No Zalo credential or screen scraping.
  const incoming=update?.message;
  if(incoming?.text && incoming.chat?.type==="private") {
    const chatId=String(incoming.chat?.id || "");
    const ownerChat=process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID?.trim() || process.env.TELEGRAM_CHAT_ID?.trim();
    const ownerUser=process.env.CUSTOMER_MEMORY_TELEGRAM_USER_ID?.trim();
    const actor=String(incoming.from?.id || "");
    if(chatId!==ownerChat || (ownerUser && actor!==ownerUser) || actor!==chatId) return Response.json({ok:true});
    const raw=incoming.text.trim();
    const newMatch=/^\/(?:khach|remember)(?:@\w+)?\s+([^\n]{2,120})\n([\s\S]{3,12000})$/u.exec(raw);
    const addMatch=/^\/(?:them|add)(?:@\w+)?\s+([0-9a-f-]{36})\n([\s\S]{3,12000})$/iu.exec(raw);
    if(newMatch || addMatch) {
      try {
        let item;
        if(newMatch) item={channel:"zalo_personal",name:newMatch[1],text:newMatch[2]};
        else {
          const admin=createAdminClient();
          const {data,error}=await admin.from("customer_memory_threads").select("id,channel,display_name").eq("id",addMatch[1]).maybeSingle();
          if(error || !data) throw new Error("thread_not_found");
          item={threadId:data.id,channel:data.channel,name:data.display_name,text:addMatch[2]};
        }
        const saved=await receiveCustomerMessage(item);
        await telegramCall("sendMessage",{chat_id:chatId,text:"✅ Đã lưu hội thoại"+(saved.draft_status==="ai_unavailable"?". AI chưa sẵn sàng; có thể tạo lại nháp trong CRM.":", gợi ý đã được xử lý.")});
      }catch{
        await telegramCall("sendMessage",{chat_id:chatId,text:"Không lưu được hội thoại. Kiểm tra quyền quản lý, kết nối AI và database."});
      }
    } else if(/^\/(start|help)(?:@\w+)?$/i.test(raw)) {
      await telegramCall("sendMessage",{chat_id:chatId,text:"🍵 Hoàng Long AI Trí nhớ khách\n\nGhi khách mới (dòng đầu là tên):\n/khach Anh Minh\nKhách: Trà hơi chát...\nMình: Đã báo giá ...\n\nThêm vào hồ sơ cũ:\n/them <ID hồ sơ>\nNội dung hội thoại mới\n\nAI sẽ lưu thông tin và gửi bản nháp. KHÔNG tự gửi tin cho khách."});
    }
    return Response.json({ok:true});
  }
  const callback=update?.callback_query;
  if(!callback?.data || !callback.id) return Response.json({ok:true});
  const chatId=String(callback.message?.chat?.id || "");
  const ownerChat=process.env.CUSTOMER_MEMORY_TELEGRAM_CHAT_ID?.trim() || process.env.TELEGRAM_CHAT_ID?.trim();
  const ownerUser=process.env.CUSTOMER_MEMORY_TELEGRAM_USER_ID?.trim();
  // Group chat approvals are forbidden unless a specific owner id is configured.
  const actor=String(callback.from?.id || "");
  const allowed=chatId && chatId===ownerChat &&
    (ownerUser ? actor===ownerUser : callback.message?.chat?.type==="private" && actor===chatId);
  if(!allowed) {
    await telegramCall("answerCallbackQuery",{callback_query_id:callback.id,text:"Không có quyền"});
    return Response.json({ok:true});
  }
  const match=/^(ready|snooze):([0-9a-f-]{36})$/i.exec(callback.data);
  if(!match) return Response.json({ok:true});
  try{
    const result=await applyDraftAction(createAdminClient(),match[2],match[1]==="ready"?"approve":"snooze");
    await telegramCall("answerCallbackQuery",{callback_query_id:callback.id,text:result.status==="approved"?"Đã duyệt nháp — chưa gửi khách":"Đã hẹn nhắc"});
    if(callback.message?.message_id) {
      await telegramCall("editMessageReplyMarkup",{chat_id:chatId,message_id:callback.message.message_id,
        reply_markup:{inline_keyboard:[]}});
    }
  }catch{
    await telegramCall("answerCallbackQuery",{callback_query_id:callback.id,text:"Chưa xử lý được, mở CRM để kiểm tra",show_alert:true});
  }
  return Response.json({ok:true});
}
