-- Read-only social sources are separate from staff topic assignments, notes and
-- commercial results. Buffer credentials never belong in this data model.
begin;

create function public.knowledge_social_url_valid(p_url text)
returns boolean language sql immutable set search_path = pg_catalog, public as $$
  select public.knowledge_https_url_valid(p_url)
    and lower(substring(p_url from '^https://([^/:?#]+)')) ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'
    and lower(substring(p_url from '^https://([^/:?#]+)')) !~
      '(^[0-9.]+$|(^|\.)localhost$|\.(local|internal|test|example|invalid)$)'
$$;

create function public.knowledge_social_url_key(p_url text)
returns text language plpgsql immutable set search_path = pg_catalog as $$
declare v_url text; v_base text; v_query text;
begin
  v_url := split_part(coalesce(p_url, ''), '#', 1);
  v_base := replace(regexp_replace(regexp_replace(split_part(v_url, '?', 1),
    '^https://www\.', 'https://'), '/+$', ''), 'https://threads.net/', 'https://threads.com/');
  if position('?' in v_url) > 0 then
    select string_agg(pair, '&' order by pair) into v_query
    from unnest(string_to_array(substring(v_url from position('?' in v_url) + 1), '&')) pair
    where pair <> '' and pair !~* '^(utm_[^=]*|fbclid|gclid|igshid|igsh|xmt|mibextid)=';
  end if;
  -- Facebook post IDs in query parameters distinguish real posts and must stay.
  return v_base || case when coalesce(v_query, '') <> '' then '?' || v_query else '' end;
end
$$;

create function public.knowledge_social_media_valid(p_media jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog, public as $$
declare v_item jsonb;
begin
  if p_media is null or jsonb_typeof(p_media) <> 'array' or jsonb_array_length(p_media) > 10
    or octet_length(p_media::text) > 50000 then return false; end if;
  for v_item in select value from jsonb_array_elements(p_media) loop
    if jsonb_typeof(v_item) <> 'object' or not (v_item ?& array['type', 'url'])
      or exists (select 1 from jsonb_object_keys(v_item) k where k not in ('type', 'url', 'thumbnail'))
      or jsonb_typeof(v_item->'type') <> 'string' or v_item->>'type' not in ('image', 'video')
      or jsonb_typeof(v_item->'url') <> 'string' or not public.knowledge_social_url_valid(v_item->>'url')
      or (v_item ? 'thumbnail' and (jsonb_typeof(v_item->'thumbnail') <> 'string'
        or not public.knowledge_social_url_valid(v_item->>'thumbnail'))) then return false; end if;
  end loop;
  return true;
end $$;

create function public.knowledge_social_metrics_valid(p_metrics jsonb)
returns boolean language sql immutable set search_path = pg_catalog, public as $$
  select public.knowledge_metrics_valid(p_metrics) and not exists (
    select 1 from jsonb_object_keys(case when jsonb_typeof(p_metrics) = 'object' then p_metrics else '{}'::jsonb end) k
    where k not in ('views', 'likes', 'comments', 'shares', 'clicks')
  )
$$;

create function public.knowledge_social_raw_metrics_valid(p_metrics jsonb)
returns boolean language plpgsql immutable set search_path = pg_catalog as $$
declare v_item jsonb; v_number numeric;
begin
  if p_metrics is null or jsonb_typeof(p_metrics) <> 'array' or jsonb_array_length(p_metrics) > 40
    or octet_length(p_metrics::text) > 20000 then return false; end if;
  for v_item in select value from jsonb_array_elements(p_metrics) loop
    if jsonb_typeof(v_item) <> 'object' or not (v_item ?& array['type', 'value'])
      or exists (select 1 from jsonb_object_keys(v_item) k where k not in ('type', 'value', 'name', 'unit'))
      or jsonb_typeof(v_item->'type') <> 'string' or char_length(btrim(v_item->>'type')) not between 1 and 80
      or v_item->>'type' ~ '[[:cntrl:]]' or jsonb_typeof(v_item->'value') not in ('number', 'null')
      or (v_item ? 'name' and (jsonb_typeof(v_item->'name') <> 'string'
        or char_length(v_item->>'name') > 120 or v_item->>'name' ~ '[[:cntrl:]]'))
      or (v_item ? 'unit' and (jsonb_typeof(v_item->'unit') <> 'string'
        or char_length(v_item->>'unit') > 30 or v_item->>'unit' ~ '[[:cntrl:]]')) then return false; end if;
    if jsonb_typeof(v_item->'value') = 'number' then
      v_number := (v_item->>'value')::numeric;
      if v_number < 0 or v_number > 1000000000000000 then return false; end if;
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_metrics) m group by m->>'type' having count(*) > 1) then
    return false;
  end if;
  return true;
