import {createAdminClient} from "@/lib/supabase/admin";
import {hashBridgeToken,normalizePersonalZaloMessage} from "@/lib/customer-memory-personal-bridge";
import {receiveCustomerMessage} from "@/lib/customer-memory-server";

export const runtime="nodejs";
export const maxDuration=60;

const response=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(request) {
  if(Number(request.headers.get("content-length")||0)>20000) return response({error:"invalid_input"},413);
  const authorization=request.headers.get("authorization")||"";
  const tokenHash=hashBridgeToken(authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "");
  if(!tokenHash) return response({error:"unauthorized"},401);
  const admin=createAdminClient();
  const {data:bridge,error}=await admin.from("customer_memory_bridges").select("id,active").eq("token_hash",tokenHash).eq("active",true).maybeSingle();
  if(error) return response({error:"bridge_unavailable"},503);
  if(!bridge) return response({error:"unauthorized"},401);
  let data;
  try {
    const body=await request.text();
    if(body.length>20000) return response({error:"invalid_input"},413);
    data=normalizePersonalZaloMessage(JSON.parse(body));
  }catch {return response({error:"invalid_input"},400);}
  if(!data) return response({error:"invalid_input"},400);
  try {
    const result=await receiveCustomerMessage(data);
    // Only metadata gets logged; session keys and customer content never enter runtime logs.
    await admin.from("customer_memory_bridges").update({last_used_at:new Date().toISOString()}).eq("id",bridge.id);
    return response({ok:true,duplicate:!!result.duplicate,draft_status:result.draft_status||"existing"});
  } catch {return response({error:"retry_later"},503);}
}
