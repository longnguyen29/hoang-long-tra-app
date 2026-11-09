import { createHash } from "node:crypto";

export function hashBridgeToken(token) {
  if(typeof token!=="string" || !/^hlzb_[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(token,"utf8").digest("hex");
}
export function normalizePersonalZaloMessage(raw) {
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) return null;
  if(raw.channel!=="zalo_personal" || typeof raw.externalId!=="string" ||
    !/^[0-9A-Za-z_.:-]{4,120}$/.test(raw.externalId)) return null;
  if(typeof raw.text!=="string" || !raw.text.trim() || raw.text.length>12000) return null;
  if(typeof raw.messageId!=="string" || !/^[a-zA-Z0-9:._-]{4,240}$/.test(raw.messageId)) return null;
  const timestamp=raw.at && !Number.isNaN(Date.parse(raw.at)) ? new Date(raw.at).toISOString() : new Date().toISOString();
  const name=typeof raw.name==="string" ? raw.name.trim().slice(0,160) : "";
  return {channel:"zalo_personal",externalId:raw.externalId,messageId:raw.messageId,
    name:name||"Zalo cá nhân · "+raw.externalId.slice(-5),text:raw.text,at:timestamp};
}
