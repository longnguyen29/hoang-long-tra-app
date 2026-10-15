-- Explicit Classic agreements and reviewed rewards; no existing agreement or payout is rewritten.
begin;
create table public.partner_network_classic_tiers (
 id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 100),enabled boolean not null default false,
 min_tenure_months integer check(min_tenure_months between 0 and 1200),min_collected_12m numeric(14,0) check(min_collected_12m between 0 and 999999999999),
 eligibility_mode text not null default 'all' check(eligibility_mode in ('all','any')),
 first_rate numeric(7,4) not null check(first_rate between 0 and 100),repeat_rate numeric(7,4) not null check(repeat_rate between 0 and 100),
 monthly_bonus_multiplier numeric(7,4) not null default 1 check(monthly_bonus_multiplier between 0 and 100),
 reason text not null check(length(reason) between 10 and 1000),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),
 check(not enabled or min_tenure_months is not null or min_collected_12m is not null)
);
create table public.partner_network_classic_agreements (
 id uuid primary key default gen_random_uuid(), partner_id uuid not null references public.partner_network_partners(id),
 version integer not null check(version>0), effective_at timestamptz not null, first_rate numeric not null default 1 check(first_rate between 0 and 100),
 repeat_rate numeric not null default 2 check(repeat_rate between 0 and 100), repeat_after integer not null default 2 check(repeat_after=2),
 basis text not null default 'profit' check(basis='profit'), tier_id uuid references public.partner_network_classic_tiers(id),tier_snapshot jsonb,monthly_bonus_multiplier numeric(7,4) not null default 1 check(monthly_bonus_multiplier between 0 and 100), reason text not null check(length(reason) between 10 and 1000),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), unique(partner_id,version)
);
alter table public.partner_network_commissions add column remuneration_mode text not null default 'commission' check(remuneration_mode in ('commission','price_difference')),
 add column remuneration_terms_snapshot jsonb,add column classic_agreement_id uuid references public.partner_network_classic_agreements(id);
alter table public.partner_network_order_reviews add column remuneration_mode text not null default 'commission' check(remuneration_mode in ('commission','price_difference')),
 add column remuneration_terms_snapshot jsonb;
create table public.partner_network_reward_rules (
 id uuid primary key default gen_random_uuid(),partner_id uuid not null references public.partner_network_partners(id),version integer not null check(version>0),
 effective_month date not null check(extract(day from effective_month)=1),thresholds jsonb not null check(jsonb_typeof(thresholds)='array'),
 enabled boolean not null default false,reason text not null check(length(reason) between 10 and 1000),created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),unique(partner_id,version)
);
create table public.partner_network_rewards (
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique default gen_random_uuid(),request_fingerprint text,partner_id uuid not null references public.partner_network_partners(id),kind text not null check(kind in ('monthly','personal')),
 month date not null check(extract(day from month)=1),rule_id uuid references public.partner_network_reward_rules(id),status text not null default 'review' check(status in ('review','approved','paid','void')),
 amount numeric(14,0) not null check(amount>0 and amount<=999999999999),qualifying_orders integer not null default 0 check(qualifying_orders>=0),
 reason text not null check(length(reason) between 10 and 1000),reference text not null default '' check(length(reference)<=240),eligibility_snapshot jsonb not null,fingerprint text not null,
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),approved_by uuid references auth.users(id),approved_at timestamptz,
 paid_by uuid references auth.users(id),paid_at timestamptz,paid_reference text,updated_at timestamptz not null default now(),
 constraint partner_reward_paid check(status<>'paid' or(paid_by is not null and paid_at is not null and length(paid_reference)>0))
);
create unique index partner_reward_one_monthly on public.partner_network_rewards(partner_id,month) where kind='monthly' and status<>'void';
-- Future completion timestamps are recorded rather than guessed from creation dates.
create table public.partner_network_order_milestones(order_id text primary key references public.orders(id),completed_at timestamptz not null);
create function public.partner_network_record_completion() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if (new.status='completed' or to_jsonb(new)->>'stage'='completed') and not coalesce(old.status='completed' or to_jsonb(old)->>'stage'='completed',false) then
  insert into public.partner_network_order_milestones(order_id,completed_at) values(new.id,now()) on conflict(order_id) do nothing;
 end if;return new;
