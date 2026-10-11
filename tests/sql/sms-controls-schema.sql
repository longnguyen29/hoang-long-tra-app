-- Focused migration 0082 check: synthetic records, rolled back, no scheduler,
-- gateway or other network function is invoked.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
select set_config('request.jwt.claim.role','service_role',true);

do $$
declare
  suffix text:=replace(gen_random_uuid()::text,'-','');
  manager_id uuid:=gen_random_uuid(); employee_id uuid:=gen_random_uuid();
  order_id text:='test-sms-controls-order-'||suffix;
  receipt_id text:='test-sms-controls-receipt-'||suffix;
  shipping_id text:='test-sms-controls-shipping-'||suffix;
  payment_id text:='test-sms-controls-payment-'||suffix;
  followup_id uuid:=gen_random_uuid();
  dispatch_at timestamptz:='2026-10-01 09:00:00+07';
  receipt_at timestamptz:='2026-10-08 09:10:00+07';
  table_name text; row_id text; row_data jsonb; affected integer;
begin
  insert into auth.users(id,email) values
    (manager_id,'test-sms-controls-manager-'||suffix||'@fixture.invalid'),
    (employee_id,'test-sms-controls-employee-'||suffix||'@fixture.invalid');
  insert into public.staff_roles(user_id,role) values(manager_id,'manager'),(employee_id,'employee');
  insert into public.orders(id,type,customer_name,contact,lines)
    values(order_id,'retail','TEST ONLY',order_id||'@fixture.invalid','[]');
  insert into public.receivables(id,order_id,total,paid,status)
    values(receipt_id,order_id,100,0,'open');
  insert into public.sms_tracking_updates(id,order_id,shipping_carrier,tracking_code)
    values(shipping_id,order_id,'TEST carrier','TEST no real waybill');
  insert into public.sms_payment_reminders(id,order_id,receivable_id,amount_due)
    values(payment_id,order_id,receipt_id,100);
  insert into public.sample_followups(id,source_kind,source_id,order_id,sent_at,due_at)
    values(followup_id,'order',order_id,order_id,dispatch_at,dispatch_at+interval '7 days');

  foreach table_name in array array['sms_tracking_updates','sms_payment_reminders','sample_followups'] loop
    row_id:=case table_name when 'sms_tracking_updates' then shipping_id when 'sms_payment_reminders' then payment_id else followup_id::text end;
    execute format('select to_jsonb(t) from public.%I t where id::text=$1',table_name) into row_data using row_id;
    if row_data->'provider_checked_at' is distinct from 'null'::jsonb
      or row_data->'provider_sent_at' is distinct from 'null'::jsonb
      or row_data->'provider_delivered_at' is distinct from 'null'::jsonb
      or row_data->'provider_states' is distinct from '{}'::jsonb
      or row_data->>'provider_check_error' is distinct from ''
    then raise exception 'Receipt column defaults missing/incorrect on %',table_name; end if;
    if table_name='sms_tracking_updates' and (
      (row_data->>'retry_generation')::integer is distinct from 0
      or row_data->'submission_token' is distinct from 'null'::jsonb)
    then raise exception 'Retry controls must default to 0 generation and no submission token'; end if;
    begin
      execute format('update public.%I set provider_states=''[]''::jsonb where id::text=$1',table_name) using row_id;
      raise exception 'Array provider_states incorrectly accepted on %',table_name;
    exception when check_violation then null;
    end;
    execute format('update public.%I set provider_checked_at=$2,provider_sent_at=$2,provider_delivered_at=$2+interval ''5 minutes'',provider_states=$3,provider_check_error=$4 where id::text=$1',table_name)
      using row_id,receipt_at,'{"TEST provider":"Delivered"}'::jsonb,'TEST prior lookup error';
    execute format('select to_jsonb(t) from public.%I t where id::text=$1',table_name) into row_data using row_id;
    if (row_data->>'provider_checked_at')::timestamptz is distinct from receipt_at
      or (row_data->>'provider_sent_at')::timestamptz is distinct from receipt_at
      or (row_data->>'provider_delivered_at')::timestamptz is distinct from receipt_at+interval '5 minutes'
      or row_data->'provider_states' is distinct from '{"TEST provider":"Delivered"}'::jsonb
      or row_data->>'provider_check_error' is distinct from 'TEST prior lookup error'
    then raise exception 'Receipt metadata did not persist independently on %',table_name; end if;
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=table_name and c.relrowsecurity)
      or (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=table_name)<>1
      or not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=table_name
        and p.cmd='SELECT' and p.qual like '%is_staff()%')
    then raise exception 'Existing manager read-only RLS expanded or missing on %',table_name; end if;
  end loop;
  update public.sms_tracking_updates set status='uncertain',retry_generation=1,submission_token=gen_random_uuid()
    where id=shipping_id;
  if not exists(select 1 from public.sms_tracking_updates where id=shipping_id and status='uncertain' and retry_generation=1 and submission_token is not null)
  then raise exception 'Shipping uncertainty/retry generation cannot be recorded'; end if;
  begin
    update public.sms_tracking_updates set retry_generation=-1 where id=shipping_id;
    raise exception 'Negative retry generation incorrectly accepted';
  exception when check_violation then null;
  end;
  if not exists(select 1 from public.sample_followups where id=followup_id
    and sent_at=dispatch_at and due_at=dispatch_at+interval '7 days' and provider_sent_at=receipt_at)
  then raise exception 'Provider receipt repurposed the sample dispatch/due dates'; end if;
  begin
    update public.sample_followups set due_at=dispatch_at+interval '8 days' where id=followup_id;
    raise exception 'Seven-day sample deadline constraint was lost';
  exception when check_violation then null;
  end;
  if has_function_privilege('anon','public.invoke_shipping_sms_retry()','EXECUTE')
    or has_function_privilege('authenticated','public.invoke_shipping_sms_retry()','EXECUTE')
    or not has_function_privilege('service_role','public.invoke_shipping_sms_retry()','EXECUTE')
  then raise exception 'SMS scheduler execute privileges expanded'; end if;

  -- Exercise the actual client policies. Managers read the ledger, but mutations
  -- remain server-owned; the employee role gains no access from the new columns.
  perform set_config('request.jwt.claim.sub',manager_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  execute 'set local role authenticated';
  if (select count(*) from public.sms_tracking_updates where id=shipping_id)<>1
    or (select count(*) from public.sms_payment_reminders where id=payment_id)<>1
    or (select count(*) from public.sample_followups where id=followup_id)<>1
  then raise exception 'Manager lost SMS ledger read access'; end if;
  update public.sms_tracking_updates set status='failed' where id=shipping_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Manager client bypassed shipping retry server controls'; end if;
  update public.sms_payment_reminders set status='failed' where id=payment_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Manager client bypassed payment SMS server controls'; end if;
  begin
    update public.sample_followups set status='failed' where id=followup_id;
    raise exception 'Manager client bypassed sample SMS server controls';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub',employee_id::text,true);
  if (select count(*) from public.sms_tracking_updates where id=shipping_id)<>0
    or (select count(*) from public.sms_payment_reminders where id=payment_id)<>0
    or (select count(*) from public.sample_followups where id=followup_id)<>0
  then raise exception 'Employee gained SMS ledger access'; end if;
  execute 'reset role';
end $$;

rollback;
select 'sms-controls-schema SQL checks passed; synthetic ledgers and roles rolled back' as result;
