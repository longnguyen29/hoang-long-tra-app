import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { buildMemoryPrompt, parseAiJson } from "@/lib/customer-memory-core";

export const runtime="nodejs";
export const maxDuration=60;
const reply=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});

export async function POST(request) {
  const staff=await authenticateManagerRequest(request).catch(()=>null);
  if(!staff) return reply({error:"not_authenticated"},401);
  if(staff.role!=="admin") return reply({error:"admin_required"},403);
  const key=process.env.OPENAI_API_KEY?.trim();
  if(!key) return reply({status:"not_configured"});
  try {
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      body:JSON.stringify(buildMemoryPrompt({
        name:"Khách thử nghiệm",model:process.env.CUSTOMER_MEMORY_MODEL?.trim()||"gpt-5-mini",
        facts:[],summary:"",messages:[{direction:"inbound",body:"Xin chào, tôi muốn hỏi về trà.",occurred_at:"2026-01-01T00:00:00Z"}]
      })),signal:AbortSignal.timeout(45000)
    });
    if(!response.ok) {
      const failure=await response.json().catch(()=>({}));
      const code=["insufficient_quota","rate_limit_exceeded"].includes(failure?.error?.code) ? failure.error.code : "other";
      return reply({status:"provider_error",http_status:response.status,code});
    }
    const data=await response.json();
    try {
      const result=parseAiJson(data);
      return reply({status:result.reply?"ok":"empty_reply",response_status:data.status||"unknown",
        incomplete_reason:data.incomplete_details?.reason||null});
    }catch {
      return reply({status:"invalid_response",response_status:data.status||"unknown",
        incomplete_reason:data.incomplete_details?.reason||null});
    }
  }catch{return reply({status:"unreachable"});}
}
