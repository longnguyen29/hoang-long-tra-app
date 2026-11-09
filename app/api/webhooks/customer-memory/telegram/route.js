import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyDraftAction, telegramCall } from "@/lib/customer-memory-server";

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
