import { isFinished,preDispatchProblems } from '@/lib/procedure-templates';
import { procedureStaff,readProcedure,mayRead,mayWork,manager,fail,recordEvent,short,finiteBudget } from '@/lib/procedure-server';

const dateOrNull=value=>value?Number.isNaN(Date.parse(value))?undefined:new Date(value).toISOString():null;
const staffId=(data,value)=>value===null?null:data.profiles.some(profile=>profile.user_id===value&&profile.active)?value:undefined;

async function nextAction(admin,runId) {
  const [items,blockers]=await Promise.all([
    admin.from('procedure_items').select('title,status,verification_required,required').eq('run_id',runId).order('position'),
    admin.from('procedure_blockers').select('problem,status').eq('run_id',runId).in('status',['open','resolved']).order('created_at'),
  ]);
  if (items.error || blockers.error) return;
  const action=blockers.data?.[0]?`Gỡ vướng: ${blockers.data[0].problem}`:items.data?.find(item=>item.required&&!isFinished(item))?.title||'Kiểm tra và khép đơn';
  await admin.from('procedure_runs').update({next_action:action,updated_at:new Date().toISOString()}).eq('id',runId);
}

export async function GET(request,{params}) {
  const staff=await procedureStaff(request);
  if (!staff) return fail('not_authorised',401);
  const {id}=await params;
  const data=await readProcedure(staff.admin,id);
  if (!data || !mayRead(staff,data)) return fail('not_found',404);
  return Response.json({ok:true,...data});
}

