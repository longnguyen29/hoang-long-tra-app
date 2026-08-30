-- Recipe Lab: connected B2B drink development and reproducible test versions.
-- Additive only. Existing products, samples, customers, quotes and orders remain untouched.

create table if not exists recipes (
  id text primary key,
  name text not null,
  purpose text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'testing', 'customer_test', 'approved', 'archived')),
  opportunity_id text references trade_opportunities(id) on delete set null,
  sample_request_id text references sample_requests(id) on delete set null,
  product_id text references catalog_products(id) on delete set null,
  batch_id text references tea_batches(id) on delete set null,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'customer', 'sample', 'radar')),
  source_reference text not null default '',
  source_url text not null default '',
  target_serving_ml numeric(10,2) check (target_serving_ml is null or target_serving_ml > 0),
  target_cost_per_serving numeric(14,2) check (target_cost_per_serving is null or target_cost_per_serving >= 0),
  target_sell_price numeric(14,2) check (target_sell_price is null or target_sell_price >= 0),
  notes text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_versions (
  id text primary key,
  recipe_id text not null references recipes(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  tested_at date not null default current_date,
  product_id text references catalog_products(id) on delete set null,
  batch_id text references tea_batches(id) on delete set null,
  tea_dose_g numeric(10,3) check (tea_dose_g is null or tea_dose_g >= 0),
  tea_cost_per_kg numeric(14,2) check (tea_cost_per_kg is null or tea_cost_per_kg >= 0),
  water_ml numeric(10,2) check (water_ml is null or water_ml >= 0),
  temperature_c numeric(5,2) check (temperature_c is null or temperature_c between 0 and 110),
  brew_seconds integer check (brew_seconds is null or brew_seconds >= 0),
  serving_ml numeric(10,2) check (serving_ml is null or serving_ml > 0),
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  cost_per_serving numeric(14,2) not null default 0 check (cost_per_serving >= 0),
  sensory jsonb not null default '{}'::jsonb,
  sensory_average numeric(4,2) check (sensory_average is null or sensory_average between 0 and 10),
  result text not null default 'retest' check (result in ('retest', 'pass', 'fail')),
  customer_feedback text not null default '',
  notes text not null default '',
  photo_url text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  constraint recipe_versions_unique_number unique (recipe_id, version_number),
  constraint recipe_versions_ingredients_array check (jsonb_typeof(ingredients) = 'array'),
  constraint recipe_versions_steps_array check (jsonb_typeof(steps) = 'array'),
  constraint recipe_versions_sensory_object check (jsonb_typeof(sensory) = 'object')
);

alter table recipes add column if not exists approved_version_id text;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'recipes_approved_version_fk'
  ) then
    alter table recipes add constraint recipes_approved_version_fk
      foreign key (approved_version_id) references recipe_versions(id) on delete set null;
  end if;
end $$;

create index if not exists recipes_status_idx on recipes(status, updated_at desc);
create index if not exists recipes_opportunity_idx on recipes(opportunity_id, updated_at desc);
create index if not exists recipes_sample_idx on recipes(sample_request_id, updated_at desc);
create index if not exists recipe_versions_recipe_idx on recipe_versions(recipe_id, version_number desc);

alter table recipes enable row level security;
alter table recipe_versions enable row level security;

drop policy if exists "recipes: staff select" on recipes;
drop policy if exists "recipes: staff insert" on recipes;
drop policy if exists "recipes: staff update" on recipes;
drop policy if exists "recipes: staff delete" on recipes;
create policy "recipes: staff select" on recipes for select using (is_staff());
create policy "recipes: staff insert" on recipes for insert to authenticated with check (is_staff());
create policy "recipes: staff update" on recipes for update using (is_staff()) with check (is_staff());
create policy "recipes: staff delete" on recipes for delete using (is_staff());

