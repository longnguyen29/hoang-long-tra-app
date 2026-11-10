import { authenticateManagerRequest } from "@/lib/staff-api-auth";
import { applyDraftAction, readCustomerMemory, receiveCustomerMessage } from "@/lib/customer-memory-server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

async function auth(request) {
  try { return await authenticateManagerRequest(request); } catch { return null; }
}
const fail=(error,status=400)=>Response.json({error},{status,headers:{"Cache-Control":"no-store"}});

export async function GET(request) {
  const staff=await auth(request);
  if(!staff) return fail("not_authenticated",401);
  try{
    const threadId=new URL(request.url).searchParams.get("thread") || "";
    if (threadId && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(threadId)) {
      return fail("thread_not_found",404);
    }
    const data=await readCustomerMemory(staff.admin,threadId.toLowerCase());
    return Response.json(data,{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    return e.message==="thread_not_found" ? fail("thread_not_found",404) : fail("memory_unavailable",503);
  }
}

export async function POST(request) {
  const staff=await auth(request);
  if(!staff) return fail("not_authenticated",401);
  let payload;
  try {
    if(Number(request.headers.get("content-length") || 0)>16000) return fail("invalid_input");
    payload=await request.json();
    if(JSON.stringify(payload).length>16000) return fail("invalid_input");
    if(!["manual","zalo_personal","zalo_oa","facebook"].includes(payload.channel)) return fail("invalid_input");
  } catch {return fail("invalid_input");}
  try{
    const result=await receiveCustomerMessage({
      channel:payload.channel, threadId:payload.threadId || null,
      name:payload.name, text:payload.text,
      // A manager can attach manual notes to a previously saved conversation.
      externalId:null, messageId:null,
    });
    return Response.json(result);
  }catch(e){
    return fail(["invalid_input","thread_not_found","channel_mismatch"].includes(e.message)?e.message:"memory_unavailable",
      e.message==="invalid_input"?400:503);
  }
}

export async function PATCH(request) {
  const staff=await auth(request);
  if(!staff) return fail("not_authenticated",401);
  let payload;
  try { payload=await request.json(); }catch{return fail("invalid_input");}
  if(!/^[0-9a-f-]{36}$/i.test(payload?.draftId || "")) return fail("invalid_input");
  if(!["approve","save","snooze","regenerate"].includes(payload.action)) return fail("invalid_action");
  try {
    const result=await applyDraftAction(staff.admin,payload.draftId,payload.action,payload.body);
    return Response.json(result);
  } catch(e) {
    const bad=["invalid_input","invalid_action","action_not_allowed","stale_draft"].includes(e.message);
    return fail(bad?e.message:"memory_unavailable",bad?409:503);
  }
}
