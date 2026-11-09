import {verifyZaloOaSignature,parseZaloOaIncoming} from "@/lib/customer-memory-zalo-oa";
import {receiveCustomerMessage} from "@/lib/customer-memory-server";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(request){
  const appId=process.env.ZALO_APP_ID?.trim();
  const oaId=process.env.ZALO_OA_ID?.trim();
  const secret=process.env.ZALO_OA_WEBHOOK_SECRET_KEY?.trim();
  if(!appId||!oaId||!secret) return Response.json({error:"zalo_oa_not_configured"},{status:503});
  const raw=await request.text();
  if(raw.length>100000) return new Response("Too large",{status:413});
  let event;
  try{event=JSON.parse(raw);}catch{return new Response("Invalid",{status:400});}
  if(!verifyZaloOaSignature(raw,appId,event?.timestamp,secret,request.headers.get("x-zevent-signature")))
    return new Response("Forbidden",{status:403});
  const item=parseZaloOaIncoming(event,appId,oaId);
  if(!item) return Response.json({ok:true,ignored:true});
  try{
    const result=await receiveCustomerMessage(item);
    return Response.json({ok:true,duplicate:!!result.duplicate,stored:!!result.saved});
  }catch{return new Response("Retry later",{status:503});}
}
