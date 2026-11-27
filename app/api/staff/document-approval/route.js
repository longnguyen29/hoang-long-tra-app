import { createHash, randomUUID } from "node:crypto";
import { authenticateStaffRequest } from "@/lib/staff-api-auth";
import { canOpenStaffPage } from "@/lib/staff-workspace";
import { B2B_BUCKET, validRecordId, validSeller } from "@/lib/b2b-workflow-server";
import { createApprovalCopy, isPng, readApprovalPdf } from "@/lib/document-approval-pdf";

const TABLE = "document_approval_packets";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (body, status=200) => Response.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
const checked = ({data,error}) => { if(error) throw error; return data; };
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sourcePath = id => `approvals/${id}/source.pdf`;
const profileName = (profiles, user) => profiles.find(profile => profile.user_id === user)?.display_name || "Hoang Long";

const canCreate = staff => ["admin","manager"].includes(staff.role);
async function authorize(request) {
  const staff = await authenticateStaffRequest(request);
  if (!staff?.user.email_confirmed_at) return null;
  const profile=await staff.admin.from("staff_profiles").select("display_name").eq("user_id",staff.user.id).eq("active",true).maybeSingle();
  return profile.error || !profile.data ? null : { ...staff, displayName:profile.data.display_name };
}
async function people(db) {
  const [roles, profiles] = await Promise.all([
    db.from("staff_roles").select("user_id,role,workspace_modules").in("role",["admin","manager","employee"]),
    db.from("staff_profiles").select("user_id,display_name").eq("active",true),
  ]);
  const names = checked(profiles);
  return checked(roles).filter(row => names.some(profile=>profile.user_id===row.user_id) && (row.role==="employee" || canOpenStaffPage(row,"/admin/documents")))
    .map(row => ({id:row.user_id,name:profileName(names,row.user_id)}));
}
async function readPacket(staff, id) {
  if (!UUID.test(id || "")) return null;
  const row = checked(await staff.admin.from(TABLE).select("*").eq("id",id).maybeSingle());
  return row && (row.created_by === staff.user.id || row.signer_ids.includes(staff.user.id)) ? row : null;
}
const publicPacket = row => ({
  id:row.id, title:row.title, seller:row.seller_id, order:row.order_id, version:row.version, sha:row.source_sha256,
  signers:row.signer_ids, stamped:!!row.stamp_path,
  approvals:Object.fromEntries(Object.entries(row.approvals).map(([key,{name,at}])=>[key,{name,at}])),
});

async function download(bucket, path) {
  const blob = checked(await bucket.download(path));
  return Buffer.from(await blob.arrayBuffer());
}
async function optionalImage(form, field) {
  const file = form.get(field);
  if (!(file instanceof File) || !file.size) return null;
  if (file.type !== "image/png" || file.size > 350000) throw new Error("invalid_png");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!isPng(bytes) || bytes.readUInt32BE(16)>1800 || bytes.readUInt32BE(20)>1800) throw new Error("invalid_png");
  // Ensure these bytes can actually be embedded before committing any approval.
  const {PDFDocument} = await import("pdf-lib");
  try { await (await PDFDocument.create()).embedPng(bytes); } catch { throw new Error("invalid_png"); }
  return bytes;
}

