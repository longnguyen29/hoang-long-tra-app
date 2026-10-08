-- Knowledge Centre stores staff research and its links to content. Approved
-- company memory and Growth Lab metadata/outcomes retain their existing owners.
begin;

create function public.knowledge_https_url_valid(p_url text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select coalesce(char_length(p_url) between 9 and 2048
    and p_url ~ '^https://([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)*[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(:[0-9]{1,5})?([/?#][^[:space:]\\<>"'']*)?$'
    and p_url !~ '[[:cntrl:]\\<>"'']', false)
$$;

create function public.knowledge_sources_valid(p_sources jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog, public as $$
declare v_source jsonb;
begin
  if p_sources is null or jsonb_typeof(p_sources) <> 'array' then return false; end if;
  if jsonb_array_length(p_sources) > 10 then return false; end if;
  for v_source in select value from jsonb_array_elements(p_sources) loop
    if jsonb_typeof(v_source) <> 'object' then return false; end if;
    if not (v_source ?& array['label', 'url']) or
      exists (select 1 from jsonb_object_keys(v_source) key where key not in ('label', 'url')) or
      jsonb_typeof(v_source->'label') <> 'string' or jsonb_typeof(v_source->'url') <> 'string' or
      char_length(btrim(v_source->>'label')) < 1 or char_length(v_source->>'label') > 180 or
      not public.knowledge_https_url_valid(v_source->>'url') then return false; end if;
  end loop;
  return true;
end $$;

create function public.knowledge_metrics_valid(p_metrics jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare v_key text; v_value jsonb; v_number numeric;
begin
  if p_metrics is null or jsonb_typeof(p_metrics) <> 'object' then return false; end if;
  for v_key, v_value in select key, value from jsonb_each(p_metrics) loop
    if v_key not in ('views', 'likes', 'comments', 'shares', 'clicks', 'leads', 'orders', 'revenue', 'spend')
      or jsonb_typeof(v_value) not in ('number', 'null') then return false; end if;
    if jsonb_typeof(v_value) = 'number' then
      v_number := v_value::text::numeric;
      if v_number < 0 or v_number > 1000000000000000 or
        (v_key not in ('revenue', 'spend') and trunc(v_number) <> v_number) then return false; end if;
    end if;
  end loop;
  return true;
end $$;

-- Validate the input object before any populate-record casts. Only these fields
-- may be supplied; ids, audit actors, timestamps and versions are server owned.
create function public.knowledge_validate_fields(
  p_fields jsonb, p_allowed text[], p_uuid_fields text[], p_nullable text[], p_json_fields text[]
)
returns void language plpgsql set search_path = pg_catalog as $$
declare v_key text; v_value jsonb; v_type text;
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'object' or octet_length(p_fields::text) > 100000 then
    raise exception 'invalid_knowledge_fields';
  end if;
  for v_key, v_value in select key, value from jsonb_each(p_fields) loop
    if not (v_key = any(p_allowed)) then raise exception 'invalid_knowledge_field'; end if;
    v_type := jsonb_typeof(v_value);
    if v_type = 'null' then
      if not (v_key = any(p_nullable)) then raise exception 'invalid_knowledge_field_type'; end if;
    elsif v_key = any(p_uuid_fields) then
      if v_type <> 'string' or (v_value #>> '{}') !~
        '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$' then
        raise exception 'invalid_knowledge_reference';
      end if;
    elsif not (v_key = any(p_json_fields)) and v_type <> 'string' then
      raise exception 'invalid_knowledge_field_type';
    end if;
  end loop;
end $$;

create table public.knowledge_topics (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.knowledge_topics(id) on delete restrict,
  domain text not null check (domain in ('tea', 'business')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '' check (char_length(body) <= 12000),
  sources jsonb not null default '[]'::jsonb check (public.knowledge_sources_valid(sources)),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'archived')),
  memory_item_id uuid references public.company_memory_items(id) on delete restrict,
  next_action text not null default '' check (char_length(next_action) <= 1000),
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  check (parent_id is distinct from id),
  check ((reviewed_by is null) = (reviewed_at is null)),
  check (status <> 'reviewed' or reviewed_by is not null)
);

create table public.knowledge_angles (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.knowledge_topics(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 180),
  audience text not null default '' check (char_length(audience) <= 1000),
  hook text not null default '' check (char_length(hook) <= 2000),
  notes text not null default '' check (char_length(notes) <= 6000),
  next_action text not null default '' check (char_length(next_action) <= 1000),
  status text not null default 'idea' check (status in ('idea', 'research', 'drafting', 'ready', 'archived')),
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, topic_id)
);

create table public.knowledge_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.knowledge_topics(id) on delete restrict,
  angle_id uuid,
  growth_variant_id uuid unique references public.growth_variants(id) on delete restrict,
  channel text check (channel in ('threads', 'facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'other')),
  title text not null default '' check (char_length(title) <= 180),
  url text not null default '' check (url = '' or public.knowledge_https_url_valid(url)),
  published_at timestamptz check (published_at is null or (isfinite(published_at)
    and published_at >= timestamptz '1900-01-01 00:00:00+00'
    and published_at < timestamptz '2200-01-01 00:00:00+00')),
  metrics jsonb not null default '{}'::jsonb check (public.knowledge_metrics_valid(metrics)),
  measurement_note text not null default '' check (char_length(measurement_note) <= 3000),
  status text not null default 'active' check (status in ('active', 'archived')),
  version integer not null default 1 check (version >= 1),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (angle_id, topic_id) references public.knowledge_angles(id, topic_id) on delete restrict,
  check ((growth_variant_id is null and channel is not null and char_length(btrim(title)) between 1 and 180)
    or (growth_variant_id is not null and channel is null and title = '' and url = ''
      and published_at is null and metrics = '{}'::jsonb and measurement_note = ''))
);

create index knowledge_topics_tree_idx on public.knowledge_topics(domain, parent_id, status);
create index knowledge_topics_memory_idx on public.knowledge_topics(memory_item_id) where memory_item_id is not null;
create index knowledge_angles_topic_idx on public.knowledge_angles(topic_id, status, created_at);
create index knowledge_posts_topic_idx on public.knowledge_posts(topic_id, status, created_at);
create index knowledge_posts_angle_idx on public.knowledge_posts(angle_id) where angle_id is not null;

alter table public.knowledge_topics enable row level security;
alter table public.knowledge_angles enable row level security;
alter table public.knowledge_posts enable row level security;
create policy "knowledge topics manager read" on public.knowledge_topics
  for select to authenticated using (public.is_staff());
create policy "knowledge angles manager read" on public.knowledge_angles
  for select to authenticated using (public.is_staff());
create policy "knowledge posts manager read" on public.knowledge_posts
  for select to authenticated using (public.is_staff());
revoke all on public.knowledge_topics, public.knowledge_angles, public.knowledge_posts from public, anon, authenticated;
grant select on public.knowledge_topics, public.knowledge_angles, public.knowledge_posts to authenticated;
grant all on public.knowledge_topics, public.knowledge_angles, public.knowledge_posts to service_role;

create function public.save_knowledge_topic(p_id uuid, p_fields jsonb, p_expected_version integer)
returns setof public.knowledge_topics
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_previous public.knowledge_topics%rowtype;
  v_saved public.knowledge_topics%rowtype;
  v_fields jsonb;
  v_parent_domain text;
  v_memory_status text;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  perform public.knowledge_validate_fields(p_fields,
    array['parent_id', 'domain', 'title', 'body', 'sources', 'status', 'memory_item_id', 'next_action'],
    array['parent_id', 'memory_item_id'], array['parent_id', 'memory_item_id'], array['sources']);

  -- Serialize tree edits before inspecting ancestors. Lock existing rows as well
  -- so a caller using repeatable-read cannot silently validate an outdated tree.
  lock table public.knowledge_topics in share row exclusive mode;
  perform id from public.knowledge_topics order by id for update;
  if p_id is null then
    if p_expected_version is not null then raise exception 'knowledge_topic_conflict'; end if;
    v_fields := jsonb_build_object('parent_id', null, 'domain', 'tea', 'title', '', 'body', '',
      'sources', '[]'::jsonb, 'status', 'draft', 'memory_item_id', null, 'next_action', '');
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception 'knowledge_topic_conflict'; end if;
    select * into v_previous from public.knowledge_topics where id = p_id;
    if not found or v_previous.version <> p_expected_version then raise exception 'knowledge_topic_conflict'; end if;
    v_fields := to_jsonb(v_previous);
  end if;
  v_saved := jsonb_populate_record(null::public.knowledge_topics, v_fields || p_fields);
  v_saved.title := btrim(v_saved.title);
  if v_saved.domain not in ('tea', 'business') or char_length(v_saved.title) not between 1 and 180 or
    char_length(v_saved.body) > 12000 or char_length(v_saved.next_action) > 1000 or
    v_saved.status not in ('draft', 'reviewed', 'archived') then raise exception 'invalid_knowledge_topic'; end if;
  if not public.knowledge_sources_valid(v_saved.sources) then raise exception 'invalid_knowledge_sources'; end if;

  if v_saved.parent_id is not null then
    select domain into v_parent_domain from public.knowledge_topics where id = v_saved.parent_id;
    if not found then raise exception 'knowledge_parent_not_found'; end if;
    if v_parent_domain <> v_saved.domain then raise exception 'knowledge_domain_mismatch'; end if;
    if v_saved.parent_id = p_id or exists (
      with recursive ancestors as (
        select id, parent_id from public.knowledge_topics where id = v_saved.parent_id
        union
        select t.id, t.parent_id from public.knowledge_topics t join ancestors a on t.id = a.parent_id
      ) select 1 from ancestors where id = p_id
    ) then raise exception 'knowledge_topic_cycle'; end if;
  end if;
  if p_id is not null and exists (select 1 from public.knowledge_topics
    where parent_id = p_id and domain <> v_saved.domain) then raise exception 'knowledge_domain_mismatch'; end if;

  if v_saved.memory_item_id is not null then
    select status into v_memory_status from public.company_memory_items where id = v_saved.memory_item_id for share;
    if not found or v_memory_status <> 'approved' then raise exception 'knowledge_memory_not_approved'; end if;
  end if;
  v_saved.reviewed_by := case when v_saved.status = 'reviewed' then auth.uid()
    when v_saved.status = 'archived' then v_previous.reviewed_by else null end;
  v_saved.reviewed_at := case when v_saved.status = 'reviewed' then now()
    when v_saved.status = 'archived' then v_previous.reviewed_at else null end;

  if p_id is null then
    insert into public.knowledge_topics(parent_id, domain, title, body, sources, status, memory_item_id,
      next_action, created_by, updated_by, reviewed_by, reviewed_at)
    values(v_saved.parent_id, v_saved.domain, v_saved.title, v_saved.body, v_saved.sources, v_saved.status,
      v_saved.memory_item_id, v_saved.next_action, auth.uid(), auth.uid(), v_saved.reviewed_by, v_saved.reviewed_at)
    returning * into v_saved;
  else
    update public.knowledge_topics set parent_id = v_saved.parent_id, domain = v_saved.domain,
      title = v_saved.title, body = v_saved.body, sources = v_saved.sources, status = v_saved.status,
      memory_item_id = v_saved.memory_item_id, next_action = v_saved.next_action,
      reviewed_by = v_saved.reviewed_by, reviewed_at = v_saved.reviewed_at,
      version = version + 1, updated_by = auth.uid(), updated_at = now()
    where id = p_id and version = p_expected_version returning * into v_saved;
    if not found then raise exception 'knowledge_topic_conflict'; end if;
  end if;
  return next v_saved;
end $$;

create function public.save_knowledge_angle(p_id uuid, p_fields jsonb, p_expected_version integer)
returns setof public.knowledge_angles
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_previous public.knowledge_angles%rowtype;
  v_saved public.knowledge_angles%rowtype;
  v_fields jsonb;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  perform public.knowledge_validate_fields(p_fields,
    array['topic_id', 'title', 'audience', 'hook', 'notes', 'next_action', 'status'],
    array['topic_id'], array[]::text[], array[]::text[]);
  if p_id is null then
    if p_expected_version is not null then raise exception 'knowledge_angle_conflict'; end if;
    v_fields := jsonb_build_object('topic_id', null, 'title', '', 'audience', '', 'hook', '',
      'notes', '', 'next_action', '', 'status', 'idea');
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception 'knowledge_angle_conflict'; end if;
    select * into v_previous from public.knowledge_angles where id = p_id for update;
    if not found or v_previous.version <> p_expected_version then raise exception 'knowledge_angle_conflict'; end if;
    v_fields := to_jsonb(v_previous);
  end if;
  v_saved := jsonb_populate_record(null::public.knowledge_angles, v_fields || p_fields);
  v_saved.title := btrim(v_saved.title);
  if v_saved.topic_id is null or char_length(v_saved.title) not between 1 and 180 or
    char_length(v_saved.audience) > 1000 or char_length(v_saved.hook) > 2000 or
    char_length(v_saved.notes) > 6000 or char_length(v_saved.next_action) > 1000 or
    v_saved.status not in ('idea', 'research', 'drafting', 'ready', 'archived') then
    raise exception 'invalid_knowledge_angle';
  end if;
  perform 1 from public.knowledge_topics where id = v_saved.topic_id for key share;
  if not found then raise exception 'knowledge_topic_not_found'; end if;
  if p_id is not null and v_saved.topic_id <> v_previous.topic_id and
    exists (select 1 from public.knowledge_posts where angle_id = p_id) then
    raise exception 'knowledge_angle_topic_mismatch';
  end if;
  if p_id is null then
    insert into public.knowledge_angles(topic_id, title, audience, hook, notes, next_action, status, created_by, updated_by)
    values(v_saved.topic_id, v_saved.title, v_saved.audience, v_saved.hook, v_saved.notes,
      v_saved.next_action, v_saved.status, auth.uid(), auth.uid()) returning * into v_saved;
  else
    update public.knowledge_angles set topic_id = v_saved.topic_id, title = v_saved.title,
      audience = v_saved.audience, hook = v_saved.hook, notes = v_saved.notes,
      next_action = v_saved.next_action, status = v_saved.status,
      version = version + 1, updated_by = auth.uid(), updated_at = now()
    where id = p_id and version = p_expected_version returning * into v_saved;
    if not found then raise exception 'knowledge_angle_conflict'; end if;
  end if;
  return next v_saved;
end $$;

create function public.save_knowledge_post(p_id uuid, p_fields jsonb, p_expected_version integer)
returns setof public.knowledge_posts
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_previous public.knowledge_posts%rowtype;
  v_saved public.knowledge_posts%rowtype;
  v_fields jsonb;
  v_angle_topic uuid;
  v_publication text;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  perform public.knowledge_validate_fields(p_fields,
    array['topic_id', 'angle_id', 'growth_variant_id', 'channel', 'title', 'url', 'published_at', 'metrics', 'measurement_note', 'status'],
    array['topic_id', 'angle_id', 'growth_variant_id'],
    array['angle_id', 'growth_variant_id', 'channel', 'published_at'], array['metrics']);
  if p_id is null then
    if p_expected_version is not null then raise exception 'knowledge_post_conflict'; end if;
    v_fields := jsonb_build_object('topic_id', null, 'angle_id', null, 'growth_variant_id', null,
      'channel', null, 'title', '', 'url', '', 'published_at', null, 'metrics', '{}'::jsonb,
      'measurement_note', '', 'status', 'active');
  else
    if p_expected_version is null or p_expected_version < 1 then raise exception 'knowledge_post_conflict'; end if;
    select * into v_previous from public.knowledge_posts where id = p_id for update;
    if not found or v_previous.version <> p_expected_version then raise exception 'knowledge_post_conflict'; end if;
    v_fields := to_jsonb(v_previous);
  end if;
  v_fields := v_fields || p_fields;
  v_publication := v_fields->>'published_at';
  if v_publication is not null then
    if char_length(v_publication) > 40 or v_publication !~
      '^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?([Zz]|[+-][0-9]{2}:[0-9]{2})$' then
      raise exception 'invalid_knowledge_publication_date';
    end if;
    begin
      if not isfinite(v_publication::timestamptz) or v_publication::timestamptz < timestamptz '1900-01-01 00:00:00+00'
        or v_publication::timestamptz >= timestamptz '2200-01-01 00:00:00+00' then
        raise exception 'invalid_knowledge_publication_date';
      end if;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception 'invalid_knowledge_publication_date';
    end;
  end if;
  v_saved := jsonb_populate_record(null::public.knowledge_posts, v_fields);
  v_saved.title := btrim(v_saved.title);
  if v_saved.topic_id is null or char_length(v_saved.title) > 180 or
    char_length(v_saved.measurement_note) > 3000 or v_saved.status not in ('active', 'archived') then
    raise exception 'invalid_knowledge_post';
  end if;
  if v_saved.url <> '' and not public.knowledge_https_url_valid(v_saved.url) then raise exception 'invalid_knowledge_url'; end if;
  if not public.knowledge_metrics_valid(v_saved.metrics) then raise exception 'invalid_knowledge_metrics'; end if;
  perform 1 from public.knowledge_topics where id = v_saved.topic_id for key share;
  if not found then raise exception 'knowledge_topic_not_found'; end if;
  if v_saved.angle_id is not null then
    select topic_id into v_angle_topic from public.knowledge_angles where id = v_saved.angle_id for key share;
    if not found or v_angle_topic <> v_saved.topic_id then raise exception 'knowledge_angle_topic_mismatch'; end if;
  end if;
  if v_saved.growth_variant_id is null then
    if v_saved.channel is null or v_saved.channel not in ('threads', 'facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'other')
      or char_length(v_saved.title) < 1 then raise exception 'invalid_knowledge_external_post'; end if;
  else
    perform 1 from public.growth_variants where id = v_saved.growth_variant_id for key share;
    if not found then raise exception 'knowledge_growth_variant_not_found'; end if;
    if v_saved.channel is not null or v_saved.title <> '' or v_saved.url <> '' or v_saved.published_at is not null
      or v_saved.metrics <> '{}'::jsonb or v_saved.measurement_note <> '' then
      raise exception 'knowledge_growth_metadata_is_canonical';
    end if;
    if exists (select 1 from public.knowledge_posts where growth_variant_id = v_saved.growth_variant_id
      and id is distinct from p_id) then raise exception 'knowledge_growth_variant_already_linked'; end if;
  end if;
  if p_id is null then
    insert into public.knowledge_posts(topic_id, angle_id, growth_variant_id, channel, title, url, published_at,
      metrics, measurement_note, status, created_by, updated_by)
    values(v_saved.topic_id, v_saved.angle_id, v_saved.growth_variant_id, v_saved.channel, v_saved.title,
      v_saved.url, v_saved.published_at, v_saved.metrics, v_saved.measurement_note, v_saved.status, auth.uid(), auth.uid())
    returning * into v_saved;
  else
    update public.knowledge_posts set topic_id = v_saved.topic_id, angle_id = v_saved.angle_id,
      growth_variant_id = v_saved.growth_variant_id, channel = v_saved.channel, title = v_saved.title,
      url = v_saved.url, published_at = v_saved.published_at, metrics = v_saved.metrics,
      measurement_note = v_saved.measurement_note, status = v_saved.status,
      version = version + 1, updated_by = auth.uid(), updated_at = now()
    where id = p_id and version = p_expected_version returning * into v_saved;
    if not found then raise exception 'knowledge_post_conflict'; end if;
  end if;
  return next v_saved;
exception when unique_violation then
  raise exception 'knowledge_growth_variant_already_linked';
end $$;

create function public.knowledge_centre_snapshot()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_growth jsonb; v_archived jsonb;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'manager_required'; end if;
  -- Use the canonical existing snapshot exactly once. It excludes archived
  -- experiments, so add only archived experiments referenced by our post links.
  v_growth := public.growth_lab_snapshot();
  select coalesce(jsonb_agg(to_jsonb(e) || jsonb_build_object('variants', coalesce((
    select jsonb_agg(to_jsonb(v) || jsonb_build_object('outcomes', jsonb_build_object(
      'landing_views', (select count(*) from public.page_views pv where pv.growth_variant_id = v.id),
      'visitors', (select count(distinct pv.session_id) from public.page_views pv where pv.growth_variant_id = v.id),
      'sample_requests', (select count(*) from public.sample_requests sr where sr.growth_variant_id = v.id),
      'qualified_requests', (select count(*) from public.sample_requests sr where sr.growth_variant_id = v.id
        and (sr.pack <> '50g' or (sr.has_shop and sr.can_reformulate and sr.can_feedback))),
      'samples_sent', (select count(*) from public.sample_requests sr where sr.growth_variant_id = v.id and sr.status in ('sent', 'converted')),
      'first_orders', (select count(distinct sr.id) from public.sample_requests sr where sr.growth_variant_id = v.id
        and exists (select 1 from public.orders o where
          regexp_replace(lower(o.contact), '\D', '', 'g') = regexp_replace(lower(sr.phone), '\D', '', 'g') and o.ts >= sr.ts))
    )) order by v.created_at) from public.growth_variants v where v.experiment_id = e.id
  ), '[]'::jsonb)) order by e.created_at desc), '[]'::jsonb) into v_archived
  from public.growth_experiments e where e.status = 'archived' and exists (
    select 1 from public.growth_variants v join public.knowledge_posts p on p.growth_variant_id = v.id
    where v.experiment_id = e.id
  );
  v_growth := jsonb_set(v_growth, '{experiments}', coalesce(v_growth->'experiments', '[]'::jsonb) || v_archived);
  return jsonb_build_object(
    'topics', coalesce((select jsonb_agg(to_jsonb(t) order by t.domain, t.created_at) from public.knowledge_topics t), '[]'::jsonb),
    'angles', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.knowledge_angles a), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from public.knowledge_posts p), '[]'::jsonb),
    'memory_items', coalesce((select jsonb_agg(to_jsonb(m) order by m.approved_at desc nulls last, m.created_at desc)
      from public.company_memory_items m where m.status = 'approved'), '[]'::jsonb),
    'growth', v_growth
  );
end $$;

revoke all on function public.knowledge_https_url_valid(text), public.knowledge_sources_valid(jsonb),
  public.knowledge_metrics_valid(jsonb), public.knowledge_validate_fields(jsonb, text[], text[], text[], text[])
  from public, anon, authenticated;
grant execute on function public.knowledge_https_url_valid(text), public.knowledge_sources_valid(jsonb),
  public.knowledge_metrics_valid(jsonb) to service_role;
revoke all on function public.save_knowledge_topic(uuid, jsonb, integer), public.save_knowledge_angle(uuid, jsonb, integer),
  public.save_knowledge_post(uuid, jsonb, integer), public.knowledge_centre_snapshot() from public, anon, authenticated;
grant execute on function public.save_knowledge_topic(uuid, jsonb, integer), public.save_knowledge_angle(uuid, jsonb, integer),
  public.save_knowledge_post(uuid, jsonb, integer), public.knowledge_centre_snapshot() to authenticated;

-- Add the new destination to the latest Morning Desk contract without changing
-- any existing destination or its focus-slot/upsert behavior.
alter table public.morning_focus_items drop constraint if exists morning_focus_items_app_key_check;
alter table public.morning_focus_items add constraint morning_focus_items_app_key_check
  check (app_key in ('orders', 'pipeline', 'operations', 'control', 'house', 'work', 'growth', 'knowledge'));

create or replace function public.save_morning_focus(p_position integer, p_title text, p_app_key text, p_href text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_position not between 1 and 3 then raise exception 'invalid_position'; end if;
  if p_app_key not in ('orders', 'pipeline', 'operations', 'control', 'house', 'work', 'growth', 'knowledge') then
    raise exception 'invalid_app';
  end if;
  if btrim(coalesce(p_title, '')) = '' then raise exception 'title_required'; end if;
  insert into morning_focus_items(user_id, work_date, position, title, app_key, href)
  values(auth.uid(), current_date, p_position, btrim(p_title), p_app_key, p_href)
  on conflict (user_id, work_date, position) do update set
    title = excluded.title, app_key = excluded.app_key, href = excluded.href,
    status = 'planned', updated_at = now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.save_morning_focus(integer, text, text, text) from public, anon;
grant execute on function public.save_morning_focus(integer, text, text, text) to authenticated;

commit;