end $$;
create trigger partner_network_completion after update on public.orders for each row execute function public.partner_network_record_completion();
-- Tables are manager-readable only; partner access is an explicit safe projection below.
alter table public.partner_network_classic_tiers enable row level security;
alter table public.partner_network_classic_agreements enable row level security;
alter table public.partner_network_reward_rules enable row level security;
alter table public.partner_network_rewards enable row level security;
alter table public.partner_network_order_milestones enable row level security;
revoke all on public.partner_network_classic_tiers,public.partner_network_classic_agreements,public.partner_network_reward_rules,public.partner_network_rewards,public.partner_network_order_milestones from public,anon,authenticated;
grant select on public.partner_network_classic_tiers,public.partner_network_classic_agreements,public.partner_network_reward_rules,public.partner_network_rewards to authenticated;
grant all on public.partner_network_classic_tiers,public.partner_network_classic_agreements,public.partner_network_reward_rules,public.partner_network_rewards,public.partner_network_order_milestones to service_role;
create policy partner_classic_tier_manager_read on public.partner_network_classic_tiers for select to authenticated using(public.is_staff_manager());
create policy partner_classic_manager_read on public.partner_network_classic_agreements for select to authenticated using(public.is_staff_manager());
create policy partner_reward_rules_manager_read on public.partner_network_reward_rules for select to authenticated using(public.is_staff_manager());
create policy partner_rewards_manager_read on public.partner_network_rewards for select to authenticated using(public.is_staff_manager());
create trigger partner_classic_tier_audit after insert or update on public.partner_network_classic_tiers for each row execute function public.partner_network_audit_change();
create trigger partner_classic_audit after insert on public.partner_network_classic_agreements for each row execute function public.partner_network_audit_change();
create trigger partner_reward_rule_audit after insert on public.partner_network_reward_rules for each row execute function public.partner_network_audit_change();
create trigger partner_reward_audit after insert or update on public.partner_network_rewards for each row execute function public.partner_network_audit_change();

