import { POST as submitContactEnquiry } from "../event-enquiries/route.js";
import { allowedEventEnquiryOrigin, readEventEnquiryBody } from "@/lib/event-enquiry";
import { domesticEnquiryInput } from "@/lib/domestic-wholesale";
export const runtime = "nodejs";
export async function POST(request) {
  const fail=(error,status=400)=>Response.json({ok:false,error},{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  if(!allowedEventEnquiryOrigin(request)) return fail("invalid_request",403);
  let input;
  try { input=domesticEnquiryInput(await readEventEnquiryBody(request)); }
  catch(error) { return fail(["consent_required","tea_required","invalid_contact","invalid_quantity","note_too_long"].includes(error.message)?error.message:"invalid_request"); }
  const headers=new Headers(request.headers);headers.delete("content-length");
  // Reuse the existing CRM transaction, service-only credentials, throttling,
  // duplicate-contact handling and idempotent receipt. No partner assignment.
  return submitContactEnquiry(new Request(request.url,{method:"POST",headers,body:JSON.stringify(input)}));
}