end $$;

create table public.knowledge_social_posts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'buffer' check (provider = 'buffer'),
  organization_id text not null check (char_length(btrim(organization_id)) between 1 and 120),
  account_id text not null check (char_length(btrim(account_id)) between 1 and 120),
  account_name text not null check (char_length(btrim(account_name)) between 1 and 180),
  channel text not null check (channel in ('threads', 'facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'other')),
  external_post_id text not null check (char_length(btrim(external_post_id)) between 1 and 180),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  body text not null default '' check (char_length(body) <= 30000),
  url text not null default '' check (url = '' or public.knowledge_social_url_valid(url)),
  published_at timestamptz not null check (isfinite(published_at)
    and published_at >= timestamptz '1900-01-01 00:00:00+00' and published_at < timestamptz '2200-01-01 00:00:00+00'),
  media jsonb not null default '[]'::jsonb check (public.knowledge_social_media_valid(media)),
  metrics jsonb not null default '{}'::jsonb check (public.knowledge_social_metrics_valid(metrics)),
  raw_metrics jsonb not null default '[]'::jsonb check (public.knowledge_social_raw_metrics_valid(raw_metrics)),
  metrics_updated_at timestamptz check (metrics_updated_at is null or (isfinite(metrics_updated_at)
    and metrics_updated_at >= timestamptz '1900-01-01 00:00:00+00' and metrics_updated_at < timestamptz '2200-01-01 00:00:00+00')),
  fetched_at timestamptz not null check (isfinite(fetched_at)
    and fetched_at >= timestamptz '1900-01-01 00:00:00+00' and fetched_at < timestamptz '2200-01-01 00:00:00+00'),
  import_method text not null check (import_method in ('connector', 'api')),
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, organization_id, account_id, external_post_id),
  check (published_at <= fetched_at),
  check (metrics_updated_at is null or metrics_updated_at <= fetched_at),
  check (metrics_updated_at is not null or (metrics = '{}'::jsonb and raw_metrics = '[]'::jsonb))
);
create index knowledge_social_posts_recent_idx on public.knowledge_social_posts(published_at desc, id);
alter table public.knowledge_social_posts enable row level security;
create policy "knowledge social posts staff read" on public.knowledge_social_posts
  for select to authenticated using (public.is_staff());
revoke all on public.knowledge_social_posts from public, anon, authenticated;
grant select on public.knowledge_social_posts to authenticated;
grant all on public.knowledge_social_posts to service_role;

alter table public.knowledge_posts add column social_post_id uuid unique
  references public.knowledge_social_posts(id) on delete restrict;

-- Source metadata/metrics are displayed from the imported row. Existing manual
-- records retain their historic values, but cannot turn into competing sources.
create function public.guard_knowledge_social_link()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if old.social_post_id is not null then
    if new.social_post_id is distinct from old.social_post_id or
      new.growth_variant_id is distinct from old.growth_variant_id or
      new.channel is distinct from old.channel or new.title is distinct from old.title or
      new.url is distinct from old.url or new.published_at is distinct from old.published_at or
      (new.metrics - array['leads','orders','revenue','spend']) is distinct from
      (old.metrics - array['leads','orders','revenue','spend']) then
      raise exception 'knowledge_social_source_is_canonical';
    end if;
  end if;
  return new;
