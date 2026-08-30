-- Global Menu Radar: evidence collection before ideas enter Recipe Lab.
-- Additive only. Sources and scoring remain explainable; promotion requires a staff action.

create table if not exists recipe_radar_queries (
  id text primary key,
  label text not null,
  category text not null default 'menu-launch',
  search_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(search_terms) = 'object'),
  markets jsonb not null default '["US","JP","KR","TH","SG","TW","VN"]'::jsonb check (jsonb_typeof(markets) = 'array'),
  active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_radar_signals (
  id text primary key,
  query_id text references recipe_radar_queries(id) on delete set null,
  source text not null check (source in ('google-news', 'youtube', 'reddit', 'manual')),
  source_item_id text not null default '',
  url text not null,
  title text not null,
  excerpt text not null default '',
  publisher text not null default '',
  author text not null default '',
  published_at timestamptz not null default now(),
  collected_at timestamptz not null default now(),
  region text not null default '',
  language text not null default '',
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  concept_key text not null,
  concept_name text not null,
  category text not null default 'menu-launch',
  tea_fit integer not null default 50 check (tea_fit between 0 and 100),
  feasibility integer not null default 50 check (feasibility between 0 and 100),
  manual_notes text not null default '',
  created_by text not null default ''
);

create table if not exists recipe_radar_concepts (
  id text primary key,
  canonical_key text not null unique,
  name text not null,
  category text not null default 'menu-launch',
  summary text not null default '',
  stage text not null default 'watch' check (stage in ('watch', 'rising', 'candidate', 'testing', 'dismissed')),
  score_total integer not null default 0 check (score_total between 0 and 100),
  score_velocity integer not null default 0 check (score_velocity between 0 and 100),
  score_cross_market integer not null default 0 check (score_cross_market between 0 and 100),
  score_vietnam_gap integer not null default 0 check (score_vietnam_gap between 0 and 100),
  score_tea_fit integer not null default 0 check (score_tea_fit between 0 and 100),
  score_feasibility integer not null default 0 check (score_feasibility between 0 and 100),
  signal_count integer not null default 0 check (signal_count >= 0),
  market_count integer not null default 0 check (market_count >= 0),
  regions jsonb not null default '[]'::jsonb check (jsonb_typeof(regions) = 'array'),
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  promoted_recipe_id text references recipes(id) on delete set null,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_radar_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'manual' check (mode in ('manual', 'scheduled', 'manual-signal')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  query_count integer not null default 0,
  signal_count integer not null default 0,
  new_signal_count integer not null default 0,
  concept_count integer not null default 0,
  source_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(source_summary) = 'object'),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  triggered_by text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists recipe_radar_signals_concept_idx on recipe_radar_signals(concept_key, published_at desc);
create index if not exists recipe_radar_signals_region_idx on recipe_radar_signals(region, published_at desc);
create index if not exists recipe_radar_concepts_stage_idx on recipe_radar_concepts(stage, score_total desc, last_seen_at desc);
create index if not exists recipe_radar_runs_started_idx on recipe_radar_runs(started_at desc);

alter table recipe_radar_queries enable row level security;
alter table recipe_radar_signals enable row level security;
alter table recipe_radar_concepts enable row level security;
alter table recipe_radar_runs enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['recipe_radar_queries','recipe_radar_signals','recipe_radar_concepts','recipe_radar_runs'] loop
    execute format('drop policy if exists "%s: staff select" on %I', table_name, table_name);
    execute format('drop policy if exists "%s: staff insert" on %I', table_name, table_name);
    execute format('drop policy if exists "%s: staff update" on %I', table_name, table_name);
    execute format('drop policy if exists "%s: staff delete" on %I', table_name, table_name);
    execute format('create policy "%s: staff select" on %I for select using (is_staff())', table_name, table_name);
    execute format('create policy "%s: staff insert" on %I for insert to authenticated with check (is_staff())', table_name, table_name);
    execute format('create policy "%s: staff update" on %I for update using (is_staff()) with check (is_staff())', table_name, table_name);
    execute format('create policy "%s: staff delete" on %I for delete using (is_staff())', table_name, table_name);
  end loop;
end $$;

insert into recipe_radar_queries(id,label,category,search_terms,markets) values
  ('menu-launches','Menu trà mới','menu-launch',
   '{"en":"(new tea drink OR tea menu) cafe","ja":"新作 ティー ドリンク カフェ","ko":"신메뉴 티 음료 카페","th":"เมนูชาใหม่ คาเฟ่","zh":"新品 茶飲 咖啡店","vi":"món trà mới quán cà phê"}'::jsonb,
   '["US","JP","KR","TH","SG","TW","VN"]'::jsonb),
  ('tea-latte','Tea latte thế hệ mới','tea-latte',
   '{"en":"tea latte trend cafe","ja":"ティーラテ 新作 カフェ","ko":"티라떼 신메뉴 카페","th":"ชา ลาเต้ เมนูใหม่","zh":"茶拿鐵 新品","vi":"trà latte món mới"}'::jsonb,
   '["US","JP","KR","TH","SG","TW","VN"]'::jsonb),
  ('sparkling-tea','Trà sparkling & mocktail','sparkling',
   '{"en":"sparkling tea OR tea mocktail menu","ja":"ティーモクテル 炭酸茶","ko":"티 목테일 탄산차","th":"ชาม็อกเทล ชาโซดา","zh":"茶 氣泡飲 無酒精雞尾酒","vi":"trà sparkling mocktail trà"}'::jsonb,
   '["US","JP","KR","TH","SG","TW","VN"]'::jsonb),
  ('texture-tea','Foam, cream & trà tráng miệng','texture-dessert',
   '{"en":"tea cream foam dessert drink cafe","ja":"ティー クリームフォーム デザートドリンク","ko":"티 크림폼 디저트 음료","th":"ชา ครีมโฟม เครื่องดื่มของหวาน","zh":"茶 奶蓋 甜品飲品","vi":"trà kem foam đồ uống tráng miệng"}'::jsonb,
   '["US","JP","KR","TH","SG","TW","VN"]'::jsonb)
on conflict (id) do nothing;
