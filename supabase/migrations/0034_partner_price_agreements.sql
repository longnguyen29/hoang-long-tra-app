-- Versioned customer-specific pricing for recurring wholesale partners.
-- Agreements are reusable defaults. Quotes and orders remain immutable snapshots.

create table if not exists partner_price_agreements (
  id text primary key,
  opportunity_id text not null references trade_opportunities(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'active' check (status in ('active', 'superseded')),
  effective_from date not null default current_date,
  valid_until date,
  review_at date,
  includes_vat boolean not null default false,
  includes_delivery boolean not null default false,
  payment_terms text not null default '',
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  constraint partner_price_agreements_dates check (valid_until is null or valid_until >= effective_from),
  constraint partner_price_agreements_unique_version unique (opportunity_id, version)
);

create table if not exists partner_price_rules (
  id text primary key,
  agreement_id text not null references partner_price_agreements(id) on delete cascade,
  product_id text not null references catalog_products(id) on delete restrict,
  variant_weight text not null default '',
  product_name jsonb not null default '{}'::jsonb,
  unit text not null default 'kg',
  minimum_quantity numeric(12,2) not null default 1 check (minimum_quantity > 0),
  price numeric(14,2) not null check (price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint partner_price_rules_unique_product unique (agreement_id, product_id, variant_weight)
);

create unique index if not exists partner_price_agreements_one_active_idx
  on partner_price_agreements(opportunity_id) where status = 'active';
create index if not exists partner_price_agreements_review_idx
  on partner_price_agreements(review_at) where status = 'active';
create index if not exists partner_price_rules_agreement_idx
  on partner_price_rules(agreement_id, sort_order);

alter table partner_price_agreements enable row level security;
alter table partner_price_rules enable row level security;

drop policy if exists "partner_price_agreements: staff select" on partner_price_agreements;
drop policy if exists "partner_price_agreements: staff insert" on partner_price_agreements;
drop policy if exists "partner_price_rules: staff select" on partner_price_rules;
drop policy if exists "partner_price_rules: staff insert" on partner_price_rules;
create policy "partner_price_agreements: staff select" on partner_price_agreements for select using (is_staff());
create policy "partner_price_agreements: staff insert" on partner_price_agreements for insert with check (is_staff());
create policy "partner_price_rules: staff select" on partner_price_rules for select using (is_staff());
create policy "partner_price_rules: staff insert" on partner_price_rules for insert with check (is_staff());
-- Price history is commercial evidence. New versions supersede old versions; rows are not edited or deleted.

create or replace function create_partner_price_agreement(
  p_opportunity_id text,
  p_effective_from date,
  p_valid_until date,
  p_review_at date,
  p_includes_vat boolean,
  p_includes_delivery boolean,
  p_payment_terms text,
  p_note text,
  p_created_by text,
  p_rules jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agreement_id text;
  v_version integer;
  v_rule jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if not exists (select 1 from trade_opportunities where id = p_opportunity_id) then raise exception 'opportunity_not_found'; end if;
  if jsonb_typeof(p_rules) <> 'array' or jsonb_array_length(p_rules) = 0 then raise exception 'price_rules_required'; end if;
  if p_valid_until is not null and p_valid_until < p_effective_from then raise exception 'invalid_validity'; end if;

  perform pg_advisory_xact_lock(hashtext(p_opportunity_id));
  select coalesce(max(version), 0) + 1 into v_version
  from partner_price_agreements where opportunity_id = p_opportunity_id;

  update partner_price_agreements
  set status = 'superseded', superseded_at = now()
  where opportunity_id = p_opportunity_id and status = 'active';

  v_agreement_id := 'price-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 4);
  insert into partner_price_agreements (
    id, opportunity_id, version, effective_from, valid_until, review_at,
    includes_vat, includes_delivery, payment_terms, note, created_by
  ) values (
    v_agreement_id, p_opportunity_id, v_version, coalesce(p_effective_from, current_date), p_valid_until, p_review_at,
    coalesce(p_includes_vat, false), coalesce(p_includes_delivery, false), coalesce(p_payment_terms, ''), coalesce(p_note, ''), coalesce(p_created_by, '')
  );

  for v_rule in select value from jsonb_array_elements(p_rules)
  loop
    if nullif(v_rule->>'product_id', '') is null or coalesce((v_rule->>'price')::numeric, -1) < 0 then
      raise exception 'invalid_price_rule';
    end if;
    insert into partner_price_rules (
      id, agreement_id, product_id, variant_weight, product_name, unit,
      minimum_quantity, price, sort_order
    ) values (
      'rule-' || substr(md5(v_agreement_id || v_rule::text || random()::text), 1, 20),
      v_agreement_id,
      v_rule->>'product_id',
      coalesce(v_rule->>'variant_weight', ''),
      coalesce(v_rule->'product_name', '{}'::jsonb),
      coalesce(nullif(v_rule->>'unit', ''), 'kg'),
      greatest(coalesce((v_rule->>'minimum_quantity')::numeric, 1), 0.01),
      (v_rule->>'price')::numeric,
      coalesce((v_rule->>'sort_order')::integer, 0)
    );
  end loop;

  return v_agreement_id;
end;
$$;

revoke all on function create_partner_price_agreement(text, date, date, date, boolean, boolean, text, text, text, jsonb) from public;
grant execute on function create_partner_price_agreement(text, date, date, date, boolean, boolean, text, text, text, jsonb) to authenticated;
