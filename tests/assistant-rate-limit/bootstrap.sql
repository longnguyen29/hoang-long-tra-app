create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table public.growth_ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  action text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