end $$;
create trigger knowledge_social_link_canonical before update on public.knowledge_posts
  for each row execute function public.guard_knowledge_social_link();

create function public.ingest_knowledge_social_posts(p_posts jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_input jsonb; v_fields jsonb; v_previous public.knowledge_social_posts%rowtype;
  v_row public.knowledge_social_posts%rowtype; v_existing boolean; v_date text; v_key text;
  v_metrics_newer boolean; v_imported integer := 0; v_updated integer := 0; v_unchanged integer := 0;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'service_required'; end if;
  if p_posts is null or jsonb_typeof(p_posts) <> 'array' or jsonb_array_length(p_posts) not between 1 and 50
    or octet_length(p_posts::text) > 3000000 then raise exception 'invalid_social_import'; end if;
  if exists (select 1 from jsonb_array_elements(p_posts) p
    group by p->>'provider', p->>'organization_id', p->>'account_id', p->>'external_post_id' having count(*) > 1) then
    raise exception 'duplicate_social_import_identity';
  end if;
  -- Infrequent bounded batches serialize inserts, including identical first
  -- imports, without exposing direct writes or requiring a queue engine.
  lock table public.knowledge_social_posts in share row exclusive mode;
  for v_input in select value from jsonb_array_elements(p_posts) loop
    perform public.knowledge_validate_fields(v_input,
      array['provider','organization_id','account_id','account_name','channel','external_post_id','title','body','url',
        'published_at','media','metrics','raw_metrics','metrics_updated_at','fetched_at','import_method'],
      array[]::text[], array['metrics_updated_at'], array['media','metrics','raw_metrics']);
    if not (v_input ?& array['organization_id','account_id','account_name','channel','external_post_id',
      'title','published_at','fetched_at','import_method']) then raise exception 'invalid_social_import_fields'; end if;
    v_fields := jsonb_build_object('provider','buffer','body','','url','','media','[]'::jsonb,
      'metrics','{}'::jsonb,'raw_metrics','[]'::jsonb,'metrics_updated_at',null) || v_input;
    foreach v_key in array array['published_at','fetched_at','metrics_updated_at'] loop
      v_date := v_fields->>v_key;
      if v_date is not null then
        if char_length(v_date) > 40 or v_date !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}[Tt ][0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?([Zz]|[+-][0-9]{2}:[0-9]{2})$' then
          raise exception 'invalid_social_import_date';
        end if;
        begin
          if not isfinite(v_date::timestamptz) or v_date::timestamptz < timestamptz '1900-01-01 00:00:00+00'
            or v_date::timestamptz >= timestamptz '2200-01-01 00:00:00+00' then
            raise exception 'invalid_social_import_date';
          end if;
        exception when invalid_datetime_format or datetime_field_overflow then
          raise exception 'invalid_social_import_date';
        end;
      end if;
    end loop;
    v_row := jsonb_populate_record(null::public.knowledge_social_posts, v_fields);
    if v_row.provider <> 'buffer' or v_row.channel not in ('threads','facebook','instagram','tiktok','youtube','linkedin','other')
      or v_row.import_method not in ('connector','api') or char_length(btrim(v_row.organization_id)) not between 1 and 120
      or char_length(btrim(v_row.account_id)) not between 1 and 120 or char_length(btrim(v_row.account_name)) not between 1 and 180
      or char_length(btrim(v_row.external_post_id)) not between 1 and 180 or char_length(btrim(v_row.title)) not between 1 and 180
      or char_length(v_row.body) > 30000 or (v_row.url <> '' and not public.knowledge_social_url_valid(v_row.url))
      or not public.knowledge_social_media_valid(v_row.media) or not public.knowledge_social_metrics_valid(v_row.metrics)
      or not public.knowledge_social_raw_metrics_valid(v_row.raw_metrics) then raise exception 'invalid_social_import_row'; end if;
    select * into v_previous from public.knowledge_social_posts where provider = v_row.provider
      and organization_id = v_row.organization_id and account_id = v_row.account_id and external_post_id = v_row.external_post_id
      for update;
    v_existing := found;
    if not v_existing then
      insert into public.knowledge_social_posts(provider,organization_id,account_id,account_name,channel,external_post_id,
        title,body,url,published_at,media,metrics,raw_metrics,metrics_updated_at,fetched_at,import_method)
      values(v_row.provider,v_row.organization_id,v_row.account_id,v_row.account_name,v_row.channel,v_row.external_post_id,
        v_row.title,v_row.body,v_row.url,v_row.published_at,v_row.media,v_row.metrics,v_row.raw_metrics,
        v_row.metrics_updated_at,v_row.fetched_at,v_row.import_method);
      v_imported := v_imported + 1;
    elsif v_row.fetched_at <= v_previous.fetched_at then
      v_unchanged := v_unchanged + 1;
    else
      v_metrics_newer := v_row.metrics_updated_at is not null and
        (v_previous.metrics_updated_at is null or v_row.metrics_updated_at >= v_previous.metrics_updated_at);
      update public.knowledge_social_posts set account_name = v_row.account_name, channel = v_row.channel,
        title = v_row.title, body = v_row.body, url = v_row.url, published_at = v_row.published_at, media = v_row.media,
        metrics = case when v_metrics_newer then v_row.metrics else metrics end,
        raw_metrics = case when v_metrics_newer then v_row.raw_metrics else raw_metrics end,
        metrics_updated_at = case when v_metrics_newer then v_row.metrics_updated_at else metrics_updated_at end,
        fetched_at = v_row.fetched_at, import_method = v_row.import_method, version = version + 1, updated_at = now()
      where id = v_previous.id;
      v_updated := v_updated + 1;
    end if;
  end loop;
  return jsonb_build_object('imported',v_imported,'updated',v_updated,'unchanged',v_unchanged);
end $$;

create function public.knowledge_social_inbox_snapshot()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_posts jsonb;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'manager_required'; end if;
  -- Also return older linked sources so topic history never loses its canonical
  -- metadata as more than 200 new posts enter the inbox.
  select coalesce(jsonb_agg(to_jsonb(s) order by s.published_at desc, s.id), '[]'::jsonb) into v_posts
  from public.knowledge_social_posts s where s.id in (
    select id from public.knowledge_social_posts order by published_at desc, id limit 200
  ) or exists (select 1 from public.knowledge_posts p where p.social_post_id = s.id);
  return jsonb_build_object('posts',v_posts,
    'links',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'social_post_id',p.social_post_id,
      'topic_id',p.topic_id,'angle_id',p.angle_id,'status',p.status,'version',p.version) order by p.created_at desc)
      from public.knowledge_posts p where p.social_post_id is not null),'[]'::jsonb),
    'last_import_at',(select max(fetched_at) from public.knowledge_social_posts),
    'total_count',(select count(*) from public.knowledge_social_posts),
    'pending_count',(select count(*) from public.knowledge_social_posts s
      where not exists (select 1 from public.knowledge_posts p where p.social_post_id = s.id)));
