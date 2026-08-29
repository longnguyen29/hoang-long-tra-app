-- Hoàng Long Growth Lab: controlled content experiments tied to the sample-to-order funnel.
-- The lab never rewrites its own prompt. New versions and learnings remain explicit rows
-- that staff can review, compare and activate deliberately.

create table if not exists growth_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  name text not null,
  instruction text not null,
  rubric jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  change_reason text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists growth_prompt_versions_one_active
  on growth_prompt_versions(status) where status = 'active';

create table if not exists growth_experiments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  objective text not null default 'qualified_sample_request',
  audience text not null default '',
  customer_problem text not null default '',
  angle text not null default '',
  proof text not null default '',
  offer text not null default '',
  cta text not null default '',
  hypothesis text not null default '',
  prompt_version_id uuid references growth_prompt_versions(id) on delete set null,
  generated_prompt text not null default '',
  status text not null default 'draft' check (status in ('draft', 'running', 'review', 'complete', 'archived')),
  review_on date,
  conclusion text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists growth_variants (
  id uuid primary key default gen_random_uuid(),
  experiment_id uuid not null references growth_experiments(id) on delete cascade,
  label text not null,
  tracking_code text not null unique check (tracking_code ~ '^[a-z0-9-]{4,40}$'),
  post_text text not null default '',
  judge_scores jsonb not null default '{}'::jsonb check (jsonb_typeof(judge_scores) = 'object'),
  judge_notes jsonb not null default '[]'::jsonb check (jsonb_typeof(judge_notes) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'ready', 'published', 'paused', 'reviewed')),
  threads_post_url text not null default '',
  published_at timestamptz,
  manual_metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(manual_metrics) = 'object'),
  learning text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists growth_experiments_status_idx on growth_experiments(status, created_at desc);
create index if not exists growth_variants_experiment_idx on growth_variants(experiment_id, created_at);

alter table growth_prompt_versions enable row level security;
alter table growth_experiments enable row level security;
alter table growth_variants enable row level security;

create policy "growth_prompt_versions: staff select" on growth_prompt_versions for select using (is_staff());
create policy "growth_prompt_versions: manager insert" on growth_prompt_versions for insert
  with check (is_staff_manager() and (created_by is null or created_by = auth.uid()));
create policy "growth_prompt_versions: manager update" on growth_prompt_versions for update
  using (is_staff_manager()) with check (is_staff_manager());

create policy "growth_experiments: staff select" on growth_experiments for select using (is_staff());
create policy "growth_experiments: staff insert" on growth_experiments for insert
  with check (is_staff() and created_by = auth.uid());
create policy "growth_experiments: staff update" on growth_experiments for update
  using (is_staff()) with check (is_staff());

create policy "growth_variants: staff select" on growth_variants for select using (is_staff());
create policy "growth_variants: staff insert" on growth_variants for insert
  with check (is_staff() and exists (
    select 1 from growth_experiments experiment
    where experiment.id = experiment_id and experiment.created_by = auth.uid()
  ));
create policy "growth_variants: staff update" on growth_variants for update
  using (is_staff()) with check (is_staff());

insert into growth_prompt_versions(version, name, instruction, rubric, change_reason, status)
values (
  1,
  'Bài Threads dẫn tới bộ mẫu',
  'Viết cho chủ quán hoặc người làm menu. Dẫn họ tới một lần thử thật tại quầy; không tối ưu cho tương tác chung chung, không bịa bằng chứng và không ép mua.',
  '[{"key":"audience","label":"Đúng người đọc"},{"key":"hook","label":"Mở bài"},{"key":"menu","label":"Liên quan công thức"},{"key":"proof","label":"Bằng chứng"},{"key":"cta","label":"Bước tiếp theo"},{"key":"voice","label":"Giọng Hoàng Long"}]'::jsonb,
  'Phiên bản đầu tiên: đo yêu cầu sample đủ điều kiện thay vì lượt thích.',
  'active'
)
on conflict (version) do nothing;

alter table page_views add column if not exists growth_variant_id uuid references growth_variants(id) on delete set null;
alter table sample_requests add column if not exists growth_variant_id uuid references growth_variants(id) on delete set null;
create index if not exists page_views_growth_variant_idx on page_views(growth_variant_id, ts desc);
create index if not exists sample_requests_growth_variant_idx on sample_requests(growth_variant_id, ts desc);

-- Public landing-page attribution. Only a valid, already-created tracking code is resolved;
-- the public caller cannot choose arbitrary ids or timestamps.
create or replace function record_growth_page_view(
  p_path text,
  p_session text,
  p_referrer text,
  p_lang text,
  p_growth_code text default ''
)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into page_views(path, session_id, referrer, lang, growth_variant_id)
  select left(btrim(p_path), 120), left(btrim(p_session), 64),
         left(coalesce(p_referrer, ''), 200), left(coalesce(p_lang, ''), 8),
         (select id from growth_variants where tracking_code = lower(btrim(p_growth_code)) limit 1)
  where btrim(coalesce(p_path, '')) <> '' and btrim(coalesce(p_session, '')) <> '';
$$;

revoke all on function record_growth_page_view(text,text,text,text,text) from public;
grant execute on function record_growth_page_view(text,text,text,text,text) to anon, authenticated;

-- Extend the public sample request with a controlled experiment code while keeping the
-- previous ten-argument call backwards compatible through the final default parameter.
drop function if exists submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text, text);

