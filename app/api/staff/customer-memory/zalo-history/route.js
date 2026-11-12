import { createHash } from "node:crypto";
import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { normalizeZaloHistoryMessage, validZaloHistoryThread, ZALO_HISTORY_BATCH_SIZE } from "@/lib/customer-memory-zalo-history";

export const runtime = "nodejs";
export const maxDuration = 30;

const BODY_LIMIT = 1500000;
const reply = (body,status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

async function readBatch(request) {
  if (request.headers.get("content-type")?.split(";",1)[0].trim() !== "application/json" ||
      Number(request.headers.get("content-length")) > BODY_LIMIT || !request.body) throw new Error("invalid_input");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8",{fatal:true});
  let length = 0, text = "";
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > BODY_LIMIT) {
        await reader.cancel();
        throw new Error("invalid_input");
      }
      text += decoder.decode(value,{stream:true});
    }
    return JSON.parse(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}

function messageForDatabase(message, id) {
  const at = new Date(message.sent_at).toISOString();
  const uniquePart = message.message_id || JSON.stringify([at,message.direction,message.sender_name,message.text]);
  const prefix = message.message_id ? "zc:" : "zch:";
  const fingerprint = createHash("sha256").update(id + "|" + uniquePart).digest("hex").slice(0,48);
  return {
    external_message_id:prefix + fingerprint,
    direction:message.direction, body:message.text, occurred_at:message.sent_at, sender_name:message.sender_name,
  };
}

export async function POST(request) {
  const staff = await authenticateManagerRequest(request).catch(() => null);
  if (!staff) return reply({error:"not_authenticated"},401);
  if (staff.role !== "admin") return reply({error:"admin_required"},403);
  let batch;
  try { batch = await readBatch(request); }
  catch { return reply({error:"invalid_input"},400); }
  if (!validZaloHistoryThread(batch?.id,batch?.name) || !Array.isArray(batch.messages) ||
      !batch.messages.length || batch.messages.length > ZALO_HISTORY_BATCH_SIZE) return reply({error:"invalid_input"},400);
  const messages = batch.messages.map(normalizeZaloHistoryMessage);
  if (messages.includes(null)) return reply({error:"invalid_input"},400);
  try {
    const {data,error} = await staff.admin.rpc("import_customer_memory_zalo_history",{
      p_external_id:batch.id, p_name:batch.name.trim(), p_messages:messages.map(message => messageForDatabase(message,batch.id)),
    });
    if (!error && data) {
      const defaultName = (batch.id.startsWith("group:") ? "Nhóm Zalo · " : "Zalo cá nhân · ") + batch.id.slice(-5);
      const name = batch.name.trim();
      if (name !== defaultName && data.inserted + data.duplicate > 0) {
        const updated = await staff.admin.from("customer_memory_threads").update({display_name:name})
          .eq("channel","zalo_personal").eq("external_id",batch.id).eq("display_name",defaultName);
        if (updated.error) return reply({error:"memory_unavailable"},503);
      }
      return reply(data);
    }
  } catch { /* Return a generic response without including conversation data. */ }
  return reply({error:"memory_unavailable"},503);
}
