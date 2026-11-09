// Optional unofficial personal Zalo listener. READ ONLY: NO sendMessage() calls.
// This is NOT an official Zalo integration. It may result in account restrictions.
import {Zalo,ThreadType} from "zca-js";
import {createHash} from "node:crypto";

const endpoint=process.env.CUSTOMER_MEMORY_INGEST_URL?.trim();
const secret=process.env.CUSTOMER_MEMORY_BRIDGE_TOKEN?.trim();
const allowed=new Set((process.env.ALLOWED_ZALO_CHAT_IDS||"").split(",").map(x=>x.trim()).filter(Boolean));
const discovery=process.env.BRIDGE_DISCOVER_CONTACT_IDS==="1";
if(!/^https:\/\/[^\s]+\/api\/webhooks\/customer-memory\/personal-zalo$/.test(endpoint||"") ||
  !/^hlzb_[A-Za-z0-9_-]{43}$/.test(secret||"")) {
  console.error("Configure a HTTPS ingest URL and a one-time pairing token in the local .env.");
  process.exit(1);
}
if(!allowed.size && !discovery) {
  console.error("Set at least one explicitly allowed direct-contact Zalo ID, or use BRIDGE_DISCOVER_CONTACT_IDS=1 to see IDs locally without forwarding any messages.");
  process.exit(1);
}
const queue=[];
const seen=new Map();
let busy=false;
function messageFingerprint(message,threadId,text) {
 const data=message.data||{};
 const native=String(data.msgId||data.msgIdCli||data.id||"").trim();
 const input=native||[String(data.ts||message.timestamp||""),text].join("|");
 if(!input.trim()) return null;
 return "zc:"+createHash("sha256").update(threadId+"|"+input).digest("hex").slice(0,48);
}
function notice(label,extra=""){console.log(new Date().toISOString(),label,extra);}
async function send(item) {
 for(let attempt=1;attempt<=3;attempt++){
   try {
     const response=await fetch(endpoint,{method:"POST",
       headers:{"authorization":"Bearer "+secret,"content-type":"application/json"},
       body:JSON.stringify(item),signal:AbortSignal.timeout(15000)});
     if(response.ok) return true;
     if(response.status===401 || response.status===403) {
       console.error("Pairing authorization invalid or revoked. Stop and create a new bridge token.");
       process.exitCode=1;return false;
     }
   }catch{/* retry transient transport errors */}
   if(attempt<3) await new Promise(resolve=>setTimeout(resolve,1000*attempt));
 }
 return false;
}
async function flush() {
 if(busy)return;
 busy=true;
 try {
  while(queue.length){
   const item=queue[0];
   if(await send(item)) {queue.shift();notice("Saved customer message to Hoàng Long",item.externalId.slice(-4));}
   else {notice("Delivery failed; keeping pending in memory");break;}
  }
 }finally{busy=false;}
}
// Retry an in-memory queue after connection interruptions; restart loses unsent queue.
setInterval(()=>{if(queue.length)void flush();},30000).unref();
notice("Starting opt-in personal Zalo pilot. Account restrictions remain possible.");
const zalo=new Zalo();
const api=await zalo.loginQR();
notice("QR sign-in completed. Only explicitly allowed direct chats will be forwarded.");
api.listener.on("message",message=>{
  if(message?.isSelf || message?.type!==ThreadType.User ||
      typeof message?.data?.content!=="string") return;
  const id=String(message.threadId||"");
  if(discovery){notice("Direct contact ID observed locally (no message forwarded)",id);return;}
  if(!allowed.has(id))return;
  const text=message.data.content;
  if(!text.trim()||text.length>12000)return;
  const messageId=messageFingerprint(message,id,text);
  if(!messageId || seen.has(messageId))return;
  seen.set(messageId,Date.now());
  if(seen.size>500){for(const key of seen.keys()){seen.delete(key);if(seen.size<=300)break;}}
  if(queue.length>=200){notice("Queue full; stopping to avoid silent message loss");process.exit(1);}
  const timestamp=Number(message.data.ts||message.timestamp);
  const at=Number.isFinite(timestamp) && timestamp>946684800000 && timestamp<Date.now()+300000?
    new Date(timestamp).toISOString():new Date().toISOString();
  queue.push({channel:"zalo_personal",externalId:id,messageId,text,at});
  void flush();
});
api.listener.start();
notice("Listening to selected Zalo personal contacts. Do not open Zalo Web concurrently.");