create or replace function submit_sample_request(
  p_store_name text,
  p_contact_name text,
  p_phone text,
  p_address text,
  p_pack text,
  p_has_shop boolean,
  p_can_reformulate boolean,
  p_can_feedback boolean,
  p_note text,
  p_heard_from text default '',
  p_growth_code text default ''
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id text;
  v_pack text := coalesce(nullif(btrim(p_pack), ''), '50g');
  v_variant_id uuid;
begin
  if btrim(coalesce(p_store_name, '')) = '' then raise exception 'store_required'; end if;
  if btrim(coalesce(p_phone, '')) = '' then raise exception 'phone_required'; end if;
  if btrim(coalesce(p_address, '')) = '' then raise exception 'address_required'; end if;
  if v_pack = '50g' and not (coalesce(p_has_shop, false)
                             and coalesce(p_can_reformulate, false)
                             and coalesce(p_can_feedback, false)) then
    raise exception 'not_qualified';
  end if;
  if exists (
    select 1 from sample_requests r
    where regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(btrim(p_phone), '\D', '', 'g')
      and r.status in ('new', 'sent')
  ) then raise exception 'already_requested'; end if;

  select id into v_variant_id from growth_variants
  where tracking_code = lower(btrim(coalesce(p_growth_code, ''))) limit 1;
  v_id := 'sample-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);

  insert into sample_requests (
    id, store_name, contact_name, phone, address, pack,
    has_shop, can_reformulate, can_feedback, note, heard_from, growth_variant_id
  ) values (
    v_id, btrim(p_store_name), btrim(coalesce(p_contact_name, '')), btrim(p_phone), btrim(p_address), v_pack,
    coalesce(p_has_shop, false), coalesce(p_can_reformulate, false), coalesce(p_can_feedback, false),
    coalesce(p_note, ''),
    case when btrim(coalesce(p_heard_from, '')) in ('threads', 'tiktok', 'facebook_instagram', 'word_of_mouth')
         then btrim(p_heard_from) else '' end,
    v_variant_id
  );
  return v_id;
end;
$$;

revoke all on function submit_sample_request(text,text,text,text,text,boolean,boolean,boolean,text,text,text) from public;
grant execute on function submit_sample_request(text,text,text,text,text,boolean,boolean,boolean,text,text,text) to anon, authenticated;

-- One read gives the lab its experiment history and outcome funnel. A first order is
-- attributed when its contact matches an attributed sample phone and happens afterwards.
create or replace function growth_lab_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select jsonb_build_object(
    'active_prompt', coalesce((
      select to_jsonb(p) from growth_prompt_versions p where p.status = 'active' limit 1
    ), '{}'::jsonb),
    'experiments', coalesce((
      select jsonb_agg(
        to_jsonb(e) || jsonb_build_object('variants', coalesce((
          select jsonb_agg(
            to_jsonb(v) || jsonb_build_object(
              'outcomes', jsonb_build_object(
                'landing_views', (select count(*) from page_views pv where pv.growth_variant_id = v.id),
                'visitors', (select count(distinct pv.session_id) from page_views pv where pv.growth_variant_id = v.id),
                'sample_requests', (select count(*) from sample_requests sr where sr.growth_variant_id = v.id),
                'qualified_requests', (select count(*) from sample_requests sr where sr.growth_variant_id = v.id and (sr.pack <> '50g' or (sr.has_shop and sr.can_reformulate and sr.can_feedback))),
                'samples_sent', (select count(*) from sample_requests sr where sr.growth_variant_id = v.id and sr.status in ('sent', 'converted')),
                'first_orders', (
                  select count(distinct sr.id) from sample_requests sr
                  where sr.growth_variant_id = v.id and exists (
                    select 1 from orders o
                    where regexp_replace(lower(o.contact), '\D', '', 'g') = regexp_replace(lower(sr.phone), '\D', '', 'g')
                      and o.ts >= sr.ts
                  )
                )
              )
            ) order by v.created_at)
          from growth_variants v where v.experiment_id = e.id
        ), '[]'::jsonb))
        order by e.created_at desc
      ) from growth_experiments e where e.status <> 'archived'
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function growth_lab_snapshot() from public;
revoke all on function growth_lab_snapshot() from anon;
grant execute on function growth_lab_snapshot() to authenticated;

-- Growth Lab can be selected as a morning focus/resume destination.
alter table morning_focus_items drop constraint if exists morning_focus_items_app_key_check;
alter table morning_focus_items add constraint morning_focus_items_app_key_check
  check (app_key in ('orders', 'pipeline', 'operations', 'control', 'house', 'work', 'growth'));

create or replace function save_morning_focus(
  p_position integer,
  p_title text,
  p_app_key text,
  p_href text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_position not between 1 and 3 then raise exception 'invalid_position'; end if;
  if p_app_key not in ('orders', 'pipeline', 'operations', 'control', 'house', 'work', 'growth') then raise exception 'invalid_app'; end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'title_required'; end if;
  insert into morning_focus_items(user_id, work_date, position, title, app_key, href)
  values(auth.uid(), current_date, p_position, btrim(p_title), p_app_key, p_href)
  on conflict (user_id, work_date, position) do update set
    title = excluded.title, app_key = excluded.app_key, href = excluded.href,
    status = 'planned', updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function save_morning_focus(integer,text,text,text) from public;
revoke all on function save_morning_focus(integer,text,text,text) from anon;
grant execute on function save_morning_focus(integer,text,text,text) to authenticated;
