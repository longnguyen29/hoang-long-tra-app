import { procedureStaff,readProcedure,mayRead,mayWork,fail,recordEvent } from '@/lib/procedure-server';

const folders={customer_onboarding:'01 Documents',order_confirmation:'01 Documents',stock_production:'02 Product & QC',logistics:'03 Logistics',documents_checked:'01 Documents',vehicle_inspection:'04 Vehicle-Container Inspection',loading_dispatch:'05 Loading',delivery_pod:'06 Delivery-POD',closeout:'07 Issues & Resolutions'};
const safe=value=>String(value||'Unknown').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._ -]/g,'').trim().replace(/\s+/g,' ').slice(0,90)||'Unknown';
const allowed=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']);

export async function POST(request,{params}) {
  const staff=await procedureStaff(request);
  if (!staff) return fail('not_authorised',401);
  const {id}=await params;
  const data=await readProcedure(staff.admin,id);
  if (!data || !mayRead(staff,data) || data.run.status==='completed') return fail('not_found',404);
  const body=await request.json().catch(()=>null);
  const item=data.items.find(row=>row.id===body?.itemId);
  if (!item) return fail('item_not_found',404);
  const blockerId=body.blockerId||null;
  if (blockerId && !data.blockers.some(row=>row.id===blockerId && row.item_id===item.id)) return fail('invalid_blocker');
  if (!mayWork(staff,data,item) && !data.blockers.some(row=>row.id===blockerId && row.responsible_to===staff.user.id)) return fail('not_assigned',403);
  const fileName=safe(body.fileName);
  const contentType=body.contentType;
  const size=Number(body.size);
  if (typeof body.fileName!=='string' || !body.fileName.trim() || !allowed.has(contentType) || !Number.isInteger(size) || size<1 || size>10485760) return fail('invalid_file');
  const year=new Date(data.run.created_at).getFullYear();
  const archive=`B2B Operations/${safe(data.order.customer_name)}/${year}/${safe(data.order.id)}/${blockerId?'07 Issues & Resolutions':folders[item.stage_key]||'01 Documents'}`;
  const folder=`${archive}/${item.id}/${blockerId||'item'}`;
  if (body.phase==='prepare') {
    const path=`${folder}/${crypto.randomUUID()}-${fileName}`;
    const {data:evidence,error:insertError}=await staff.admin.from('procedure_evidence').insert({run_id:id,item_id:item.id,blocker_id:blockerId,storage_path:path,archive_path:archive,file_name:fileName,content_type:contentType,expected_size:size,status:'pending',uploaded_by:staff.user.id}).select('id').single();
    if (insertError) return fail('archive_prepare_failed',500);
    const {data:signed,error}=await staff.admin.storage.from('procedure-evidence').createSignedUploadUrl(path);
    if (error || !signed?.token) {
      await staff.admin.from('procedure_evidence').delete().eq('id',evidence.id);
      return fail('upload_prepare_failed',500);
    }
    return Response.json({ok:true,evidenceId:evidence.id,path,token:signed.token});
  }
  if (body.phase!=='finalize') return fail('invalid_phase');
  const path=String(body.path||'');
  if (!path.startsWith(`${folder}/`) || !/^[0-9a-f-]{36}-/.test(path.slice(folder.length+1)) || !path.endsWith(`-${fileName}`)) return fail('invalid_upload_path');
  const pending=data.evidence.find(row=>row.id===body.evidenceId&&row.storage_path===path&&row.item_id===item.id&&row.blocker_id===blockerId&&row.uploaded_by===staff.user.id&&row.expected_size===size&&row.content_type===contentType);
  if (!pending) return fail('upload_not_prepared',409);
  if (pending.status==='ready') return Response.json({ok:true,id:pending.id});
  const {data:info,error:infoError}=await staff.admin.storage.from('procedure-evidence').info(path);
  if (infoError || !info || Number(info.size)!==size || info.mimetype!==contentType) return fail('uploaded_file_mismatch',409);
  const {error}=await staff.admin.from('procedure_evidence').update({status:'ready'}).eq('id',pending.id).eq('status','pending');
  if (error) return fail('archive_failed',500);
  await recordEvent(staff.admin,id,staff.user.id,'evidence_uploaded',fileName,item.id,blockerId);
  return Response.json({ok:true,id:pending.id},{status:201});
}

export async function GET(request,{params}) {
  const staff=await procedureStaff(request);
  if (!staff) return fail('not_authorised',401);
  const {id}=await params;
  const data=await readProcedure(staff.admin,id);
  if (!data || !mayRead(staff,data)) return fail('not_found',404);
  const evidence=data.evidence.find(file=>file.id===new URL(request.url).searchParams.get('evidenceId'));
  if (!evidence || evidence.status!=='ready') return fail('evidence_not_found',404);
  const {data:url,error}=await staff.admin.storage.from('procedure-evidence').createSignedUrl(evidence.storage_path,300);
  if (error) return fail('file_unavailable',500);
  return Response.json({ok:true,url:url.signedUrl});
}
