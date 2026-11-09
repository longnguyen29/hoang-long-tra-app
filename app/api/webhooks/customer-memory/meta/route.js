import { metaIncoming, verifyMetaSignature } from "@/lib/customer-memory-core";
import { generateDraft, receiveCustomerMessage } from "@/lib/customer-memory-server";

export const runtime="nodejs";
export const maxDuration=60;

export async function GET(request) {
  const url=new URL(request.url);
  const expected=process.env.META_MESSENGER_VERIFY_TOKEN?.trim();
  if(expected && url.searchParams.get("hub.mode")==="subscribe"
      && url.searchParams.get("hub.verify_token")===expected) {
    return new Response(url.searchParams.get("hub.challenge") || "",{status:200});
  }
  return new Response("Forbidden",{status:403});
}

export async function POST(request) {
  const secret=process.env.META_APP_SECRET?.trim();
  const pageId=process.env.META_MESSENGER_PAGE_ID?.trim();
  if(!secret || !pageId) return new Response("Not configured",{status:503});
  const raw=await request.text();
  if(raw.length>800000) return new Response("Payload too large",{status:413});
  if(!verifyMetaSignature(raw,secret,request.headers.get("x-hub-signature-256"))) return new Response("Forbidden",{status:403});
  let payload;
  try {payload=JSON.parse(raw);}catch{return new Response("Bad payload",{status:400});}
  const events=metaIncoming(payload,pageId);
  const toGenerate=[];
  for(const item of events) {
    try {
      const outcome=await receiveCustomerMessage(item,{generate:false});
      if(outcome.draft_id) toGenerate.push(outcome.draft_id);
    } catch {
      // Acknowledge only successfully persisted batches; Meta may retry safely.
      return new Response("Temporary storage error",{status:503});
    }
  }
  // Most real-time deliveries are a single message. For bursts we persist all
  // events and generate at most three drafts within the webhook time budget.
  await Promise.allSettled(toGenerate.slice(0,3).map(id=>generateDraft(id)));
  return Response.json({ok:true,ingested:events.length,generated:Math.min(toGenerate.length,3)});
}