export async function GET(request) {
  const staff = await authorize(request);
  if (!staff) return reply({error:"forbidden"},403);
  try {
    const db = staff.admin;
    const params = new URL(request.url).searchParams;
    if (params.has("id")) {
      const row = await readPacket(staff,params.get("id"));
      if (!row) return reply({error:"missing"},404);
      const bucket = db.storage.from(B2B_BUCKET);
      const bytes = await download(bucket,sourcePath(row.id));
      if (hash(bytes) !== row.source_sha256) return reply({error:"changed"},409);
      const approved = params.get("file") === "approved";
      if (approved && !row.signer_ids.every(id => Object.hasOwn(row.approvals,id))) return reply({error:"incomplete"},409);
      const result = approved ? await createApprovalCopy(bytes,row,path=>download(bucket,path)) : bytes;
      return new Response(new Uint8Array(result),{headers:{
        "Content-Type":"application/pdf","Content-Disposition":`attachment; filename="HL-${row.id}-${approved?"approved":"source"}.pdf"`,
        "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
      }});
    }
    const [staffList, own, assigned] = await Promise.all([
      canCreate(staff)?people(db):[],db.from(TABLE).select("*").eq("created_by",staff.user.id).order("created_at",{ascending:false}).limit(40),
      db.from(TABLE).select("*").contains("signer_ids",[staff.user.id]).order("created_at",{ascending:false}).limit(40),
    ]);
    const rows=[...checked(own),...checked(assigned)];
    return reply({viewer:staff.user.id,canStamp:staff.role==="admin",canCreate:canCreate(staff),people:staffList,
      packets:[...new Map(rows.map(row=>[row.id,row])).values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(publicPacket)});
  } catch { return reply({error:"unavailable"},500); }
}

export async function POST(request) {
  const staff = await authorize(request);
  if (!staff) return reply({error:"forbidden"},403);
  if (!request.headers.get("Content-Type")?.startsWith("multipart/form-data")
    || Number(request.headers.get("Content-Length")) > 4000000) return reply({error:"invalid_file"},400);
  const db=staff.admin, bucket=db.storage.from(B2B_BUCKET);
  const uploaded=[];
  const put=async (path,bytes,contentType)=>{
    checked(await bucket.upload(path,bytes,{contentType,upsert:false}));
    uploaded.push(path);
  };
  try {
    const form=await request.formData();
    if (form.get("action")==="create") {
      if (!canCreate(staff)) return reply({error:"forbidden"},403);
      const title=String(form.get("title")||"").trim(), seller=String(form.get("seller")||"");
      const order=String(form.get("order")||"").trim() || null;
      const file=form.get("pdf"), signerIds=[...new Set(form.getAll("signer"))];
      if (!title || title.length>160 || !validSeller(seller) || (order && !validRecordId(order))
        || signerIds.length<1 || signerIds.length>2 || signerIds.some(id=>!UUID.test(id))
        || !(file instanceof File) || file.size<10 || file.size>3000000) return reply({error:"invalid_form"},400);
      if (order) {
        const workflow=checked(await db.from("b2b_order_workflows").select("seller_id").eq("order_id",order).maybeSingle());
        if (!workflow || workflow.seller_id!==seller) return reply({error:"entity_mismatch"},409);
      }
      const list=await people(db);
      if (signerIds.some(id=>!list.some(person=>person.id===id))) return reply({error:"invalid_signer"},400);
      const hasStamp = form.get("stamp") instanceof File && form.get("stamp").size>0;
      if (hasStamp && (staff.role!=="admin" || form.get("stampConsent")!=="yes")) return reply({error:"forbidden"},403);
      const stamp=await optionalImage(form,"stamp");
      const bytes=Buffer.from(await file.arrayBuffer());
      try { await readApprovalPdf(bytes); } catch { return reply({error:"invalid_pdf"},400); }
      const id=randomUUID(), stampPath=stamp?`approvals/${id}/seal.png`:null;
      await put(sourcePath(id),bytes,"application/pdf");
      if (stampPath) await put(stampPath,stamp,"image/png");
      const result=await db.from(TABLE).insert({
        id,title,seller_id:seller,order_id:order,created_by:staff.user.id,signer_ids:signerIds,
        source_sha256:hash(bytes),stamp_path:stampPath,
      }).select("*").single();
      if (result.error) throw result.error;
      return reply({packet:publicPacket(result.data)},201);
    }
    if (form.get("action")!=="approve" || form.get("consent")!=="yes") return reply({error:"invalid_form"},400);
    const row=await readPacket(staff,form.get("id"));
    if (!row || !row.signer_ids.includes(staff.user.id)) return reply({error:"forbidden"},403);
    if (Object.hasOwn(row.approvals,staff.user.id) || row.source_sha256!==form.get("sha")
      || String(row.version)!==form.get("version")) return reply({error:"changed"},409);
    const signature=await optionalImage(form,"signature");
    const path=signature?`approvals/${row.id}/${randomUUID()}.png`:null;
    if (path) await put(path,signature,"image/png");
    const approvals={...row.approvals,[staff.user.id]:{name:staff.displayName,at:new Date().toISOString(),path}};
    const result=await db.from(TABLE).update({approvals,version:row.version+1}).eq("id",row.id)
      .eq("version",row.version).select("*").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      if (uploaded.length) await bucket.remove(uploaded);
      return reply({error:"changed"},409);
    }
    return reply({packet:publicPacket(result.data)});
  } catch (failure) {
    // Preserve upload paths if the database response was uncertain. A retry
    // can read the committed row without referencing a deleted signature.
    return reply({error:failure.message==="invalid_png"?"invalid_png":"unavailable"},failure.message==="invalid_png"?400:500);
  }
}
