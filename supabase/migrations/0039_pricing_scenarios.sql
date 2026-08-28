-- Versioned price calculations for catalogue and partner decisions.
-- A scenario is evidence, not a live price: applying it is always a separate staff action.

create table if not exists pricing_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  product_id text references catalog_products(id) on delete set null,
  variant_weight text not null default '',
  opportunity_id text references trade_opportunities(id) on delete set null,
  channel text not null default 'b2b' check (channel in ('b2b', 'retail')),
  inputs jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'applied')),
  applied_to text not null default '' check (applied_to in ('', 'catalogue', 'partner_price')),
  applied_reference text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz
);

create index if not exists pricing_scenarios_product_idx
  on pricing_scenarios(product_id, updated_at desc);
create index if not exists pricing_scenarios_opportunity_idx
  on pricing_scenarios(opportunity_id, updated_at desc);
create index if not exists pricing_scenarios_status_idx
  on pricing_scenarios(status, updated_at desc);

alter table pricing_scenarios enable row level security;

drop policy if exists "pricing_scenarios: staff select" on pricing_scenarios;
create policy "pricing_scenarios: staff select" on pricing_scenarios
  for select using (is_staff());
drop policy if exists "pricing_scenarios: staff insert" on pricing_scenarios;
create policy "pricing_scenarios: staff insert" on pricing_scenarios
  for insert to authenticated with check (is_staff() and created_by = auth.uid());
drop policy if exists "pricing_scenarios: staff update" on pricing_scenarios;
create policy "pricing_scenarios: staff update" on pricing_scenarios
  for update using (is_staff()) with check (is_staff());

create or replace function save_pricing_scenario(
  p_id uuid,
  p_name text,
  p_product_id text,
  p_variant_weight text,
  p_opportunity_id text,
  p_channel text,
  p_inputs jsonb,
  p_results jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if btrim(coalesce(p_name, '')) = '' then raise exception 'name_required'; end if;
  if p_channel not in ('b2b', 'retail') then raise exception 'invalid_channel'; end if;
  if p_product_id is not null and not exists(select 1 from catalog_products where id = p_product_id) then raise exception 'product_not_found'; end if;
  if p_opportunity_id is not null and not exists(select 1 from trade_opportunities where id = p_opportunity_id) then raise exception 'opportunity_not_found'; end if;

  if p_id is null then
    insert into pricing_scenarios(name, product_id, variant_weight, opportunity_id, channel, inputs, results)
    values(
      btrim(p_name), p_product_id, coalesce(p_variant_weight, ''), p_opportunity_id,
      p_channel, coalesce(p_inputs, '{}'::jsonb), coalesce(p_results, '{}'::jsonb)
    ) returning id into v_id;
  else
    update pricing_scenarios set
      name = btrim(p_name),
      product_id = p_product_id,
      variant_weight = coalesce(p_variant_weight, ''),
      opportunity_id = p_opportunity_id,
      channel = p_channel,
      inputs = coalesce(p_inputs, '{}'::jsonb),
      results = coalesce(p_results, '{}'::jsonb),
      updated_at = now()
    where id = p_id and status = 'draft'
    returning id into v_id;
    if v_id is null then raise exception 'draft_scenario_not_found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function mark_pricing_scenario_applied(
  p_id uuid,
  p_applied_to text,
  p_applied_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_applied_to not in ('catalogue', 'partner_price') then raise exception 'invalid_application_target'; end if;
  update pricing_scenarios set
    status = 'applied',
    applied_to = p_applied_to,
    applied_reference = btrim(coalesce(p_applied_reference, '')),
    applied_at = now(),
    updated_at = now()
  where id = p_id;
  if not found then raise exception 'scenario_not_found'; end if;
end;
$$;

revoke all on function save_pricing_scenario(uuid,text,text,text,text,text,jsonb,jsonb) from public;
revoke all on function save_pricing_scenario(uuid,text,text,text,text,text,jsonb,jsonb) from anon;
grant execute on function save_pricing_scenario(uuid,text,text,text,text,text,jsonb,jsonb) to authenticated;
revoke all on function mark_pricing_scenario_applied(uuid,text,text) from public;
revoke all on function mark_pricing_scenario_applied(uuid,text,text) from anon;
grant execute on function mark_pricing_scenario_applied(uuid,text,text) to authenticated;