-- Revenue qualification uses only explicitly attributed collections within the last 12 months.
-- Unknown exclusions make revenue qualification unknown rather than treating tax/freight as earnings.
create function public.partner_network_tier_eligibility(p_partner_id uuid,p_tier_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners;t public.partner_network_classic_tiers;tenure integer;revenue numeric;unknown_count integer;tenure_ok boolean;revenue_ok boolean;eligible boolean;
begin
 select * into p from public.partner_network_partners where id=p_partner_id;select * into t from public.partner_network_classic_tiers where id=p_tier_id;
 tenure:=case when p.approved_at is null then 0 else extract(year from age(now(),p.approved_at))::integer*12+extract(month from age(now(),p.approved_at))::integer end;
 select coalesce(sum(greatest(0,c.cash-v.vat_amount-v.billed_shipping_amount-v.refunded_amount)),0),count(*) filter(where v.order_id is null)::integer into revenue,unknown_count
 from public.partner_network_order_links l join public.partner_network_referrals r on r.id=l.referral_id and r.partner_id=p_partner_id and r.status='accepted'
 join public.orders o on o.id=l.order_id left join public.partner_network_order_reviews v on v.order_id=o.id
 cross join lateral(select least(coalesce(sum(pay.amount),0),coalesce((public.partner_network_financial(o.id)->>'collected')::numeric,0)) cash from public.receivables recv join public.receivable_payments pay on pay.receivable_id=recv.id where recv.order_id=o.id and pay.paid_at>=now()-interval '12 months' and pay.paid_at<=now())c
 where c.cash>0 and not coalesce(v.cancelled,false) and not coalesce((public.partner_network_financial(o.id)->>'cancelled')::boolean,true);
 if unknown_count>0 then revenue:=null;end if;
 tenure_ok:=case when t.min_tenure_months is null then null else tenure>=t.min_tenure_months end;
 revenue_ok:=case when t.min_collected_12m is null then null else revenue>=t.min_collected_12m end;
 eligible:=t.enabled and case when t.eligibility_mode='any' then coalesce(tenure_ok,false) or coalesce(revenue_ok,false)
 else (t.min_tenure_months is null or coalesce(tenure_ok,false)) and (t.min_collected_12m is null or coalesce(revenue_ok,false)) end;
 return jsonb_build_object('tier_id',t.id,'eligible',coalesce(eligible,false),'tenure_months',tenure,'collected_12m',revenue,'unreviewed_orders',unknown_count,'evaluated_at',now());
end $$;
create function public.partner_network_tier_create(p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare t public.partner_network_classic_tiers;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['name','enabled','min_tenure_months','min_collected_12m','eligibility_mode','first_rate','repeat_rate','monthly_bonus_multiplier','reason'])
 or jsonb_typeof(p_input->'enabled') is distinct from 'boolean' or length(public.partner_network_text(p_input->>'reason')) not between 10 and 1000 then raise exception 'invalid_classic_tier';end if;
 insert into public.partner_network_classic_tiers(name,enabled,min_tenure_months,min_collected_12m,eligibility_mode,first_rate,repeat_rate,monthly_bonus_multiplier,reason,created_by)
 values(public.partner_network_text(p_input->>'name'),(p_input->>'enabled')::boolean,(p_input->>'min_tenure_months')::integer,(p_input->>'min_collected_12m')::numeric,
 coalesce(p_input->>'eligibility_mode','all'),(p_input->>'first_rate')::numeric,(p_input->>'repeat_rate')::numeric,coalesce((p_input->>'monthly_bonus_multiplier')::numeric,1),public.partner_network_text(p_input->>'reason'),auth.uid()) returning * into t;
 return to_jsonb(t);
end $$;
create function public.partner_network_tier_state(p_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare result public.partner_network_classic_tiers;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['enabled','reason']) or jsonb_typeof(p_input->'enabled') is distinct from 'boolean'
 or length(public.partner_network_text(p_input->>'reason')) not between 10 and 1000 then raise exception 'invalid_classic_tier';end if;
 update public.partner_network_classic_tiers set enabled=(p_input->>'enabled')::boolean,reason=public.partner_network_text(p_input->>'reason') where id=p_id returning * into result;
 if not found then raise exception 'classic_tier_not_found';end if;
 return to_jsonb(result);
end $$;
create function public.partner_network_apply_classic(p_partner_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.partner_network_partners; v integer; t timestamptz; result public.partner_network_classic_agreements;reason_value text;tier_value public.partner_network_classic_tiers;eligibility_value jsonb;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['reason','effective_at','expected_version','tier_id']) then raise exception 'invalid_classic_agreement';end if;
 select * into p from public.partner_network_partners where id=p_partner_id for update;
 if not found or p.status<>'approved' then raise exception 'partner_not_approved';end if;
 select coalesce(max(version),0) into v from public.partner_network_classic_agreements where partner_id=p.id;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version')::numeric<>v then raise exception 'classic_agreement_changed';end if;
 t:=coalesce((p_input->>'effective_at')::timestamptz,statement_timestamp());reason_value:=public.partner_network_text(p_input->>'reason');
 if t<statement_timestamp() or t>statement_timestamp()+interval '1 year' or length(reason_value) not between 10 and 1000 then raise exception 'invalid_classic_agreement';end if;
 if nullif(p_input->>'tier_id','') is not null then
  select * into tier_value from public.partner_network_classic_tiers where id=(p_input->>'tier_id')::uuid;
  eligibility_value:=public.partner_network_tier_eligibility(p.id,tier_value.id);
  if not coalesce((eligibility_value->>'eligible')::boolean,false) then raise exception 'classic_tier_not_eligible';end if;
 end if;
 insert into public.partner_network_classic_agreements(partner_id,version,effective_at,reason,created_by,tier_id,tier_snapshot,first_rate,repeat_rate,monthly_bonus_multiplier)
 values(p.id,v+1,t,reason_value,auth.uid(),tier_value.id,case when tier_value.id is not null then to_jsonb(tier_value)||jsonb_build_object('eligibility',eligibility_value) end,
 coalesce(tier_value.first_rate,1),coalesce(tier_value.repeat_rate,2),coalesce(tier_value.monthly_bonus_multiplier,1)) returning * into result;
 return to_jsonb(result);
end $$;
create function public.partner_network_classic_for_order(p_order_id text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select to_jsonb(a) from public.orders o join public.partner_network_order_links l on l.order_id=o.id join public.partner_network_referrals r on r.id=l.referral_id and r.status='accepted'
 join public.partner_network_classic_agreements a on a.partner_id=r.partner_id and a.effective_at<=o.ts where o.id=p_order_id order by a.effective_at desc,a.version desc limit 1
$$;
-- The third and later qualifying purchase of the SAME attributed customer receives 2%.
-- Only completed, fully collected, reviewed, unrefunded orders count; no global customer-history guess.
create function public.partner_network_classic_order_index(p_order_id text,p_referral_id uuid) returns integer language sql stable security definer set search_path=pg_catalog,public as $$
 select 1+count(*)::integer from public.partner_network_order_links l join public.orders earlier on earlier.id=l.order_id join public.orders current_order on current_order.id=p_order_id
 join public.partner_network_referrals r on r.id=l.referral_id and r.status='accepted' join public.partner_network_referrals target on target.id=p_referral_id and target.status='accepted'
 join public.partner_network_order_reviews v on v.order_id=earlier.id
 where r.id=target.id and r.partner_id=target.partner_id and (earlier.ts,earlier.id)<(current_order.ts,current_order.id)
 and (earlier.status='completed' or to_jsonb(earlier)->>'stage'='completed')
 and coalesce((public.partner_network_financial(earlier.id)->>'collection_complete')::boolean,false)
 and not coalesce((public.partner_network_financial(earlier.id)->>'cancelled')::boolean,true) and not v.cancelled and v.refunded_amount=0
 and (public.partner_network_financial(earlier.id)->>'collected')::numeric-v.vat_amount-v.billed_shipping_amount>0
$$;
-- 0092 replaces this hook after creating its private approved quotation terms.
create function public.partner_network_price_difference_terms(p_order_id text) returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$ select null::jsonb $$;
alter function public.partner_network_fingerprint(text,uuid) rename to partner_network_fingerprint_before_classic;
create function public.partner_network_fingerprint(p_order_id text,p_referral_id uuid) returns text language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions;a jsonb;q jsonb;legacy text;
begin
 legacy:=public.partner_network_fingerprint_before_classic(p_order_id,p_referral_id);
 select * into c from public.partner_network_commissions where order_id=p_order_id;q:=public.partner_network_price_difference_terms(p_order_id);
 if c.classic_agreement_id is null and c.remuneration_mode='commission' and q is null then return legacy;end if;
 if c.classic_agreement_id is not null then a:=public.partner_network_classic_for_order(p_order_id);end if;
 return md5(jsonb_build_array(legacy,c.remuneration_mode,c.remuneration_terms_snapshot,a,
 case when c.classic_agreement_id is not null then public.partner_network_classic_order_index(p_order_id,p_referral_id) end,q)::text);
end $$;
alter function public.partner_network_commission_view(uuid) rename to partner_network_commission_view_before_classic;
create function public.partner_network_commission_view(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions;v jsonb;q jsonb;base numeric;amount_value numeric;idx integer;stale_value boolean;
begin
 v:=public.partner_network_commission_view_before_classic(p_id);if v is null then return null;end if;
 select * into c from public.partner_network_commissions where id=p_id;
 if c.classic_agreement_id is not null then
  idx:=public.partner_network_classic_order_index(c.order_id,c.referral_id);
  v:=v||jsonb_build_object('classic_order_index',idx,'entitlement_review_required',c.status='paid' and idx is distinct from (c.remuneration_terms_snapshot->>'qualifying_order_index')::integer);
 end if;
 if c.remuneration_mode='price_difference' then
  q:=public.partner_network_price_difference_terms(c.order_id);
  base:=case when coalesce((q->>'valid')::boolean,false) and q->>'remuneration_mode'='price_difference' then greatest(0,least((v->>'current_eligible_base')::numeric,(q->>'goods_amount')::numeric)-(q->>'base_amount')::numeric) end;
  amount_value:=case when base is null then null else greatest(0,least(floor(base),round(base,0)+c.adjustment_amount)) end;
  stale_value:=coalesce((v->>'stale')::boolean,true) or q is null or not coalesce((q->>'valid')::boolean,false);
  v:=v||jsonb_build_object('current_commission_base',base,'current_amount',amount_value,'stale',stale_value,'price_difference_terms_valid',coalesce((q->>'valid')::boolean,false),
   'overpaid_amount',case when c.status='paid' and amount_value is not null then greatest(0,c.paid_amount-amount_value) when c.status='paid' then null else 0 end);
 end if;
 return v||jsonb_build_object('remuneration_mode',c.remuneration_mode,'classic_agreement_id',c.classic_agreement_id);
end $$;
alter function public.partner_network_reconcile(text,jsonb) rename to partner_network_reconcile_before_classic;
create function public.partner_network_reconcile(p_order_id text,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.partner_network_commissions;a jsonb;q jsonb;input_value jsonb:=p_input;mode_value text:='commission';snapshot_value jsonb;idx integer;rate_value numeric;result jsonb;base numeric;partner_value uuid;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 -- Preserve the existing order -> receivable -> referral -> partner lock order.
 perform 1 from public.orders where id=p_order_id for update;perform 1 from public.receivables where order_id=p_order_id for update;
 perform 1 from public.partner_network_referrals r join public.partner_network_order_links l on l.referral_id=r.id where l.order_id=p_order_id for update of r;
 select r.partner_id into partner_value from public.partner_network_referrals r join public.partner_network_order_links l on l.referral_id=r.id where l.order_id=p_order_id;
 perform 1 from public.partner_network_partners where id=partner_value for update;
 select * into c from public.partner_network_commissions where order_id=p_order_id for update;
 if found and c.status='paid' then return public.partner_network_reconcile_before_classic(p_order_id,p_input);end if;
 q:=public.partner_network_price_difference_terms(p_order_id);
 if q is not null then
  if q->>'remuneration_mode'<>'price_difference' or not coalesce((q->>'valid')::boolean,false) then raise exception 'price_difference_terms_invalid';end if;
  mode_value:='price_difference';snapshot_value:=q;
  if p_input ? 'rate_percent' and (p_input->>'rate_percent')::numeric<>100 then raise exception 'price_difference_no_percentage_stacking';end if;
  input_value:=p_input||jsonb_build_object('commission_basis','profit','rate_percent',100,'adjustment_reason','Approved price-difference agreement; percentage commission is not stacked.');
 else
  a:=public.partner_network_classic_for_order(p_order_id);
  if a is not null then
   idx:=public.partner_network_classic_order_index(p_order_id,(select referral_id from public.partner_network_order_links where order_id=p_order_id));rate_value:=case when idx<=2 then (a->>'first_rate')::numeric else (a->>'repeat_rate')::numeric end;
   snapshot_value:=jsonb_build_object('agreement_id',a->'id','version',a->'version','basis','profit','qualifying_order_index',idx,'default_rate',rate_value,'tier_snapshot',a->'tier_snapshot');
   if p_input ? 'commission_basis' and p_input->>'commission_basis'<>'profit' then raise exception 'classic_requires_profit_basis';end if;
   if p_input ? 'rate_percent' and (p_input->>'rate_percent')::numeric<>rate_value and length(public.partner_network_text(p_input->>'adjustment_reason'))<10 then raise exception 'rate_adjustment_reason_required';end if;
   input_value:=p_input||jsonb_build_object('commission_basis','profit','rate_percent',coalesce((p_input->>'rate_percent')::numeric,rate_value),'adjustment_reason',
    case when length(public.partner_network_text(p_input->>'adjustment_reason'))>=10 then p_input->>'adjustment_reason' else 'Classic agreed profit policy and manager-approved tier snapshot applied prospectively.' end);
  end if;
 end if;
 result:=public.partner_network_reconcile_before_classic(p_order_id,input_value);
 select * into c from public.partner_network_commissions where order_id=p_order_id for update;
 if mode_value='price_difference' then base:=greatest(0,least(c.eligible_base,(q->>'goods_amount')::numeric)-(q->>'base_amount')::numeric);
  update public.partner_network_commissions set remuneration_mode=mode_value,remuneration_terms_snapshot=snapshot_value,classic_agreement_id=null,commission_base=base,calculated_amount=least(floor(base),round(base,0)) where id=c.id;
 elsif a is not null then
  update public.partner_network_commissions set remuneration_mode='commission',remuneration_terms_snapshot=snapshot_value,classic_agreement_id=(a->>'id')::uuid where id=c.id;
 end if;
 update public.partner_network_order_reviews set remuneration_mode=mode_value,remuneration_terms_snapshot=snapshot_value where order_id=p_order_id;
 update public.partner_network_commissions set fingerprint=public.partner_network_fingerprint(p_order_id,c.referral_id) where id=c.id;
 return public.partner_network_commission_view(c.id);
end $$;

-- Month is Vietnam civil time. Only verified linked orders can contribute.
create function public.partner_network_reward_month(p_partner_id uuid,p_month date) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare rule_value public.partner_network_reward_rules;orders_value jsonb;count_value integer;amount_value numeric:=0;multiplier_value numeric:=1;tier jsonb;month_start date:=date_trunc('month',p_month)::date;
begin
 select * into rule_value from public.partner_network_reward_rules where partner_id=p_partner_id and effective_month<=month_start order by effective_month desc,version desc limit 1;
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
create function public.partner_network_reward_rule(p_partner_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare version_value integer;month_value date;reason_value text;thresholds_value jsonb;t jsonb;previous_count integer:=0;previous_amount numeric:=0;result public.partner_network_reward_rules;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['effective_month','thresholds','enabled','reason','expected_version']) or jsonb_typeof(p_input->'enabled') is distinct from 'boolean' then raise exception 'invalid_reward_rule';end if;
 perform 1 from public.partner_network_partners where id=p_partner_id and status='approved' for update;if not found then raise exception 'partner_not_approved';end if;
 select coalesce(max(version),0) into version_value from public.partner_network_reward_rules where partner_id=p_partner_id;
 if jsonb_typeof(p_input->'expected_version') is distinct from 'number' or (p_input->>'expected_version')::numeric<>version_value then raise exception 'reward_rule_changed';end if;
 month_value:=(p_input->>'effective_month')::date;reason_value:=public.partner_network_text(p_input->>'reason');thresholds_value:=p_input->'thresholds';
 if month_value is null or extract(day from month_value)<>1 or month_value<date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date
  or month_value>(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')+interval '1 year')::date or length(reason_value) not between 10 and 1000
  or jsonb_typeof(thresholds_value) is distinct from 'array' or jsonb_array_length(thresholds_value)>20 or (p_input->'enabled'='true'::jsonb and jsonb_array_length(thresholds_value)=0) then raise exception 'invalid_reward_rule';end if;
 for t in select value from jsonb_array_elements(thresholds_value) loop
  if not public.partner_network_input_keys(t,array['minimum_orders','amount']) or jsonb_typeof(t->'minimum_orders') is distinct from 'number' or jsonb_typeof(t->'amount') is distinct from 'number'
   or (t->>'minimum_orders')::numeric<>trunc((t->>'minimum_orders')::numeric) or (t->>'minimum_orders')::numeric<=previous_count or (t->>'minimum_orders')::numeric>100000
   or (t->>'amount')::numeric<>trunc((t->>'amount')::numeric) or (t->>'amount')::numeric<=previous_amount or (t->>'amount')::numeric>999999999999 then raise exception 'invalid_reward_rule';end if;
  previous_count:=(t->>'minimum_orders')::integer;previous_amount:=(t->>'amount')::numeric;
 end loop;
 insert into public.partner_network_reward_rules(partner_id,version,effective_month,thresholds,enabled,reason,created_by)
 values(p_partner_id,version_value+1,month_value,thresholds_value,(p_input->>'enabled')::boolean,reason_value,auth.uid()) returning * into result;
 return to_jsonb(result);
end $$;
create function public.partner_network_reward_create(p_partner_id uuid,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare month_value date;kind_value text;reason_value text;reference_value text;amount_value numeric;data_value jsonb;result public.partner_network_rewards;request_value uuid;request_hash text;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['kind','month','amount','reason','reference','request_id']) then raise exception 'invalid_reward';end if;
 request_value:=coalesce((p_input->>'request_id')::uuid,gen_random_uuid());
 request_hash:=md5(jsonb_build_array(p_partner_id,p_input-'request_id')::text);
 perform pg_advisory_xact_lock(hashtextextended('partner-reward:'||request_value::text,0));
 select * into result from public.partner_network_rewards where request_id=request_value;
 if found then
  if result.partner_id<>p_partner_id or result.request_fingerprint is distinct from request_hash then raise exception 'reward_request_conflict';end if;
  return public.partner_network_reward_view(result.id);
 end if;
 perform 1 from public.partner_network_partners where id=p_partner_id and status='approved' for update;if not found then raise exception 'partner_not_approved';end if;
 kind_value:=p_input->>'kind';month_value:=(p_input->>'month')::date;reason_value:=public.partner_network_text(p_input->>'reason');reference_value:=public.partner_network_text(p_input->>'reference');
 if kind_value not in ('monthly','personal') or month_value is null or extract(day from month_value)<>1 or length(reason_value) not between 10 and 1000 or length(reference_value)>240 then raise exception 'invalid_reward';end if;
 if kind_value='monthly' then
  if p_input ? 'amount' then raise exception 'monthly_reward_amount_is_calculated';end if;
  data_value:=public.partner_network_reward_month(p_partner_id,month_value);amount_value:=(data_value->>'estimated_amount')::numeric;
 else
  amount_value:=(p_input->>'amount')::numeric;data_value:=jsonb_build_object('month',month_value,'personal',true,'fingerprint',md5(jsonb_build_array(p_partner_id,month_value,amount_value,reason_value,reference_value)::text));
 end if;
 if amount_value is null or amount_value<=0 or amount_value>999999999999 or amount_value<>trunc(amount_value) or amount_value::text in ('NaN','Infinity','-Infinity') then raise exception 'no_reward_due';end if;
 insert into public.partner_network_rewards(request_id,request_fingerprint,partner_id,kind,month,rule_id,amount,qualifying_orders,reason,reference,eligibility_snapshot,fingerprint,created_by)
 values(request_value,request_hash,p_partner_id,kind_value,month_value,(data_value->>'rule_id')::uuid,amount_value,coalesce((data_value->>'count')::integer,0),reason_value,reference_value,data_value,data_value->>'fingerprint',auth.uid()) returning * into result;
 return public.partner_network_reward_view(result.id);
end $$;
create function public.partner_network_reward_view(p_id uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_rewards;current_value jsonb;stale_value boolean;
begin
 select * into r from public.partner_network_rewards where id=p_id;if not found then return null;end if;
 if r.kind='monthly' then current_value:=public.partner_network_reward_month(r.partner_id,r.month);stale_value:=r.fingerprint is distinct from current_value->>'fingerprint';else stale_value:=false;end if;
 return jsonb_build_object('id',r.id,'partner_id',r.partner_id,'kind',r.kind,'month',r.month,'status',r.status,'amount',r.amount,'qualifying_orders',r.qualifying_orders,
  'reason',r.reason,'reference',r.reference,'created_at',r.created_at,'approved_at',r.approved_at,'paid_at',r.paid_at,'paid_reference',r.paid_reference,'stale',stale_value,
  'current_qualifying_orders',case when r.kind='monthly' then current_value->'count' else null end,'current_estimated_amount',case when r.kind='monthly' then current_value->'estimated_amount' else null end);
end $$;
create function public.partner_network_reward_action(p_id uuid,p_action text,p_input jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_rewards;view_value jsonb;paid_date timestamptz;reference_value text;reason_value text;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if p_action not in ('approve','pay','void') or not public.partner_network_input_keys(p_input,array['reason','amount','reference','paid_at']) then raise exception 'invalid_reward_action';end if;
 select * into r from public.partner_network_rewards where id=p_id;if not found then raise exception 'reward_not_found';end if;
 -- Freeze every currently attributed source order/receivable while reviewing/payment.
 perform 1 from public.orders o join public.partner_network_order_links l on l.order_id=o.id join public.partner_network_referrals f on f.id=l.referral_id where f.partner_id=r.partner_id order by o.id for update of o;
 perform 1 from public.receivables v join public.partner_network_order_links l on l.order_id=v.order_id join public.partner_network_referrals f on f.id=l.referral_id where f.partner_id=r.partner_id order by v.order_id for update of v;
 perform 1 from public.partner_network_partners where id=r.partner_id for update;
 select * into r from public.partner_network_rewards where id=p_id for update;
 if r.status='paid' then raise exception 'paid_reward_immutable';end if;
 view_value:=public.partner_network_reward_view(r.id);
 if p_action<>'void' and (view_value->>'stale')::boolean then raise exception 'reward_stale_recreate_required';end if;
 if p_action in ('approve','pay') and r.kind='monthly' and r.month>=date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'reward_month_not_closed';end if;
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
-- No generic caller may request another partner's private agreements or rewards.
create function public.partner_network_rewards_snapshot(p_partner_id uuid default null) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare partner_value uuid:=p_partner_id;manager_value boolean:=public.is_staff_manager();result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 if not manager_value then
  select id into partner_value from public.partner_network_partners where user_id=auth.uid();
  if partner_value is null then return jsonb_build_object('classic_agreements','[]'::jsonb,'monthly_rules','[]'::jsonb,'rewards','[]'::jsonb,'monthly_previews','[]'::jsonb);end if;
  if p_partner_id is not null and p_partner_id<>partner_value then raise exception 'own_partner_required';end if;
 end if;
 select jsonb_build_object(
  'tiers',case when manager_value then coalesce((select jsonb_agg(to_jsonb(t)-'created_by'-'reason') from public.partner_network_classic_tiers t),'[]'::jsonb) else '[]'::jsonb end,
  'tier_eligibility',case when manager_value then coalesce((select jsonb_agg(jsonb_build_object('partner_id',p.id)||public.partner_network_tier_eligibility(p.id,t.id)) from public.partner_network_partners p cross join public.partner_network_classic_tiers t where p.status='approved' and t.enabled and (partner_value is null or p.id=partner_value)),'[]'::jsonb) else '[]'::jsonb end,
  'classic_agreements',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'partner_id',a.partner_id,'version',a.version,'effective_at',a.effective_at,'first_rate',a.first_rate,'repeat_rate',a.repeat_rate,'repeat_after',a.repeat_after,'basis',a.basis,'tier_id',a.tier_id,'tier_name',a.tier_snapshot->>'name','monthly_bonus_multiplier',a.monthly_bonus_multiplier) order by a.version desc) from public.partner_network_classic_agreements a where partner_value is null or a.partner_id=partner_value),'[]'::jsonb),
  'monthly_rules',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'partner_id',r.partner_id,'version',r.version,'effective_month',r.effective_month,'thresholds',r.thresholds,'enabled',r.enabled) order by r.version desc) from public.partner_network_reward_rules r where partner_value is null or r.partner_id=partner_value),'[]'::jsonb),
  'rewards',coalesce((select jsonb_agg(public.partner_network_reward_view(r.id) order by r.month desc,r.created_at desc) from public.partner_network_rewards r where partner_value is null or r.partner_id=partner_value),'[]'::jsonb),
  'monthly_previews',coalesce((select jsonb_agg(jsonb_build_object('partner_id',p.id)||
   (public.partner_network_reward_month(p.id,m.month::date)-'orders'-'fingerprint')) from public.partner_network_partners p cross join lateral generate_series(date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh')-interval '2 months',date_trunc('month',now() at time zone 'Asia/Ho_Chi_Minh'),interval '1 month')m(month)
   where p.status='approved' and (partner_value is null or p.id=partner_value)),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.partner_network_tier_eligibility(uuid,uuid),public.partner_network_record_completion(),public.partner_network_classic_for_order(text),public.partner_network_classic_order_index(text,uuid),
 public.partner_network_price_difference_terms(text),public.partner_network_fingerprint_before_classic(text,uuid),public.partner_network_commission_view_before_classic(uuid),
 public.partner_network_reconcile_before_classic(text,jsonb),public.partner_network_fingerprint(text,uuid),public.partner_network_commission_view(uuid),
 public.partner_network_reward_month(uuid,date),public.partner_network_reward_view(uuid) from public,anon,authenticated;
revoke all on function public.partner_network_tier_create(jsonb),public.partner_network_tier_state(uuid,jsonb),public.partner_network_apply_classic(uuid,jsonb),public.partner_network_reconcile(text,jsonb),public.partner_network_reward_rule(uuid,jsonb),
 public.partner_network_reward_create(uuid,jsonb),public.partner_network_reward_action(uuid,text,jsonb),public.partner_network_rewards_snapshot(uuid) from public,anon;
grant execute on function public.partner_network_tier_create(jsonb),public.partner_network_tier_state(uuid,jsonb),public.partner_network_apply_classic(uuid,jsonb),public.partner_network_reconcile(text,jsonb),public.partner_network_reward_rule(uuid,jsonb),
 public.partner_network_reward_create(uuid,jsonb),public.partner_network_reward_action(uuid,text,jsonb),public.partner_network_rewards_snapshot(uuid) to authenticated;
commit;