export async function PATCH(request,{params}) {
  const staff=await procedureStaff(request);
  if (!staff) return fail('not_authorised',401);
  const {id}=await params;
  const data=await readProcedure(staff.admin,id);
  if (!data || !mayRead(staff,data)) return fail('not_found',404);
  const body=await request.json().catch(()=>null);
  if (!body || typeof body!=='object') return fail('invalid_body');
  const {admin,user}=staff;
  const now=new Date().toISOString();
  if (data.run.status==='completed' && !(body.action==='blocker' && body.operation==='spend' && manager(staff))) return fail('run_closed',409);

  if (body.action==='run') {
    if (!manager(staff)) return fail('manager_required',403);
    const update={updated_at:now};
    if ('assignedTo' in body) update.assigned_to=staffId(data,body.assignedTo);
    for (const [input,column] of [['dueAt','due_at'],['loadingAt','loading_at'],['deliveryDueAt','delivery_due_at'],['nextContactAt','next_contact_at']]) {
      if (input in body) update[column]=dateOrNull(body[input]);
    }
    if ('nextAction' in body) update.next_action=short(body.nextAction,500);
    if ('reorderAction' in body) update.reorder_action=short(body.reorderAction,500);
    if (Object.values(update).some(value=>value===undefined)) return fail('invalid_assignment_or_date');
    const {error}=await admin.from('procedure_runs').update(update).eq('id',id);
    if (error) return fail('update_failed',500);
    await recordEvent(admin,id,user.id,'run_updated','Cập nhật người phụ trách, lịch hoặc việc kế tiếp.');
  } else if (body.action==='close') {
    if (!manager(staff)) return fail('manager_required',403);
    if (data.order?.stage!=='completed' && data.order?.status!=='completed') return fail('order_not_completed',409);
    if (data.blockers.some(blocker=>['open','resolved'].includes(blocker.status)) || data.items.some(item=>item.required&&!isFinished(item))) return fail('checklist_incomplete',409);
    const {error}=await admin.from('procedure_runs').update({status:'completed',completed_at:now,updated_at:now,next_action:data.run.reorder_action||'Liên hệ đặt lại theo lịch khách'}).eq('id',id);
    if (error) return fail('update_failed',500);
    await recordEvent(admin,id,user.id,'closed','Khép hồ sơ vận hành; giữ toàn bộ bằng chứng và lịch sử.');
  } else if (body.action==='assign_item') {
    if (!manager(staff)) return fail('manager_required',403);
    const item=data.items.find(item=>item.id===body.itemId);
    if (!item) return fail('item_not_found',404);
    const assigned=staffId(data,body.assignedTo);
    if (assigned===undefined) return fail('invalid_assignment');
    const {error}=await admin.from('procedure_items').update({assigned_to:assigned,escalation_contact:short(body.escalationContact??item.escalation_contact,200),secondary_contact:short(body.secondaryContact??item.secondary_contact,200),updated_at:now}).eq('id',item.id);
    if (error) return fail('update_failed',500);
    await recordEvent(admin,id,user.id,'assigned',item.title,item.id);
  } else if (body.action==='item') {
    const item=data.items.find(item=>item.id===body.itemId);
    if (!item) return fail('item_not_found',404);
    if (!mayWork(staff,data,item)) return fail('not_assigned',403);
    const status=body.status??item.status;
    if (!['not_started','in_progress','done','verified','not_required'].includes(status)) return fail('invalid_status');
    if (status==='not_required' && (!manager(staff) || !short(body.notes))) return fail('manager_reason_required',403);
    if (status==='verified') {
      if (!manager(staff) || item.status!=='done' || !item.completed_by || item.completed_by===user.id) return fail('second_person_required',409);
      if (item.evidence_required && !data.evidence.some(file=>file.item_id===item.id&&file.status==='ready')) return fail('evidence_required',409);
      if (data.blockers.some(blocker=>blocker.item_id===item.id && ['open','resolved'].includes(blocker.status))) return fail('blocker_open',409);
      if (item.item_key==='dispatch_time') {
        const problems=preDispatchProblems(data.items.filter(row=>row.id!==item.id),data.blockers);
        if (problems.stop.length || problems.critical.length) return fail('pre_dispatch_incomplete',409);
      }
    }
    if (status==='done' && item.document_state && !data.evidence.some(file=>file.item_id===item.id&&file.status==='ready')) return fail('document_file_required',409);
    if (status==='done' && data.blockers.some(blocker=>blocker.item_id===item.id && ['open','resolved'].includes(blocker.status))) return fail('blocker_open',409);
    const update={status,worker_notes:short(body.notes??item.worker_notes,3000),updated_at:now};
    if (status==='done' && item.status!=='done') {update.completed_by=user.id;update.completed_at=now;update.verified_by=null;update.verified_at=null;}
    if (status==='verified') {update.verified_by=user.id;update.verified_at=now;}
    if (status==='not_started' || status==='in_progress') {update.completed_by=null;update.completed_at=null;update.verified_by=null;update.verified_at=null;}
    if (item.document_state) {
      if (body.documentState && !['missing','draft','ready'].includes(body.documentState)) return fail('invalid_document_state');
      update.document_state=status==='verified'?'verified':status==='done'?'checked':status==='not_required'?'not_required':body.documentState|| (status==='in_progress'?'ready':'missing');
    }
    const {error}=await admin.from('procedure_items').update(update).eq('id',item.id);
    if (error) return fail('update_failed',500);
    await recordEvent(admin,id,user.id,`item_${status}`,`${item.title}${update.worker_notes?`: ${update.worker_notes}`:''}`,item.id);
    await nextAction(admin,id);
  } else if (body.action==='block') {
    const item=data.items.find(item=>item.id===body.itemId);
    if (!item || !mayWork(staff,data,item)) return fail('not_assigned',403);
    const problem=short(body.problem,2000);
    if (!problem) return fail('problem_required');
    const budget=finiteBudget(body.estimatedBudget),responsible=body.responsibleTo?staffId(data,body.responsibleTo):item.assigned_to||data.run.assigned_to;
    if (Number.isNaN(budget) || responsible===undefined) return fail('invalid_budget_or_person');
    const {data:blocker,error}=await admin.from('procedure_blockers').insert({run_id:id,item_id:item.id,stop_work:!!body.stopWork||item.critical,problem,corrective_action:short(body.correctiveAction,2000),responsible_to:responsible,escalation_contact:short(body.escalationContact||item.escalation_contact,200),secondary_contact:short(body.secondaryContact||item.secondary_contact,200),due_at:dateOrNull(body.dueAt),estimated_budget:budget,created_by:user.id}).select('id').single();
    if (error) return fail('blocker_create_failed',500);
    await admin.from('procedure_items').update({status:'blocked',document_state:item.document_state?'issue_found':null,updated_at:now}).eq('id',item.id);
    await recordEvent(admin,id,user.id,'blocked',problem,item.id,blocker.id);
    await nextAction(admin,id);
  } else if (body.action==='blocker') {
    const blocker=data.blockers.find(row=>row.id===body.blockerId);
    const item=blocker&&data.items.find(row=>row.id===blocker.item_id);
    if (!blocker || !item) return fail('blocker_not_found',404);
    if (!mayWork(staff,data,item) && blocker.responsible_to!==user.id) return fail('not_assigned',403);
    const update={updated_at:now};
    if (body.operation==='resolve') {
      if (blocker.status!=='open' || !short(body.resolutionNotes)) return fail('resolution_required',409);
      const spend=finiteBudget(body.actualSpend);
      if (Number.isNaN(spend)) return fail('invalid_budget');
      if (!manager(staff) && spend>0 && (blocker.approved_budget===null || spend>Number(blocker.approved_budget))) return fail('budget_approval_required',409);
      Object.assign(update,{status:'resolved',resolution_notes:short(body.resolutionNotes,3000),actual_spend:spend,resolved_by:user.id,resolved_at:now});
    } else if (body.operation==='verify') {
      if (!manager(staff) || blocker.status!=='resolved' || blocker.resolved_by===user.id) return fail('second_person_required',409);
      if (blocker.stop_work && !data.evidence.some(file=>file.blocker_id===blocker.id&&file.status==='ready')) return fail('resolution_evidence_required',409);
      Object.assign(update,{status:'verified',verified_by:user.id,verified_at:now});
    } else if (body.operation==='override') {
      if (!manager(staff) || !short(body.reason)) return fail('manager_reason_required',403);
      Object.assign(update,{status:'overridden',override_reason:short(body.reason,2000),verified_by:user.id,verified_at:now});
    } else if (body.operation==='budget') {
      if (!manager(staff)) return fail('manager_required',403);
      const amount=finiteBudget(body.approvedBudget);
      if (amount===null || Number.isNaN(amount)) return fail('invalid_budget');
      Object.assign(update,{approved_budget:amount,approved_by:user.id});
    } else if (body.operation==='spend') {
      if (!manager(staff)) return fail('manager_required',403);
      const amount=finiteBudget(body.actualSpend);
      if (amount===null || Number.isNaN(amount)) return fail('invalid_budget');
      update.actual_spend=amount;
    } else return fail('invalid_operation');
    const {error}=await admin.from('procedure_blockers').update(update).eq('id',blocker.id);
    if (error) return fail('update_failed',500);
    if (['verified','overridden'].includes(update.status) && !data.blockers.some(row=>row.id!==blocker.id && row.item_id===item.id && ['open','resolved'].includes(row.status))) {
      await admin.from('procedure_items').update({status:'in_progress',document_state:item.document_state?'ready':null,updated_at:now}).eq('id',item.id);
    }
    await recordEvent(admin,id,user.id,`blocker_${body.operation}`,short(body.resolutionNotes||body.reason||String(update.approved_budget??'')),item.id,blocker.id);
    await nextAction(admin,id);
  } else return fail('invalid_action');

  return Response.json({ok:true});
}
