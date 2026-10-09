-- Run after migration 0078 in an isolated test database as the database owner.
-- Synthetic fixtures only. The final ROLLBACK preserves all existing data;
-- no gateway, scheduler or messaging function is invoked.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);
do $$
declare
  suffix text:=gen_random_uuid()::text;
  manager_id uuid:=gen_random_uuid();
  sample_product text:='test-followup-sample-'||suffix;
  commercial_product text:='test-followup-tea-'||suffix;
  sample_lines jsonb;
  mixed_lines jsonb;
  request_id text:='test-followup-request-'||suffix;
  order_id text:='test-followup-order-'||suffix;
  linked_request text:='test-followup-linked-request-'||suffix;
  linked_order text:='test-followup-linked-order-'||suffix;
  opportunity_id text:='test-followup-opp-'||suffix;
  prospect_id uuid:=gen_random_uuid();
  followup_id uuid;
  linked_followup_id uuid;
  saved public.sample_followups;
  claim public.sample_followups;
  original_sent_at timestamptz;
  count_value integer;
begin
  if to_regclass('public.sample_followups') is null then raise exception 'Migration 0078 required'; end if;
  if has_table_privilege('anon','public.sample_followups','SELECT')
    or has_table_privilege('authenticated','public.sample_followups','INSERT')
    or has_table_privilege('authenticated','public.sample_followups','UPDATE')
    or has_table_privilege('authenticated','public.sample_followup_settings','UPDATE')
    or has_function_privilege('authenticated','public.claim_sample_followup(uuid,timestamptz)','EXECUTE')
    or has_function_privilege('anon','public.validate_sample_followup(uuid,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.claim_sample_followup_telegram(uuid,timestamptz)','EXECUTE')
  then raise exception 'Private queue privileges are too broad'; end if;
  if public.sample_followup_phone_key('090 000 1001') is distinct from '0900001001'
    or public.sample_followup_phone_key('+84 90 000 1001') is distinct from '0900001001'
    or public.sample_followup_phone_key('0084 90 000 1001') is distinct from '0900001001'
    or public.sample_followup_phone_key('Call 0900001001 tomorrow') is not null
    or public.sample_followup_phone_key('0900001001 123') is not null
  then raise exception 'Full-number normalization failed'; end if;

  insert into auth.users(id,email) values(manager_id,'test-followup-'||suffix||'@fixture.invalid');
  insert into public.staff_roles(user_id,role) values(manager_id,'manager');
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('role','service_role','sub',manager_id)::text,true);
  -- Move only the fixture cutoff, in this rollback transaction.
  update public.sample_followup_settings set enabled=true,starts_at=now()-interval '1 hour',default_channel='sms' where id=1;
  insert into public.catalog_products(id,line,name) values
    (sample_product,'sample','{"vi":"TEST SAMPLE"}'),(commercial_product,'everyday','{"vi":"TEST TEA"}');
  sample_lines:=jsonb_build_array(jsonb_build_object('productId',sample_product,'qty',1,'unit','pcs'));
  mixed_lines:=sample_lines||jsonb_build_array(jsonb_build_object('productId',commercial_product,'qty',1,'unit','kg'));
  if not public.sample_followup_pure_sample(sample_lines)
    or not public.sample_followup_pure_sample(jsonb_build_array(jsonb_build_object('product_id',sample_product)))
    or public.sample_followup_pure_sample(mixed_lines)
    or public.sample_followup_pure_sample('[{"name":"sample","qty":1}]')
    or public.sample_followup_pure_sample('[]') then raise exception 'Exact sample classification failed'; end if;

  -- Old requests and orders never enter the queue, even when sent after rollout.
  insert into public.sample_requests(id,ts,store_name,phone,address,status)
    values('test-followup-old-'||suffix,now()-interval '1 day','TEST OLD','0900001000','TEST ADDRESS','new');
  update public.sample_requests set status='sent' where id='test-followup-old-'||suffix;
  insert into public.sample_requests(id,ts,store_name,phone,address,status)
    values('test-followup-old-sent-'||suffix,now()-interval '1 day','TEST OLD SENT','0900001000','TEST ADDRESS','sent');
  insert into public.orders(id,ts,type,customer_name,contact,lines,stage,status)
    values('test-followup-old-order-'||suffix,now()-interval '1 day','retail','TEST OLD ORDER','0900001000',sample_lines,'new_order','pending');
  update public.orders set stage='shipping',status='shipped' where id='test-followup-old-order-'||suffix;
  if exists(select 1 from public.sample_followups where source_id in ('test-followup-old-'||suffix,'test-followup-old-sent-'||suffix,'test-followup-old-order-'||suffix))
    then raise exception 'An old source was backfilled'; end if;

  -- Timestamp comes from the first server-observed send, never client input.
  insert into public.sample_requests(id,store_name,contact_name,phone,address,sent_at)
    values(request_id,'TEST SHOP','TEST PERSON','0900001001','TEST ADDRESS',now()-interval '30 days');
  if (select sent_at from public.sample_requests where id=request_id) is not null then raise exception 'Prepared sample accepted a client timestamp'; end if;
  update public.sample_requests set status='sent',sent_at=now()-interval '30 days' where id=request_id;
  select sent_at into original_sent_at from public.sample_requests where id=request_id;
  select * into saved from public.sample_followups where source_kind='sample_request' and source_id=request_id;
  followup_id:=saved.id;
  if followup_id is null or saved.status<>'pending' or original_sent_at is distinct from now()
    or saved.sent_at is distinct from original_sent_at or saved.due_at is distinct from original_sent_at+interval '7 days'
    then raise exception 'First send did not schedule exactly seven days later'; end if;
  update public.sample_requests set status='sent',sent_at=now()+interval '30 days' where id=request_id;
  if original_sent_at is distinct from (select sent_at from public.sample_requests where id=request_id)
    or (select count(*) from public.sample_followups where source_kind='sample_request' and source_id=request_id)<>1
    then raise exception 'Repeated send changed the first-send clock or duplicated a job'; end if;
  select count(*) into count_value from public.claim_sample_followup(followup_id,now()+interval '6 days');
  if count_value<>0 then raise exception 'Follow-up claimed before day seven'; end if;

  -- Same mobile in +84 notation cannot create another active SMS in the same window.
  insert into public.sample_requests(id,store_name,phone,address,status)
    values('test-followup-duplicate-'||suffix,'TEST DUPLICATE','+84 90 000 1001','TEST ADDRESS','sent');
  if not exists(select 1 from public.sample_followups where source_id='test-followup-duplicate-'||suffix and status='cancelled' and last_error='duplicate_active_contact')
    then raise exception 'Repeated contact was not deduplicated'; end if;

  -- A linked pure sample order belongs to the request and retains a single clock.
  insert into public.sample_requests(id,store_name,phone,address) values(linked_request,'TEST LINKED','0900001002','TEST ADDRESS');
  insert into public.orders(id,type,customer_name,contact,lines,sample_request_id,stage,status)
    values(linked_order,'retail','TEST LINKED','+84 90 000 1002',sample_lines,linked_request,'packing','confirmed');
  update public.orders set stage='shipping',status='shipped' where id=linked_order;
  select id into linked_followup_id from public.sample_followups where source_kind='sample_request' and source_id=linked_request and order_id=linked_order;
  if linked_followup_id is null or (select status from public.sample_requests where id=linked_request)<>'sent'
    or exists(select 1 from public.sample_followups where source_kind='order' and source_id=linked_order)
    then raise exception 'Linked shipment has duplicate ownership or did not mark the request sent'; end if;
  update public.sample_requests set status='sent' where id=linked_request;
  if (select count(*) from public.sample_followups where sample_request_id=linked_request)<>1 then raise exception 'Linked sample was enrolled twice'; end if;
  begin
    insert into public.orders(id,type,customer_name,contact,lines,sample_request_id)
      values('test-followup-wrong-link-'||suffix,'retail','TEST WRONG LINK','0900001003',sample_lines,linked_request);
    raise exception 'Cross-customer sample link accepted';
  exception when others then if sqlerrm<>'sample_order_contact_mismatch' then raise; end if; end;
  begin
    update public.orders set sample_request_id=request_id where id=linked_order;
    raise exception 'Shipped sample ownership changed';
  exception when others then if sqlerrm<>'sample_link_immutable_after_shipping' then raise; end if; end;

  -- New unlinked pure samples enroll; mixed commercial/sample orders do not.
  insert into public.orders(id,type,customer_name,contact,lines,stage,status)
    values(order_id,'retail','TEST SAMPLE ORDER','0900001004',sample_lines,'packing','confirmed');
  update public.orders set stage='shipping',status='shipped' where id=order_id;
  if not exists(select 1 from public.sample_followups where source_kind='order' and source_id=order_id and status='pending') then raise exception 'Sample order was not enrolled'; end if;
  insert into public.orders(id,type,customer_name,contact,lines,stage,status)
    values('test-followup-mixed-'||suffix,'retail','TEST MIXED','0900001005',mixed_lines,'packing','confirmed');
  update public.orders set stage='shipping',status='shipped' where id='test-followup-mixed-'||suffix;
  if exists(select 1 from public.sample_followups where source_id='test-followup-mixed-'||suffix) then raise exception 'Mixed order was enrolled'; end if;

  -- Simulation changes only queue clocks; source shipping timestamps remain immutable.
  update public.sample_followups set sent_at=now()-interval '8 days',due_at=now()-interval '1 day' where id=followup_id;
  update public.sample_requests set contact_name='FRESH NAME',phone='0900001011' where id=request_id;
  select * into claim from public.claim_sample_followup(followup_id,now());
  if claim.id is null or claim.status<>'sending' or claim.attempts<>1 or claim.claim_token is null
    or claim.customer_name<>'FRESH NAME' or claim.phone<>'0900001011'
    then raise exception 'SMS claim failed to refresh source data'; end if;
  select count(*) into count_value from public.validate_sample_followup(followup_id,claim.claim_token);
  if count_value<>1 then raise exception 'Valid claimed SMS was rejected'; end if;
  select count(*) into count_value from public.claim_sample_followup(followup_id,now()+interval '30 minutes');
  if count_value<>0 then raise exception 'Three-hour retry interval was bypassed'; end if;
  begin
    perform public.update_sample_followup(followup_id,'contacted');
    raise exception 'An in-flight SMS was manually overwritten';
  exception when others then if sqlerrm<>'followup_sending_locked' then raise; end if; end;
  update public.sample_followups set last_error='submission_uncertain' where id=followup_id;
  select count(*) into count_value from public.claim_sample_followup_telegram(followup_id,now());
  if count_value<>0 then raise exception 'Telegram reported uncertainty while the SMS was still in flight'; end if;
  begin
    perform public.update_sample_followup(followup_id,'contacted');
    raise exception 'An uncertain in-flight SMS was resolved before its lease expired';
  exception when others then if sqlerrm<>'followup_sending_locked' then raise; end if; end;
  select count(*) into count_value from public.claim_sample_followup(followup_id,now()+interval '1 day');
  if count_value<>0 then raise exception 'Uncertain SMS submission was retried'; end if;
  update public.sample_followups set claimed_at=now()-interval '21 minutes' where id=followup_id;
  begin
    perform public.update_sample_followup(followup_id,'retry');
    raise exception 'Uncertain SMS submission was manually retried';
  exception when others then if sqlerrm<>'followup_retry_locked' then raise; end if; end;
  perform public.update_sample_followup(followup_id,'note','TEST ONLY: checking the provider');
  perform public.update_sample_followup(followup_id,'contacted','TEST ONLY: provider checked');
  if (select status from public.sample_followups where id=followup_id)<>'contacted' then raise exception 'Uncertain SMS could not be resolved after manual check'; end if;

  -- Retry only definitive failures, with a maximum of three automatic submissions.
  update public.sample_followups set sent_at=now()-interval '8 days',due_at=now()-interval '1 day' where id=linked_followup_id;
  select * into claim from public.claim_sample_followup(linked_followup_id,now());
  update public.sample_followups set status='failed',last_error='provider_rejected',claim_token=null,claimed_at=null where id=linked_followup_id;
  select count(*) into count_value from public.claim_sample_followup(linked_followup_id,now()+interval '2 hours');
  if count_value<>0 then raise exception 'Failed SMS retried too early'; end if;
  perform public.claim_sample_followup(linked_followup_id,now()+interval '3 hours');
  update public.sample_followups set status='failed',last_error='provider_rejected',claim_token=null,claimed_at=null where id=linked_followup_id;
  perform public.claim_sample_followup(linked_followup_id,now()+interval '6 hours');
  update public.sample_followups set status='failed',last_error='provider_rejected',claim_token=null,claimed_at=null where id=linked_followup_id;
  select count(*) into count_value from public.claim_sample_followup(linked_followup_id,now()+interval '1 day');
  if count_value<>0 or (select attempts from public.sample_followups where id=linked_followup_id)<>3 then raise exception 'Automatic attempt cap failed'; end if;
  perform public.update_sample_followup(linked_followup_id,'retry','TEST ONLY: configuration fixed');
  if not exists(select 1 from public.sample_followups where id=linked_followup_id and status='pending' and attempts=0) then raise exception 'Definitive failure could not be retried after correction'; end if;
  perform public.update_sample_followup_settings(false,null);
  select count(*) into count_value from public.claim_sample_followup(linked_followup_id,now());
  if count_value<>0 then raise exception 'Paused queue still sends SMS'; end if;
  perform public.update_sample_followup_settings(true,null);

  -- Telegram uses an independent, single claim, including SMS result rows.
  update public.sample_followups set status='queued',sms_queued_at=now(),claim_token=null,claimed_at=null where id=linked_followup_id;
  select count(*) into count_value from public.claim_sample_followup_telegram(linked_followup_id,now());
  if count_value<>1 then raise exception 'SMS result could not claim Telegram'; end if;
  select count(*) into count_value from public.claim_sample_followup_telegram(linked_followup_id,now()+interval '1 day');
  if count_value<>0 then raise exception 'Telegram uncertain receipt was reclaimed'; end if;
  select count(*) into count_value from public.claim_sample_followup(linked_followup_id,now()+interval '1 day');
  if count_value<>0 then raise exception 'Queued SMS was submitted twice'; end if;

  -- DNC also applies through an unlinked research contact, not just Pipeline.
  insert into public.discovery_prospects(id,name,source_url,source_key,evidence_kind,status,created_by)
    values(prospect_id,'TEST DNC','https://fixture.invalid','test-followup-'||suffix,'page_review','qualified',manager_id);
  insert into public.discovery_contacts(prospect_id,kind,value,normalized,source_url,observed_at)
    values(prospect_id,'phone','+84 90 000 1004','+84900001004','https://fixture.invalid',now());
  select id into followup_id from public.sample_followups where source_kind='order' and source_id=order_id;
  update public.sample_followups set sent_at=now()-interval '8 days',due_at=now()-interval '1 day' where id=followup_id;
  select * into claim from public.claim_sample_followup(followup_id,now());
  update public.discovery_prospects set status='do_not_contact' where id=prospect_id;
  select count(*) into count_value from public.validate_sample_followup(followup_id,claim.claim_token);
  if count_value<>0 or not exists(select 1 from public.sample_followups where id=followup_id and status='cancelled' and last_error='do_not_contact')
    then raise exception 'New DNC did not cancel or block a claimed SMS'; end if;
  select count(*) into count_value from public.claim_sample_followup_telegram(followup_id,now());
  if count_value<>0 then raise exception 'DNC still received a Telegram task'; end if;

  -- Subsequent confirmed legacy wholesale orders stop both request/order queues.
  insert into public.sample_requests(id,store_name,phone,address,status)
    values('test-followup-convert-'||suffix,'TEST CONVERT','0900001006','TEST ADDRESS','sent');
  select id into followup_id from public.sample_followups where source_id='test-followup-convert-'||suffix;
  update public.sample_followups set sent_at=now()-interval '8 days',due_at=now()-interval '1 day' where id=followup_id;
  insert into public.orders(id,type,customer_name,contact,lines,stage,status)
    values('test-followup-commercial-'||suffix,'wholesale','TEST PURCHASE','+84 90 000 1006','[{"name":"TEST TEA","qty":2,"unit":"kg"}]','confirm_details','confirmed');
  if not exists(select 1 from public.sample_followups where id=followup_id and status='cancelled' and last_error='commercial_order_received')
    then raise exception 'Subsequent legacy commercial order did not stop request follow-up'; end if;
  insert into public.orders(id,type,customer_name,contact,lines,stage,status)
    values('test-followup-order-convert-'||suffix,'retail','TEST SAMPLE PURCHASE','0900001007',sample_lines,'shipping','shipped');
  select id into followup_id from public.sample_followups where source_id='test-followup-order-convert-'||suffix;
  update public.sample_followups set sent_at=now()-interval '8 days',due_at=now()-interval '1 day' where id=followup_id;
  insert into public.orders(id,type,customer_name,contact,lines,stage,status)
    values('test-followup-retail-commercial-'||suffix,'retail','TEST PURCHASE','0900001007',jsonb_build_array(jsonb_build_object('productId',commercial_product,'qty',1)),'confirm_details','confirmed');
  if not exists(select 1 from public.sample_followups where id=followup_id and status='cancelled' and last_error='commercial_order_received')
    then raise exception 'NULL sample links bypassed commercial-order stop'; end if;

  -- Staff-recorded feedback closes the task and its default Pipeline prompt once.
  insert into public.trade_opportunities(id,contact_key,business_name,contact,stage,next_action,next_action_at,discovery_prospect_id)
    values(opportunity_id,'test-followup-opp-'||suffix,'TEST FEEDBACK','0900001008','sample_requested','Xác nhận và chuẩn bị bộ mẫu',now(),null);
  insert into public.sample_requests(id,store_name,phone,address,status,opportunity_id)
    values('test-followup-feedback-'||suffix,'TEST FEEDBACK','0900001008','TEST ADDRESS','sent',opportunity_id);
  select id into followup_id from public.sample_followups where source_id='test-followup-feedback-'||suffix;
  if not exists(select 1 from public.trade_opportunities o join public.sample_followups q on q.opportunity_id=o.id
    where q.id=followup_id and o.stage='sample_sent' and o.next_action='Hỏi phản hồi sau khi thử trà' and o.next_action_at=q.due_at)
    then raise exception 'First send did not advance the default Pipeline action'; end if;
  perform public.update_sample_followup(followup_id,'replied','TEST ONLY: good result');
  if not exists(select 1 from public.sample_followups where id=followup_id and status='replied' and resolved_by=manager_id::text)
    or not exists(select 1 from public.trade_opportunities where id=opportunity_id and stage='feedback' and next_action='' and next_action_at is null)
    then raise exception 'Feedback did not close the task or update its default relationship prompt'; end if;

  insert into public.trade_opportunities(id,contact_key,business_name,contact,stage,next_action,next_action_at)
    values('test-followup-custom-opp-'||suffix,'test-followup-custom-opp-'||suffix,'TEST CUSTOM','0900001010','lead','KEEP CUSTOM ACTION',now()+interval '20 days');
  insert into public.sample_requests(id,store_name,phone,address,status,opportunity_id)
    values('test-followup-custom-'||suffix,'TEST CUSTOM','0900001010','TEST ADDRESS','sent','test-followup-custom-opp-'||suffix);
  if not exists(select 1 from public.trade_opportunities where id='test-followup-custom-opp-'||suffix and stage='sample_sent'
    and next_action='KEEP CUSTOM ACTION' and next_action_at=now()+interval '20 days')
    then raise exception 'Enrollment overwrote a staff-authored next action'; end if;

  -- Existing sample status resolution cancels an outstanding job immediately.
  insert into public.sample_requests(id,store_name,phone,address,status)
    values('test-followup-decline-'||suffix,'TEST DECLINE','0900001009','TEST ADDRESS','sent');
  update public.sample_requests set status='declined' where id='test-followup-decline-'||suffix;
  if not exists(select 1 from public.sample_followups where source_id='test-followup-decline-'||suffix and status='cancelled' and last_error='sample_declined')
    then raise exception 'Declined sample still has an active follow-up'; end if;
end $$;
rollback;
select 'sample follow-up SQL checks passed; all fixtures rolled back' as result;
