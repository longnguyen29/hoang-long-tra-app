begin;

create table public.business_growth_plans (
  period date primary key check (extract(day from period) = 1),
  targets jsonb not null check (jsonb_typeof(targets) = 'object'),
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object'),
  focus text not null default '' check (char_length(focus) <= 600),
  version integer not null default 1 check (version >= 1),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.business_growth_plans enable row level security;
revoke all on public.business_growth_plans from public, anon, authenticated;
grant select, insert, update on public.business_growth_plans to service_role;

create function public.business_growth_snapshot(p_period date)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with periods as (
  select month_start::date as period,
    month_start at time zone 'Asia/Ho_Chi_Minh' as starts,
    least((month_start + interval '1 month') at time zone 'Asia/Ho_Chi_Minh', now()) as ends
  from generate_series(
    (p_period - interval '3 months')::timestamp,
    p_period::timestamp, interval '1 month'
  ) as months(month_start)
), recorded_payments as (
  select rp.receivable_id, rp.amount, rp.paid_at, r.status, r.total, r.order_id
  from public.receivable_payments rp
  join public.receivables r on r.id = rp.receivable_id
  where r.status <> 'void' and rp.paid_at < (select max(ends) from periods)
), paid_wholesale_orders as (
  select
    coalesce(
      nullif(public.sample_followup_phone_key(o.contact), ''),
      case when o.contact like '%@%' then nullif(lower(btrim(o.contact)), '') end,
      o.partner_account_id
    ) as buyer_key,
    max(p.paid_at) as paid_at,
    o.id
  from recorded_payments p
  join public.orders o on o.id = p.order_id
  where o.type = 'wholesale' and p.status = 'paid'
  group by o.id
  having sum(p.amount) >= max(p.total)
), buyer_history as (
  select buyer_key, paid_at, row_number() over (partition by buyer_key order by paid_at, id) as order_number
  from paid_wholesale_orders
  where buyer_key is not null
)
select coalesce(jsonb_agg(jsonb_build_object(
  'period', p.period,
  'financialInputs', f.inputs,
  'orders', s.orders,
  'wholesaleOrders', s.wholesale_orders,
  'retailOrders', s.retail_orders,
  'completedOrders', s.completed_orders,
  'bookedValue', s.booked_value,
  'knownOrderValues', s.known_order_values,
  'wholesaleKg', s.wholesale_kg,
  'cashCollected', cash.amount,
  'prospects', pipeline.prospects,
  'sampleRequests', samples.requested,
  'samplesSent', samples.sent,
  'quotesSent', quotes.sent,
  'firstPaidBuyers', buyers.first_paid,
  'repeatPaidBuyers', buyers.repeat_paid,
  'activePaidBuyers', buyers.active_paid
) order by p.period desc), '[]'::jsonb)
from periods p
left join public.business_metric_periods f using (period)
cross join lateral (
  select count(*) as orders,
    count(*) filter (where type = 'wholesale') as wholesale_orders,
    count(*) filter (where type = 'retail') as retail_orders,
    count(*) filter (where status = 'completed') as completed_orders,
    sum(estimated_total) as booked_value, count(estimated_total) as known_order_values,
    sum(total_kg) filter (where type = 'wholesale') as wholesale_kg
  from public.orders o
  where o.ts >= p.starts and o.ts < p.ends and o.status in ('pending','confirmed','shipped','completed')
) s
cross join lateral (
  select sum(amount) as amount from recorded_payments rp where rp.paid_at >= p.starts and rp.paid_at < p.ends
) cash
cross join lateral (
  select count(*) as prospects from public.trade_opportunities o where o.created_at >= p.starts and o.created_at < p.ends
) pipeline
cross join lateral (
  select
    (select count(*) from public.sample_requests sr where sr.ts >= p.starts and sr.ts < p.ends) as requested,
    (select count(*) from public.sample_requests sr where sr.sent_at >= p.starts and sr.sent_at < p.ends) as sent
) samples
cross join lateral (
  select count(*) as sent from public.trade_quotes q where q.sent_at >= p.starts and q.sent_at < p.ends
) quotes
cross join lateral (
  select count(*) filter (where order_number = 1) as first_paid,
    count(distinct buyer_key) filter (where order_number > 1) as repeat_paid,
    count(distinct buyer_key) as active_paid
  from buyer_history h where h.paid_at >= p.starts and h.paid_at < p.ends
) buyers;
$$;

revoke all on function public.business_growth_snapshot(date) from public, anon, authenticated;
grant execute on function public.business_growth_snapshot(date) to service_role;
grant execute on function public.sample_followup_phone_key(text) to service_role;
notify pgrst, 'reload schema';
commit;
