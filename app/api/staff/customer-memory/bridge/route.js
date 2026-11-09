import {randomBytes,createHash} from "node:crypto";
import {authenticateManagerRequest} from "@/lib/staff-api-auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(body,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

async function owner(request) {
  let auth;
  try {auth=await authenticateManagerRequest(request);}catch{return null;}
  return auth?.role==="admin"?auth:null;
}

export async function GET(request) {
  const auth=await owner(request);
  if(!auth) return reply({error:"admin_required"},403);
  const {data,error}=await auth.admin.from("customer_memory_bridges")
    .select("id,label,channel,active,created_at,last_used_at")
    .order("created_at",{ascending:false}).limit(20);
  if(error) return reply({error:"bridge_unavailable"},503);
  return reply({bridges:data||[]});
}
export async function POST(request) {
  const auth=await owner(request);
  if(!auth) return reply({error:"admin_required"},403);
  let body;
  try {body=await request.json();}catch{return reply({error:"invalid_input"},400);}
  const label=typeof body?.label==="string"?body.label.trim():"";
  if(label.length<1||label.length>100) return reply({error:"invalid_input"},400);
  const token="hlzb_"+randomBytes(32).toString("base64url");
  const tokenHash=createHash("sha256").update(token).digest("hex");
  const {data,error}=await auth.admin.from("customer_memory_bridges")
    .insert({label,token_hash:tokenHash,created_by:auth.user.id}).select("id,label,created_at").single();
  if(error) return reply({error:"bridge_unavailable"},503);
  return reply({bridge:data,token,once:true},201);
}
export async function DELETE(request) {
  const auth=await owner(request);
  if(!auth) return reply({error:"admin_required"},403);
  let body;
  try{body=await request.json();}catch{return reply({error:"invalid_input"},400);}
  if(!/^[a-f0-9-]{36}$/i.test(body?.id||"")) return reply({error:"invalid_input"},400);
  const {data,error}=await auth.admin.from("customer_memory_bridges")
    .update({active:false}).eq("id",body.id).eq("active",true).select("id").maybeSingle();
  if(error) return reply({error:"bridge_unavailable"},503);
  return reply({revoked:!!data});
}
