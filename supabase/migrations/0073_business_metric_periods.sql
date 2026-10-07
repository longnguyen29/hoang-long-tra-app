-- Private monthly management inputs. Order estimates remain separate context;
-- this table is not an accounting ledger and does not change order data.
begin;

create or replace function public.business_metric_inputs_valid(p_inputs jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_keys constant text[] := array[
    'netRevenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome',
    'otherExpenses', 'depreciationAmortization', 'interestExpense', 'incomeTax'
  ];
  v_key text;
  v_value jsonb;
begin
  if jsonb_typeof(p_inputs) is distinct from 'object' then return false; end if;
  if not (p_inputs ?& v_keys) then return false; end if;
  for v_key, v_value in select key, value from jsonb_each(p_inputs) loop
    if not (v_key = any(v_keys)) then return false; end if;
    if v_value <> 'null'::jsonb then
      if jsonb_typeof(v_value) <> 'number' then return false; end if;
      if (v_value #>> '{}')::numeric < 0
        or (v_value #>> '{}')::numeric > 1000000000000000 then
        return false;
      end if;
    end if;
  end loop;
  return true;
end;
$$;

revoke all on function public.business_metric_inputs_valid(jsonb) from public, anon, authenticated;

create table if not exists public.business_metric_periods (
  period date primary key check (isfinite(period) and extract(day from period) = 1),
  inputs jsonb not null default '{"netRevenue":null,"costOfGoodsSold":null,"operatingExpenses":null,"otherIncome":null,"otherExpenses":null,"depreciationAmortization":null,"interestExpense":null,"incomeTax":null}'::jsonb
    check (public.business_metric_inputs_valid(inputs)),
  notes text not null default '' check (char_length(notes) <= 3000),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  updated_by uuid not null default auth.uid() references auth.users(id) on delete restrict
);

alter table public.business_metric_periods enable row level security;

drop policy if exists "business_metric_periods: manager select" on public.business_metric_periods;
create policy "business_metric_periods: manager select"
  on public.business_metric_periods
  for select to authenticated
  using (public.is_staff_manager());

-- All application writes go through the checked, versioned RPC. An employee or
-- public website visitor cannot read financial inputs or write around the RPC.
revoke all on public.business_metric_periods from public, anon, authenticated;
grant select on public.business_metric_periods to authenticated;

create or replace function public.save_business_metric_period(
  p_period date,
  p_inputs jsonb,
  p_notes text,
  p_expected_version integer
)
returns setof public.business_metric_periods
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or not public.is_staff_manager() then
    raise exception 'manager_required';
  end if;
  if p_period is null or not isfinite(p_period) or extract(day from p_period) <> 1 then
    raise exception 'invalid_metric_period';
  end if;
  if not public.business_metric_inputs_valid(p_inputs) then
    raise exception 'invalid_metric_inputs';
  end if;
  if char_length(coalesce(p_notes, '')) > 3000 then
    raise exception 'invalid_metric_notes';
  end if;
  if p_expected_version is not null and p_expected_version < 1 then
    raise exception 'invalid_metric_version';
  end if;

  if p_expected_version is null then
    -- A null expected version means the caller loaded an absent month. If
    -- someone creates it meanwhile, preserve their work instead of overwriting.
    return query
      insert into public.business_metric_periods as metric (
        period, inputs, notes, created_by, updated_by
      ) values (
        p_period, p_inputs, coalesce(p_notes, ''), auth.uid(), auth.uid()
      )
      on conflict (period) do nothing
      returning metric.*;
  else
    -- PostgreSQL rechecks the version predicate after a concurrent writer's
    -- row lock is released, so only one caller can save a given version.
    return query
      update public.business_metric_periods as metric
      set inputs = p_inputs,
          notes = coalesce(p_notes, ''),
          version = metric.version + 1,
          updated_at = now(),
          updated_by = auth.uid()
      where metric.period = p_period and metric.version = p_expected_version
      returning metric.*;
  end if;

  if not found then raise exception 'metric_conflict'; end if;
end;
$$;

revoke all on function public.save_business_metric_period(date, jsonb, text, integer)
  from public, anon, authenticated;
grant execute on function public.save_business_metric_period(date, jsonb, text, integer)
  to authenticated;

commit;