drop policy if exists "recipe_versions: staff select" on recipe_versions;
drop policy if exists "recipe_versions: staff insert" on recipe_versions;
drop policy if exists "recipe_versions: staff update" on recipe_versions;
drop policy if exists "recipe_versions: staff delete" on recipe_versions;
create policy "recipe_versions: staff select" on recipe_versions for select using (is_staff());
create policy "recipe_versions: staff insert" on recipe_versions for insert to authenticated with check (is_staff());
create policy "recipe_versions: staff update" on recipe_versions for update using (is_staff()) with check (is_staff());
create policy "recipe_versions: staff delete" on recipe_versions for delete using (is_staff());

create or replace function create_recipe_version(
  p_recipe_id text,
  p_payload jsonb,
  p_actor text default ''
)
returns recipe_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe recipes%rowtype;
  v_version recipe_versions%rowtype;
  v_number integer;
  v_id text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select * into v_recipe from recipes where id = p_recipe_id for update;
  if not found then raise exception 'recipe_not_found'; end if;

  select coalesce(max(version_number), 0) + 1 into v_number
  from recipe_versions where recipe_id = p_recipe_id;
  v_id := 'recipe-version-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(md5(random()::text), 1, 5);

  insert into recipe_versions (
    id, recipe_id, version_number, tested_at, product_id, batch_id,
    tea_dose_g, tea_cost_per_kg, water_ml, temperature_c, brew_seconds, serving_ml,
    ingredients, steps, cost_per_serving, sensory, sensory_average, result,
    customer_feedback, notes, photo_url, created_by
  ) values (
    v_id, p_recipe_id, v_number, coalesce(nullif(p_payload->>'tested_at', '')::date, current_date),
    nullif(p_payload->>'product_id', ''), nullif(p_payload->>'batch_id', ''),
    nullif(p_payload->>'tea_dose_g', '')::numeric,
    nullif(p_payload->>'tea_cost_per_kg', '')::numeric,
    nullif(p_payload->>'water_ml', '')::numeric,
    nullif(p_payload->>'temperature_c', '')::numeric,
    nullif(p_payload->>'brew_seconds', '')::integer,
    nullif(p_payload->>'serving_ml', '')::numeric,
    coalesce(p_payload->'ingredients', '[]'::jsonb),
    coalesce(p_payload->'steps', '[]'::jsonb),
    coalesce(nullif(p_payload->>'cost_per_serving', '')::numeric, 0),
    coalesce(p_payload->'sensory', '{}'::jsonb),
    nullif(p_payload->>'sensory_average', '')::numeric,
    case when p_payload->>'result' in ('retest', 'pass', 'fail') then p_payload->>'result' else 'retest' end,
    coalesce(p_payload->>'customer_feedback', ''),
    coalesce(p_payload->>'notes', ''),
    coalesce(p_payload->>'photo_url', ''),
    p_actor
  ) returning * into v_version;

  update recipes set
    product_id = coalesce(v_version.product_id, product_id),
    batch_id = coalesce(v_version.batch_id, batch_id),
    status = 'testing',
    updated_at = now()
  where id = p_recipe_id;

  return v_version;
end;
$$;

create or replace function approve_recipe_version(
  p_recipe_id text,
  p_version_id text,
  p_actor text default ''
)
returns recipes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe recipes%rowtype;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if not exists (
    select 1 from recipe_versions where id = p_version_id and recipe_id = p_recipe_id
  ) then raise exception 'version_not_found'; end if;

  update recipe_versions set result = 'pass' where id = p_version_id;
  update recipes set approved_version_id = p_version_id, status = 'approved', updated_at = now()
  where id = p_recipe_id returning * into v_recipe;
  if not found then raise exception 'recipe_not_found'; end if;
  return v_recipe;
end;
$$;

revoke all on function create_recipe_version(text, jsonb, text) from public;
revoke all on function approve_recipe_version(text, text, text) from public;
grant execute on function create_recipe_version(text, jsonb, text) to authenticated;
grant execute on function approve_recipe_version(text, text, text) to authenticated;
