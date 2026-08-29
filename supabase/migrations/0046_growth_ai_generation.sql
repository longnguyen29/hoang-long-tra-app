-- Server-side OpenAI generation metadata and a durable per-user usage ledger.
begin;

alter table growth_experiments add column if not exists generation_model text not null default '';
alter table growth_variants add column if not exists ai_rationale text not null default '';
alter table growth_variants add column if not exists generation_model text not null default '';

create table if not exists growth_ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null default 'generate_variants',
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  created_at timestamptz not null default now()
);

create index if not exists growth_ai_runs_user_created_idx
  on growth_ai_runs(user_id, created_at desc);

alter table growth_ai_runs enable row level security;

commit;
