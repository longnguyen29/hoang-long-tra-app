import { procedureTemplate,procedureProgress,PROCEDURE_STAGES } from '@/lib/procedure-templates';
import { procedureStaff,manager,fail,recordEvent,short } from '@/lib/procedure-server';

export async function GET(request) {
  const staff=await procedureStaff(request);
  if (!staff) return fail('not_authorised',401);
  const search=new URL(request.url).searchParams;
  const orderId=search.get('orderId');
  const q=short(search.get('q'),100).replace(/[^\p{L}\p{N} ._-]/gu,'').trim();
  const year=search.get('year')||(/^20\d{2}$/.test(q)?q:null);
  let query=staff.admin.from('procedure_runs').select('*').order('created_at',{ascending:false}).limit(500);
  if (orderId) query=query.eq('order_id',orderId);
  if (year && /^20\d{2}$/.test(year)) query=query.gte('created_at',`${year}-01-01`).lt('created_at',`${Number(year)+1}-01-01`);
  if (q && q!==year) {
    const {data:matches,error:searchError}=await staff.admin.from('orders').select('id').or(`id.ilike.%${q}%,customer_name.ilike.%${q}%,tracking_code.ilike.%${q}%`).limit(500);
    if (searchError) return fail('search_failed',500);
    const matchedIds=(matches||[]).map(row=>row.id);
    if (matchedIds.length===0 && !/^[0-9a-f-]{36}$/i.test(q)) return Response.json({ok:true,runs:[]});
    if (matchedIds.length) query=query.in('order_id',matchedIds);
    else query=query.eq('id',q);
  }
  const {data:runs,error}=await query;
  if (error) return fail('read_failed',500);
  const collected=[...(runs||[])];
  if (/^[0-9a-f-]{36}$/i.test(q) && q!==year && !collected.some(run=>run.id===q)) {
    const {data:exact}=await staff.admin.from('procedure_runs').select('*').eq('id',q).maybeSingle();
    if (exact && (!year || new Date(exact.created_at).getFullYear()===Number(year))) collected.push(exact);
  }
  const ids=collected.map(run=>run.id);
  const [assignmentResult,responsibilityResult]=await Promise.all([
    ids.length?staff.admin.from('procedure_items').select('run_id').in('run_id',ids).eq('assigned_to',staff.user.id):{data:[],error:null},
    ids.length?staff.admin.from('procedure_blockers').select('run_id').in('run_id',ids).eq('responsible_to',staff.user.id).in('status',['open','resolved']):{data:[],error:null},
  ]);
  if (assignmentResult.error || responsibilityResult.error) return fail('read_failed',500);
  const visible=manager(staff)?collected:collected.filter(run=>run.assigned_to===staff.user.id || assignmentResult.data.some(item=>item.run_id===run.id) || responsibilityResult.data.some(item=>item.run_id===run.id));
  const orderIds=visible.map(run=>run.order_id);
  const [orderResult,itemResult,blockerResult]=await Promise.all([
    orderIds.length?staff.admin.from('orders').select('id,customer_name,stage,type').in('id',orderIds):{data:[],error:null},
    visible.length?staff.admin.from('procedure_items').select('run_id,stage_key,status,required,verification_required').in('run_id',visible.map(run=>run.id)):{data:[],error:null},
    visible.length?staff.admin.from('procedure_blockers').select('run_id,status,stop_work').in('run_id',visible.map(run=>run.id)).in('status',['open','resolved']):{data:[],error:null},
  ]);
  if ([orderResult,itemResult,blockerResult].some(result=>result.error)) return fail('read_failed',500);
  return Response.json({ok:true,runs:visible.map(run=>{
    const related=(itemResult.data||[]).filter(item=>item.run_id===run.id);
    return {...run,order:(orderResult.data||[]).find(order=>order.id===run.order_id)||null,
      progress:procedureProgress(related),blockers:(blockerResult.data||[]).filter(row=>row.run_id===run.id).length,
      stop:(blockerResult.data||[]).some(row=>row.run_id===run.id&&row.stop_work),
      stages:PROCEDURE_STAGES.map(([key,label])=>({key,label,...procedureProgress(related.filter(item=>item.stage_key===key))}))};
  })});
}

export async function POST(request) {
  const staff=await procedureStaff(request);
  if (!staff || !manager(staff)) return fail('not_authorised',403);
  const body=await request.json().catch(()=>null);
  const orderId=short(body?.orderId,150);
  const templateKey=body?.templateKey;
  if (!orderId || !['domestic_b2b','export_b2b'].includes(templateKey)) return fail('invalid_request');
  const {data:order,error:orderError}=await staff.admin.from('orders').select('id,type,stage').eq('id',orderId).maybeSingle();
  if (orderError || !order) return fail('order_not_found',404);
  if (order.type!=='wholesale' || order.stage==='new_order') return fail('confirm_wholesale_order_first',409);
  const {data:existing}=await staff.admin.from('procedure_runs').select('id').eq('order_id',orderId).maybeSingle();
  if (existing) return Response.json({ok:true,id:existing.id,existing:true});
  const {data:run,error}=await staff.admin.from('procedure_runs').insert({order_id:orderId,template_key:templateKey,assigned_to:staff.user.id,created_by:staff.user.id,next_action:'Xác nhận hồ sơ khách và đơn hàng'}).select('id').single();
  if (error) return fail(error.code==='23505'?'already_created':'create_failed',error.code==='23505'?409:500);
  const {error:itemError}=await staff.admin.from('procedure_items').insert(procedureTemplate(templateKey).map(item=>({...item,run_id:run.id})));
  if (itemError) {
    // A failed snapshot must not leave a seemingly usable empty run.
    await staff.admin.from('procedure_runs').delete().eq('id',run.id);
    return fail('template_create_failed',500);
  }
  await recordEvent(staff.admin,run.id,staff.user.id,'created',`Tạo quy trình ${templateKey} cho đơn ${orderId}`);
  return Response.json({ok:true,id:run.id},{status:201});
}
