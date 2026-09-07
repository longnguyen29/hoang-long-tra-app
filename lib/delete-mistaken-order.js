// Reuse the existing transactional recycle-bin RPC; never issue a bare DELETE.
export async function deleteMistakenOrder({admin, archive, id, confirmation, actor}) {
  if (confirmation !== id) return {status:400,error:'confirmation_required'};
  const {data:order,error} = await admin.from('orders').select('*').eq('id',id).maybeSingle();
  if(error)return {status:500,error:'read_failed'};
  if(!order)return {status:404,error:'not_found'};
  if(!['new_order','confirm_details'].includes(order.stage) || ['shipped','completed'].includes(order.status) || order.tracking_code)
    return {status:409,error:'order_in_progress'};
  const tables=['receivables','order_costs','order_batch_allocations','inventory_reservations'];
  const results=await Promise.all(tables.map(table=>admin.from(table).select('id').eq('order_id',id).limit(1)));
  if(results.some(result=>result.error))return {status:500,error:'read_failed'};
  if(results.some(result=>result.data?.length))return {status:409,error:'linked_records'};
  // Quotes and referral rewards use ON DELETE SET NULL. Preserve those links.
  const linked=await Promise.all([
    admin.from('trade_quotes').select('id').eq('converted_order_id',id).limit(1),
    admin.from('referral_rewards').select('id').eq('order_id',id).limit(1),
  ]);
  if(linked.some(result=>result.error))return {status:500,error:'read_failed'};
  if(linked.some(result=>result.data?.length))return {status:409,error:'linked_records'};
  const result=await archive({p_table:'orders',p_id:id,p_label:`${order.customer_name || ''} · ${id}`,p_by:actor});
  if(result.error)return {status:500,error:'archive_failed'};
  return {status:200,ok:true,archiveId:result.data};
}
