import { authenticateStaffRequest } from '@/lib/staff-api-auth';

export const manager = staff => ['admin','manager'].includes(staff.role);
export const fail = (error,status=400) => Response.json({ok:false,error},{status});

export async function procedureStaff(request) {
  const staff = await authenticateStaffRequest(request);
  return staff || null;
}

export async function readProcedure(admin,id) {
  const {data:run,error} = await admin.from('procedure_runs').select('*').eq('id',id).maybeSingle();
  if (error || !run) return null;
  const [order,items,blockers,evidence,events,profiles] = await Promise.all([
    admin.from('orders').select('id,type,customer_name,contact,address,lines,total_kg,estimated_total,stage,status,partner_account_id,quote_id,delivered_at').eq('id',run.order_id).maybeSingle(),
    admin.from('procedure_items').select('*').eq('run_id',id).order('position'),
    admin.from('procedure_blockers').select('*').eq('run_id',id).order('created_at',{ascending:false}),
    admin.from('procedure_evidence').select('*').eq('run_id',id).order('created_at',{ascending:false}),
    admin.from('procedure_events').select('*').eq('run_id',id).order('created_at',{ascending:false}).limit(100),
    admin.from('staff_profiles').select('user_id,display_name,phone,active').order('display_name'),
  ]);
  if ([order,items,blockers,evidence,events,profiles].some(result=>result.error)) return null;
  return {run,order:order.data,items:items.data||[],blockers:blockers.data||[],evidence:evidence.data||[],events:events.data||[],profiles:profiles.data||[]};
}

export function mayRead(staff,data) {
  return manager(staff) || data.run.assigned_to===staff.user.id || data.items.some(item=>item.assigned_to===staff.user.id) || data.blockers.some(blocker=>blocker.responsible_to===staff.user.id);
}

export function mayWork(staff,data,item) {
  return manager(staff) || item.assigned_to===staff.user.id || (!item.assigned_to && data.run.assigned_to===staff.user.id);
}

export async function recordEvent(admin,runId,actorId,action,detail='',itemId=null,blockerId=null) {
  await admin.from('procedure_events').insert({run_id:runId,item_id:itemId,blocker_id:blockerId,actor_id:actorId,action,detail});
}

export const short = (value,max=2000) => String(value??'').trim().slice(0,max);
export const finiteBudget = value => value===null || value==='' || value===undefined ? null : Number.isFinite(Number(value)) && Number(value)>=0 ? Number(value) : NaN;