end $$;

create function public.link_knowledge_social_post(
  p_social_post_id uuid, p_topic_id uuid, p_angle_id uuid, p_expected_version integer
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_source public.knowledge_social_posts%rowtype; v_post public.knowledge_posts%rowtype;
  v_candidate uuid; v_variant uuid; v_matches integer; v_existing boolean := false;
  v_preserved boolean := false; v_url_key text;
begin
  if auth.uid() is null or not public.is_staff_manager() then raise exception 'manager_required'; end if;
  -- Serialize URL adoption and source links. Source locks alone cannot prevent
  -- two distinct imports from adopting the same existing public post.
  perform pg_advisory_xact_lock(hashtextextended('knowledge-social-link', 0));
  select * into v_source from public.knowledge_social_posts where id = p_social_post_id for update;
  if not found then raise exception 'knowledge_social_post_not_found'; end if;
  perform 1 from public.knowledge_topics where id = p_topic_id for key share;
  if not found then raise exception 'knowledge_topic_not_found'; end if;
  if p_angle_id is not null then
    perform 1 from public.knowledge_angles where id = p_angle_id and topic_id = p_topic_id for key share;
    if not found then raise exception 'knowledge_angle_topic_mismatch'; end if;
  end if;
  select * into v_post from public.knowledge_posts where social_post_id = p_social_post_id for update;
  if found then
    if p_expected_version is null or p_expected_version <> v_post.version then raise exception 'knowledge_post_conflict'; end if;
    update public.knowledge_posts set topic_id = p_topic_id, angle_id = p_angle_id,
      version = version + 1, updated_by = auth.uid(), updated_at = now() where id = v_post.id returning * into v_post;
    return jsonb_build_object('post',to_jsonb(v_post),'existing',true,'preserved_assignment',false);
  end if;
  if p_expected_version is not null then raise exception 'knowledge_post_conflict'; end if;
  v_url_key := public.knowledge_social_url_key(v_source.url);
  if v_url_key <> '' then
    select count(*), (array_agg(p.id))[1] into v_matches, v_candidate
    from public.knowledge_posts p left join public.growth_variants g on g.id = p.growth_variant_id
    where public.knowledge_social_url_key(case when p.growth_variant_id is null then p.url else g.threads_post_url end) = v_url_key;
    if v_matches > 1 then raise exception 'knowledge_social_url_ambiguous'; end if;
    if v_matches = 1 then
      select * into v_post from public.knowledge_posts where id = v_candidate for update;
      if v_post.social_post_id is not null then raise exception 'knowledge_social_url_already_linked'; end if;
      update public.knowledge_posts set social_post_id = p_social_post_id,
        version = version + 1, updated_by = auth.uid(), updated_at = now() where id = v_candidate returning * into v_post;
      return jsonb_build_object('post',to_jsonb(v_post),'existing',true,'preserved_assignment',true);
    end if;
    -- An unlinked Growth Lab variant remains the canonical owner of commercial
    -- attribution. Adopt it rather than create a competing manual post.
    select count(*), (array_agg(id))[1] into v_matches, v_variant from public.growth_variants
      where public.knowledge_social_url_key(threads_post_url) = v_url_key;
    if v_matches > 1 then raise exception 'knowledge_social_url_ambiguous'; end if;
  end if;
  if v_variant is not null then
    insert into public.knowledge_posts(topic_id,angle_id,growth_variant_id,social_post_id,created_by,updated_by)
    values(p_topic_id,p_angle_id,v_variant,p_social_post_id,auth.uid(),auth.uid()) returning * into v_post;
  else
    insert into public.knowledge_posts(topic_id,angle_id,social_post_id,channel,title,url,published_at,created_by,updated_by)
    values(p_topic_id,p_angle_id,p_social_post_id,v_source.channel,v_source.title,v_source.url,v_source.published_at,
      auth.uid(),auth.uid()) returning * into v_post;
  end if;
  return jsonb_build_object('post',to_jsonb(v_post),'existing',false,'preserved_assignment',false);
exception when unique_violation then raise exception 'knowledge_social_url_already_linked';
end $$;

revoke all on function public.knowledge_social_url_valid(text),public.knowledge_social_url_key(text),
  public.knowledge_social_media_valid(jsonb),public.knowledge_social_metrics_valid(jsonb),
  public.knowledge_social_raw_metrics_valid(jsonb),public.guard_knowledge_social_link()
  from public, anon, authenticated;
grant execute on function public.knowledge_social_url_valid(text),public.knowledge_social_url_key(text),
  public.knowledge_social_media_valid(jsonb),public.knowledge_social_metrics_valid(jsonb),
  public.knowledge_social_raw_metrics_valid(jsonb) to service_role;
revoke all on function public.ingest_knowledge_social_posts(jsonb),public.knowledge_social_inbox_snapshot(),
  public.link_knowledge_social_post(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.ingest_knowledge_social_posts(jsonb) to service_role;
grant execute on function public.knowledge_social_inbox_snapshot(),
  public.link_knowledge_social_post(uuid,uuid,uuid,integer) to authenticated;

commit;
