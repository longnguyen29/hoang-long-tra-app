-- Revenue-based period rewards replace new order-count rewards, without rewriting paid history.
begin;
alter table public.partner_network_reward_rules add column period_kind text not null default 'monthly' check(period_kind in ('monthly','yearly')),
 add column reward_basis text not null default 'order_count' check(reward_basis in ('order_count','net_collected_revenue'));
alter table public.partner_network_rewards drop constraint partner_network_rewards_kind_check;
alter table public.partner_network_rewards add constraint partner_network_rewards_kind_check check(kind in ('monthly','yearly','personal'));
alter table public.partner_network_rewards add column reward_basis text not null default 'order_count' check(reward_basis in ('order_count','net_collected_revenue')),
 add column qualifying_revenue numeric(16,2) check(qualifying_revenue>=0),
 add constraint partner_reward_year_start check(kind<>'yearly' or extract(month from month)=1);
create unique index partner_reward_one_yearly on public.partner_network_rewards(partner_id,month) where kind='yearly' and status<>'void';

create or replace function public.partner_network_reward_month(p_partner_id uuid,p_month date) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare rule_value public.partner_network_reward_rules;orders_value jsonb;count_value integer;amount_value numeric:=0;multiplier_value numeric:=1;tier jsonb;month_start date:=date_trunc('month',p_month)::date;
begin
 select * into rule_value from public.partner_network_reward_rules where partner_id=p_partner_id and reward_basis='order_count' and effective_month<=month_start order by effective_month desc,version desc limit 1;
 select count(*)::integer,coalesce(jsonb_agg(jsonb_build_object('id',o.id,'completed_at',greatest(coalesce((to_jsonb(o)->>'delivered_at')::timestamptz,m.completed_at),cash.fully_collected_at),
  'fingerprint',public.partner_network_financial(o.id)->>'fingerprint','review',jsonb_build_array(v.vat_amount,v.billed_shipping_amount,v.refunded_amount,v.cancelled,v.internal_cost_total)) order by o.id),'[]'::jsonb)
 into count_value,orders_value from public.orders o join public.partner_network_order_links l on l.order_id=o.id join public.partner_network_referrals r on r.id=l.referral_id and r.status='accepted' and r.partner_id=p_partner_id
 join public.partner_network_order_reviews v on v.order_id=o.id left join public.partner_network_order_milestones m on m.order_id=o.id
 cross join lateral(select min(paid_at) fully_collected_at from (
 select pay.paid_at,recv.total,sum(pay.amount) over(order by pay.paid_at,pay.id rows unbounded preceding) running
 from public.receivables recv join public.receivable_payments pay on pay.receivable_id=recv.id where recv.order_id=o.id
 )payments where running>=total)cash
 where (o.status='completed' or to_jsonb(o)->>'stage'='completed') and not v.cancelled and v.refunded_amount=0
 and coalesce((public.partner_network_financial(o.id)->>'collection_complete')::boolean,false) and not coalesce((public.partner_network_financial(o.id)->>'cancelled')::boolean,true)
 and (public.partner_network_financial(o.id)->>'collected')::numeric-v.vat_amount-v.billed_shipping_amount>0
 and coalesce((to_jsonb(o)->>'delivered_at')::timestamptz,m.completed_at) is not null
 and (greatest(coalesce((to_jsonb(o)->>'delivered_at')::timestamptz,m.completed_at),cash.fully_collected_at) at time zone 'Asia/Ho_Chi_Minh')::date>=month_start
 and (greatest(coalesce((to_jsonb(o)->>'delivered_at')::timestamptz,m.completed_at),cash.fully_collected_at) at time zone 'Asia/Ho_Chi_Minh')::date<(month_start+interval '1 month')::date;
 if rule_value.enabled then
  for tier in select value from jsonb_array_elements(rule_value.thresholds) order by (value->>'minimum_orders')::integer loop
   if count_value >= (tier->>'minimum_orders')::integer then amount_value:=(tier->>'amount')::numeric;end if;
  end loop;
 end if;
 select coalesce((select a.monthly_bonus_multiplier from public.partner_network_classic_agreements a where a.partner_id=p_partner_id and a.effective_at<((month_start+interval '1 month')::timestamp at time zone 'Asia/Ho_Chi_Minh') order by a.effective_at desc,a.version desc limit 1),1) into multiplier_value;
 amount_value:=round(amount_value*multiplier_value,0);
 return jsonb_build_object('bonus_multiplier',multiplier_value,'month',month_start,'count',count_value,'estimated_amount',amount_value,'rule_id',rule_value.id,'rule_enabled',coalesce(rule_value.enabled,false),
  'month_closed',month_start<date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date,'orders',orders_value,
  'fingerprint',md5(jsonb_build_array(rule_value.id,rule_value.version,rule_value.thresholds,rule_value.enabled,multiplier_value,orders_value)::text));
