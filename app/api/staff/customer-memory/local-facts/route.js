import { authenticateManagerRequest } from "@/lib/staff-api-auth";

export const runtime="nodejs";
export const maxDuration=60;
const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const categories=new Set(["preference","quoted_price","feedback","quantity","promise","relationship"]);

export async function POST(request) {
  const staff=await authenticateManagerRequest(request).catch(()=>null);
  if(!staff) return reply({error:"not_authenticated"},401);
  if(staff.role!=="admin") return reply({error:"admin_required"},403);
  let payload;
  try {
    const raw=await request.text();
    if(raw.length>30000) return reply({error:"invalid_input"},400);
    payload=JSON.parse(raw);
  } catch {return reply({error:"invalid_input"},400);}
  if(typeof payload?.externalId!=="string" || !/^[0-9A-Za-z_.:-]{4,120}$/.test(payload.externalId) ||
     !Array.isArray(payload.facts) || !payload.facts.length || payload.facts.length>20) return reply({error:"invalid_input"},400);
  for(const fact of payload.facts) {
    if(!categories.has(fact?.category) || typeof fact.quote!=="string" || fact.quote.length<6 || fact.quote.length>280 ||
       typeof fact.at!=="string" || !Number.isFinite(Date.parse(fact.at))) return reply({error:"invalid_input"},400);
  }
  try {
    const db=staff.admin;
    const threadResult=await db.from("customer_memory_threads").select("id,facts")
      .eq("channel","zalo_personal").eq("external_id",payload.externalId).maybeSingle();
    if(threadResult.error) throw new Error();
    if(!threadResult.data) return reply({saved:0,duplicate:0,unmatched:payload.facts.length,missing:true});
    const thread=threadResult.data;
    const times=[...new Set(payload.facts.map(f=>new Date(f.at).toISOString()))];
    const sourceResult=await db.from("customer_memory_messages").select("id,body,direction,occurred_at")
      .eq("thread_id",thread.id).in("occurred_at",times).limit(100);
    if(sourceResult.error) throw new Error();
    const candidates=[];
    let unmatched=0;
    for(const fact of payload.facts){
      const source=(sourceResult.data||[]).find(m=>Date.parse(m.occurred_at)===Date.parse(fact.at) &&
        typeof m.body==="string" && m.body.includes(fact.quote));
      if(!source){unmatched++;continue;}
      const who=source.direction==="outbound"?"Mình: ":"Khách: ";
      candidates.push({category:fact.category,detail:(who+fact.quote).slice(0,220),
        quote:fact.quote,message_id:source.id,at:source.occurred_at});
    }
    for(let attempt=0;attempt<3;attempt++){
      const oldFacts=Array.isArray(thread.facts)?thread.facts:[];
      const next=[...oldFacts];
      let saved=0,duplicate=0,skipped=unmatched;
      for(const fact of candidates){
        if(next.some(existing=>existing.message_id===fact.message_id && existing.quote===fact.quote && existing.category===fact.category)){
          duplicate++;continue;
        }
        if(next.length>=50){skipped++;continue;}
        next.push(fact);saved++;
      }
      if(!saved) return reply({saved,duplicate,unmatched:skipped});
      const updated=await db.from("customer_memory_threads").update({facts:next,updated_at:new Date().toISOString()})
        .eq("id",thread.id).eq("facts",JSON.stringify(oldFacts)).select("id").maybeSingle();
      if(updated.error) throw new Error();
      if(updated.data) return reply({saved,duplicate,unmatched:skipped});
      const current=await db.from("customer_memory_threads").select("facts").eq("id",thread.id).maybeSingle();
      if(current.error) throw new Error();
      if(!current.data) return reply({saved:0,duplicate:0,unmatched:payload.facts.length,missing:true});
      thread.facts=current.data.facts;
    }
    return reply({error:"retry_later"},503);
  }catch{return reply({error:"memory_unavailable"},503);}
}
