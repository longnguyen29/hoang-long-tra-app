import {createHash,timingSafeEqual} from "node:crypto";

export function verifyZaloOaSignature(raw, appId, timestamp, secret, signature) {
  if(!appId || !secret || !timestamp || typeof raw!=="string" || !/^mac=[a-f0-9]{64}$/i.test(signature||"")) return false;
  const expected=createHash("sha256").update(String(appId)+raw+String(timestamp)+String(secret)).digest();
  const received=Buffer.from(signature.slice(4),"hex");
  return received.length===expected.length && timingSafeEqual(received,expected);
}
export function parseZaloOaIncoming(event,expectedAppId,expectedOaId) {
  if(!event || event.event_name!=="user_send_text" || String(event.app_id||"")!==String(expectedAppId||"") ||
    String(event.recipient?.id||"")!==String(expectedOaId||"")) return null;
  const externalId=String(event.sender?.id||"");
  const messageId=String(event.message?.msg_id||"");
  const text=event.message?.text;
  if(!/^\d{5,30}$/.test(externalId) || !/^[a-zA-Z0-9]{5,200}$/.test(messageId) ||
    typeof text!=="string" || !text.trim() || text.length>12000) return null;
  const ts=Number(event.timestamp);
  const at=Number.isFinite(ts) && ts>946684800000 && ts<Date.now()+300000 ? new Date(ts).toISOString():new Date().toISOString();
  return {channel:"zalo_oa",externalId,messageId,text,at,name:"Zalo OA · "+externalId.slice(-5)};
}