end $$;

-- The most recent enabled revenue policy determines one cadence for each calendar year.
-- An inactive draft does not select a cadence. Changes between active cadences start next January.
create function public.partner_network_reward_mode(p_partner_id uuid,p_year integer) returns text
language sql stable security definer set search_path=pg_catalog,public as $$
 select r.period_kind from public.partner_network_reward_rules r
 where r.partner_id=p_partner_id and r.reward_basis='net_collected_revenue' and r.enabled
 and r.effective_month<make_date(p_year+1,1,1)
 order by r.effective_month desc,r.version desc limit 1
$$;
create function public.partner_network_reward_overlap(p_partner_id uuid,p_start date,p_end date,p_ignore_id uuid default null) returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.partner_network_rewards r where r.partner_id=p_partner_id and r.kind in ('monthly','yearly')
 and r.status<>'void' and (p_ignore_id is null or r.id<>p_ignore_id)
 and r.month<p_end and (r.month+case when r.kind='yearly' then interval '1 year' else interval '1 month' end)::date>p_start)
$$;

create function public.partner_network_reward_period(p_partner_id uuid,p_period_kind text,p_period_start date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare rule_value public.partner_network_reward_rules;start_value date:=p_period_start;end_value date;start_at timestamptz;end_at timestamptz;
 orders_value jsonb;unknown_value integer;revenue_value numeric;amount_value numeric:=0;multiplier_value numeric:=1;tier jsonb;mode_value text;count_value integer;
begin
 if p_period_kind is null or p_period_kind not in ('monthly','yearly') or start_value is null or not isfinite(start_value) or extract(day from start_value)<>1
 or (p_period_kind='yearly' and extract(month from start_value)<>1) or start_value<date '2000-01-01' or start_value>date '2200-01-01' then raise exception 'invalid_reward_period';end if;
 end_value:=(start_value+case when p_period_kind='yearly' then interval '1 year' else interval '1 month' end)::date;
 start_at:=start_value::timestamp at time zone 'Asia/Ho_Chi_Minh';end_at:=end_value::timestamp at time zone 'Asia/Ho_Chi_Minh';
 mode_value:=public.partner_network_reward_mode(p_partner_id,extract(year from start_value)::integer);
 select * into rule_value from public.partner_network_reward_rules r where r.partner_id=p_partner_id and r.reward_basis='net_collected_revenue'
 and r.period_kind=p_period_kind and r.effective_month<=start_value order by r.effective_month desc,r.version desc limit 1;
 -- Cumulative net differences deduct reviewed exclusions once across split payments.
 -- Later refunds re-open earlier period reconciliation; refund dates are not invented.
 with cash as (
  select o.id,recv.id receivable_id,recv.total,recv.status receivable_status,v.order_id reviewed_order,v.vat_amount,v.billed_shipping_amount,v.refunded_amount,v.cancelled,
   (public.partner_network_financial(o.id)->>'cancelled')::boolean live_cancelled,
   greatest(0,least(recv.total,coalesce(sum(pay.amount) filter(where pay.paid_at<start_at and pay.paid_at<=now()),0))) before_cash,
   greatest(0,least(recv.total,coalesce(sum(pay.amount) filter(where pay.paid_at<end_at and pay.paid_at<=now()),0))) end_cash,
   coalesce(jsonb_agg(jsonb_build_array(pay.id,pay.amount,pay.paid_at) order by pay.paid_at,pay.id) filter(where pay.paid_at<end_at and pay.paid_at<=now()),'[]'::jsonb) payments
  from public.partner_network_order_links l join public.partner_network_referrals f on f.id=l.referral_id and f.partner_id=p_partner_id and f.status='accepted'
  join public.orders o on o.id=l.order_id join public.receivables recv on recv.order_id=o.id left join public.receivable_payments pay on pay.receivable_id=recv.id
  left join public.partner_network_order_reviews v on v.order_id=o.id
  group by o.id,recv.id,recv.total,recv.status,v.order_id,v.vat_amount,v.billed_shipping_amount,v.refunded_amount,v.cancelled
 ), eligible as (
  select *,case when live_cancelled or coalesce(cancelled,false) or receivable_status='void' then 0
   when reviewed_order is null then null
   else greatest(0,end_cash-vat_amount-billed_shipping_amount-refunded_amount)-greatest(0,before_cash-vat_amount-billed_shipping_amount-refunded_amount) end net
  from cash where end_cash>before_cash
 )
 select count(*)::integer,count(*) filter(where net is null)::integer,coalesce(sum(net),0),
 coalesce(jsonb_agg(jsonb_build_object('order_id',id,'receivable_id',receivable_id,'total',total,'before_cash',before_cash,'end_cash',end_cash,
 'payments',payments,'net',net,'review',jsonb_build_array(reviewed_order,vat_amount,billed_shipping_amount,refunded_amount,cancelled,live_cancelled,receivable_status)) order by id),'[]'::jsonb)
 into count_value,unknown_value,revenue_value,orders_value from eligible;
 if unknown_value>0 then revenue_value:=null;end if;
 if rule_value.enabled and mode_value=p_period_kind then
  if revenue_value is null then amount_value:=null;
  else for tier in select value from jsonb_array_elements(rule_value.thresholds) order by (value->>'minimum_revenue')::numeric loop
   if revenue_value >= (tier->>'minimum_revenue')::numeric then amount_value:=(tier->>'amount')::numeric;end if;
  end loop;end if;
 end if;
 select coalesce((select a.monthly_bonus_multiplier from public.partner_network_classic_agreements a where a.partner_id=p_partner_id and a.effective_at<end_at order by a.effective_at desc,a.version desc limit 1),1) into multiplier_value;
 amount_value:=round(amount_value*multiplier_value,0);
 return jsonb_build_object('period_kind',p_period_kind,'period_start',start_value,'period_end',end_value,'revenue_amount',revenue_value,
 'unreviewed_orders',unknown_value,'count',count_value,'estimated_amount',amount_value,'bonus_multiplier',multiplier_value,'rule_id',rule_value.id,
 'rule_enabled',coalesce(rule_value.enabled and mode_value=p_period_kind,false),'available_period_kind',mode_value,'period_closed',end_at<=now(),
 'orders',orders_value,'fingerprint',md5(jsonb_build_array(p_period_kind,start_value,end_value,mode_value,rule_value.id,rule_value.version,rule_value.thresholds,rule_value.enabled,multiplier_value,orders_value)::text));
end $$;

create function public.partner_network_reward_preview(p_partner_id uuid,p_period_kind text,p_period_start date) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 if not public.is_staff_manager() and not exists(select 1 from public.partner_network_partners where id=p_partner_id and user_id=auth.uid()) then raise exception 'own_partner_required';end if;
 return public.partner_network_reward_period(p_partner_id,p_period_kind,p_period_start)-'orders'-'fingerprint';
end $$;

create or replace function public.partner_network_reward_rule(p_partner_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare version_value integer;month_value date;kind_value text;reason_value text;thresholds_value jsonb;t jsonb;previous_revenue numeric:=0;previous_amount numeric:=0;
 result public.partner_network_reward_rules;existing_mode text;year_value integer;start_year date;end_year date;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['period_kind','effective_month','thresholds','enabled','reason','expected_version']) or jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then raise exception 'invalid_revenue_reward_rule';end if;
 perform 1 from public.partner_network_partners where id=p_partner_id and status='approved' for update;if not found then raise exception 'partner_not_approved';end if;
 select coalesce(max(version),0) into version_value from public.partner_network_reward_rules where partner_id=p_partner_id;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version')::numeric<>version_value then raise exception 'reward_rule_changed';end if;
 kind_value:=p_input->>'period_kind';month_value:=(p_input->>'effective_month')::date;reason_value:=public.partner_network_text(p_input->>'reason');thresholds_value:=p_input->'thresholds';
 if kind_value is null or kind_value not in ('monthly','yearly') or month_value is null or not isfinite(month_value) or extract(day from month_value)<>1
 or (kind_value='yearly' and extract(month from month_value)<>1)
 or month_value<date_trunc(case when kind_value='yearly' then 'year' else 'month' end,now() at time zone 'Asia/Ho_Chi_Minh')::date
 or month_value>(date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh')+interval '2 years')::date
 or length(reason_value) not between 10 and 1000 or jsonb_typeof(thresholds_value) is distinct from 'array' or jsonb_array_length(thresholds_value)>20
 or (p_input->'enabled'='true'::jsonb and jsonb_array_length(thresholds_value)=0) then raise exception 'invalid_revenue_reward_rule';end if;
 year_value:=extract(year from month_value)::integer;start_year:=make_date(year_value,1,1);end_year:=make_date(year_value+1,1,1);
 existing_mode:=public.partner_network_reward_mode(p_partner_id,year_value);
 if (p_input->>'enabled')::boolean and existing_mode is not null and existing_mode<>kind_value and
 (month_value<>start_year or start_year<=date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh')::date) then raise exception 'reward_cadence_switch_next_year';end if;
 if (p_input->>'enabled')::boolean and exists(select 1 from public.partner_network_rewards r where r.partner_id=p_partner_id and r.status<>'void'
  and ((kind_value='yearly' and r.kind='monthly' and r.month>=start_year and r.month<end_year)
   or(kind_value='monthly' and r.kind='yearly' and r.month=start_year))) then raise exception 'reward_period_overlaps';end if;
 for t in select value from jsonb_array_elements(thresholds_value) loop
  if not public.partner_network_input_keys(t,array['minimum_revenue','amount']) or jsonb_typeof(t->'minimum_revenue') is distinct from 'number' or jsonb_typeof(t->'amount') is distinct from 'number'
  or (t->>'minimum_revenue')::numeric<>trunc((t->>'minimum_revenue')::numeric) or (t->>'minimum_revenue')::numeric<=previous_revenue or (t->>'minimum_revenue')::numeric>999999999999
  or (t->>'amount')::numeric<>trunc((t->>'amount')::numeric) or (t->>'amount')::numeric<=previous_amount or (t->>'amount')::numeric>999999999999 then raise exception 'invalid_revenue_reward_rule';end if;
  previous_revenue:=(t->>'minimum_revenue')::numeric;previous_amount:=(t->>'amount')::numeric;
 end loop;
 insert into public.partner_network_reward_rules(partner_id,version,effective_month,thresholds,enabled,reason,created_by,period_kind,reward_basis)
 values(p_partner_id,version_value+1,month_value,thresholds_value,(p_input->>'enabled')::boolean,reason_value,auth.uid(),kind_value,'net_collected_revenue') returning * into result;
 return to_jsonb(result);
end $$;

alter function public.partner_network_reward_view(uuid) rename to partner_network_reward_view_before_revenue;
revoke all on function public.partner_network_reward_view_before_revenue(uuid) from public,anon,authenticated;
create function public.partner_network_reward_view(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_rewards;current_value jsonb;result jsonb;
begin
 select * into r from public.partner_network_rewards where id=p_id;if not found then return null;end if;
 if r.kind='personal' or r.reward_basis='order_count' then
  result:=public.partner_network_reward_view_before_revenue(p_id);
  return result||jsonb_build_object('reward_basis',case when r.kind='personal' then 'discretionary' else 'order_count' end,'legacy',r.kind<>'personal',
  'period_kind',case when r.kind='personal' then 'personal' else 'monthly' end,'period_start',r.month,'period_end',(r.month+interval '1 month')::date);
 end if;
 current_value:=public.partner_network_reward_period(r.partner_id,r.kind,r.month);
 return jsonb_build_object('id',r.id,'partner_id',r.partner_id,'kind',r.kind,'month',r.month,'period_kind',r.kind,'period_start',r.month,'period_end',current_value->'period_end',
 'status',r.status,'amount',r.amount,'qualifying_revenue',r.qualifying_revenue,'reward_basis',r.reward_basis,'legacy',false,'reason',r.reason,'reference',r.reference,
 'created_at',r.created_at,'approved_at',r.approved_at,'paid_at',r.paid_at,'paid_reference',r.paid_reference,
 'stale',r.fingerprint is distinct from current_value->>'fingerprint','current_revenue_amount',current_value->'revenue_amount','current_estimated_amount',current_value->'estimated_amount');
end $$;

create or replace function public.partner_network_reward_create(p_partner_id uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare month_value date;kind_value text;reason_value text;reference_value text;amount_value numeric;data_value jsonb;result public.partner_network_rewards;request_value uuid;request_hash text;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['kind','month','amount','reason','reference','request_id']) then raise exception 'invalid_reward';end if;
 request_value:=coalesce((p_input->>'request_id')::uuid,gen_random_uuid());request_hash:=md5(jsonb_build_array(p_partner_id,p_input-'request_id')::text);
 perform pg_advisory_xact_lock(hashtextextended('partner-reward:'||request_value::text,0));
 select * into result from public.partner_network_rewards where request_id=request_value;
 if found then
  if result.partner_id<>p_partner_id or result.request_fingerprint is distinct from request_hash then raise exception 'reward_request_conflict';end if;
  return public.partner_network_reward_view(result.id);
 end if;
 perform 1 from public.partner_network_partners where id=p_partner_id and status='approved' for update;if not found then raise exception 'partner_not_approved';end if;
 kind_value:=p_input->>'kind';month_value:=(p_input->>'month')::date;reason_value:=public.partner_network_text(p_input->>'reason');reference_value:=public.partner_network_text(p_input->>'reference');
 if kind_value is null or kind_value not in ('monthly','yearly','personal') or month_value is null or not isfinite(month_value) or extract(day from month_value)<>1
 or length(reason_value) not between 10 and 1000 or length(reference_value)>240 then raise exception 'invalid_reward';end if;
 if kind_value in ('monthly','yearly') then
  if p_input ? 'amount' then raise exception 'revenue_reward_amount_is_calculated';end if;
  data_value:=public.partner_network_reward_period(p_partner_id,kind_value,month_value);
  if not coalesce((data_value->>'rule_enabled')::boolean,false) then raise exception 'revenue_reward_policy_required';end if;
  if data_value->'revenue_amount'='null'::jsonb then raise exception 'revenue_reward_review_required';end if;
  if public.partner_network_reward_overlap(p_partner_id,month_value,(data_value->>'period_end')::date) then raise exception 'reward_period_overlaps';end if;
  amount_value:=(data_value->>'estimated_amount')::numeric;
 else
  amount_value:=(p_input->>'amount')::numeric;data_value:=jsonb_build_object('month',month_value,'personal',true,'fingerprint',md5(jsonb_build_array(p_partner_id,month_value,amount_value,reason_value,reference_value)::text));
 end if;
 if amount_value is null or amount_value<=0 or amount_value>999999999999 or amount_value<>trunc(amount_value) or amount_value::text in ('NaN','Infinity','-Infinity') then raise exception 'no_reward_due';end if;
 insert into public.partner_network_rewards(request_id,request_fingerprint,partner_id,kind,month,rule_id,amount,qualifying_orders,reason,reference,eligibility_snapshot,fingerprint,created_by,reward_basis,qualifying_revenue)
 values(request_value,request_hash,p_partner_id,kind_value,month_value,(data_value->>'rule_id')::uuid,amount_value,coalesce((data_value->>'count')::integer,0),reason_value,reference_value,data_value,data_value->>'fingerprint',auth.uid(),
 case when kind_value='personal' then 'order_count' else 'net_collected_revenue' end,(data_value->>'revenue_amount')::numeric) returning * into result;
 return public.partner_network_reward_view(result.id);
end $$;

create or replace function public.partner_network_reward_action(p_id uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_rewards;view_value jsonb;paid_date timestamptz;reference_value text;reason_value text;end_value date;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if p_action not in ('approve','pay','void') or not public.partner_network_input_keys(p_input,array['reason','amount','reference','paid_at']) then raise exception 'invalid_reward_action';end if;
 select * into r from public.partner_network_rewards where id=p_id;if not found then raise exception 'reward_not_found';end if;
 perform 1 from public.orders o join public.partner_network_order_links l on l.order_id=o.id join public.partner_network_referrals f on f.id=l.referral_id where f.partner_id=r.partner_id order by o.id for update of o;
 perform 1 from public.receivables v join public.partner_network_order_links l on l.order_id=v.order_id join public.partner_network_referrals f on f.id=l.referral_id where f.partner_id=r.partner_id order by v.order_id for update of v;
 perform 1 from public.receivable_payments pay join public.receivables v on v.id=pay.receivable_id join public.partner_network_order_links l on l.order_id=v.order_id join public.partner_network_referrals f on f.id=l.referral_id where f.partner_id=r.partner_id order by pay.id for update of pay;
 perform 1 from public.partner_network_partners where id=r.partner_id for update;
 select * into r from public.partner_network_rewards where id=p_id for update;
 if r.status='paid' then raise exception 'paid_reward_immutable';end if;
 if r.status='void' then raise exception 'reward_void';end if;
 if r.kind<>'personal' and r.reward_basis='order_count' and p_action<>'void' then raise exception 'legacy_reward_review_required';end if;
 view_value:=public.partner_network_reward_view(r.id);
 if p_action<>'void' and (view_value->>'stale')::boolean then raise exception 'reward_stale_recreate_required';end if;
 if p_action in ('approve','pay') and r.kind in ('monthly','yearly') then
  end_value:=(view_value->>'period_end')::date;
  if (end_value::timestamp at time zone 'Asia/Ho_Chi_Minh')>now() then raise exception 'reward_period_not_closed';end if;
  if public.partner_network_reward_overlap(r.partner_id,r.month,end_value,r.id) then raise exception 'reward_period_overlaps';end if;
 end if;
 if p_action='approve' then
  if r.status<>'review' then raise exception 'reward_not_in_review';end if;
  update public.partner_network_rewards set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now() where id=r.id;
 elsif p_action='pay' then
  if r.status<>'approved' then raise exception 'reward_approval_required';end if;
  paid_date:=(p_input->>'paid_at')::timestamptz;reference_value:=public.partner_network_text(p_input->>'reference');
  if (p_input->>'amount')::numeric is distinct from r.amount or paid_date is null or paid_date<r.approved_at or paid_date>now()+interval '5 minutes' or length(reference_value) not between 1 and 240 then raise exception 'invalid_reward_payment';end if;
  update public.partner_network_rewards set status='paid',paid_by=auth.uid(),paid_at=paid_date,paid_reference=reference_value,updated_at=now() where id=r.id;
 else
  reason_value:=public.partner_network_text(p_input->>'reason');if length(reason_value) not between 10 and 1000 then raise exception 'reason_required';end if;
  update public.partner_network_rewards set status='void',reason=reason_value,updated_at=now() where id=r.id;
 end if;
 return public.partner_network_reward_view(r.id);
end $$;

alter function public.partner_network_rewards_snapshot(uuid) rename to partner_network_rewards_snapshot_before_revenue;
revoke all on function public.partner_network_rewards_snapshot_before_revenue(uuid) from public,anon,authenticated;
create function public.partner_network_rewards_snapshot(p_partner_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb;partner_value uuid:=p_partner_id;manager_value boolean:=public.is_staff_manager();rules_value jsonb;previews_value jsonb;
begin
 result:=public.partner_network_rewards_snapshot_before_revenue(p_partner_id);
 if not manager_value then select id into partner_value from public.partner_network_partners where user_id=auth.uid();end if;
 if not manager_value and partner_value is null then return (result-'monthly_rules'-'monthly_previews')||jsonb_build_object('reward_rules','[]'::jsonb,'period_previews','[]'::jsonb);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'partner_id',r.partner_id,'version',r.version,'effective_month',r.effective_month,'period_kind',r.period_kind,
 'reward_basis',r.reward_basis,'thresholds',r.thresholds,'enabled',r.enabled) order by r.version desc),'[]'::jsonb)
 into rules_value from public.partner_network_reward_rules r where partner_value is null or r.partner_id=partner_value;
 select coalesce(jsonb_agg(jsonb_build_object('partner_id',p.id)||(public.partner_network_reward_period(p.id,periods.kind,periods.start_date)-'orders'-'fingerprint')),'[]'::jsonb)
 into previews_value from public.partner_network_partners p cross join lateral(
  select 'monthly'::text kind,m::date start_date from generate_series(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')-interval '2 months',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh'),interval '1 month')m
  union all select 'yearly',y::date from generate_series(date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh')-interval '1 year',date_trunc('year',now() at time zone 'Asia/Ho_Chi_Minh'),interval '1 year')y
 )periods where p.status='approved' and (partner_value is null or p.id=partner_value)
 and (manager_value or periods.kind=public.partner_network_reward_mode(p.id,extract(year from periods.start_date)::integer));
 return (result-'monthly_rules'-'monthly_previews')||jsonb_build_object('reward_rules',rules_value,'period_previews',previews_value);
end $$;
revoke all on function public.partner_network_reward_mode(uuid,integer),public.partner_network_reward_overlap(uuid,date,date,uuid),public.partner_network_reward_period(uuid,text,date) from public,anon,authenticated;
revoke all on function public.partner_network_reward_preview(uuid,text,date),public.partner_network_reward_rule(uuid,jsonb),public.partner_network_reward_view(uuid),public.partner_network_reward_create(uuid,jsonb),public.partner_network_reward_action(uuid,text,jsonb),public.partner_network_rewards_snapshot(uuid) from public,anon;
revoke all on function public.partner_network_reward_view(uuid) from authenticated;
grant execute on function public.partner_network_reward_preview(uuid,text,date),public.partner_network_reward_rule(uuid,jsonb),public.partner_network_reward_create(uuid,jsonb),public.partner_network_reward_action(uuid,text,jsonb),public.partner_network_rewards_snapshot(uuid) to authenticated;
commit;
