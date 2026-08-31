-- Anonymous first-party B2B funnel. No customer name, phone, address or free-form text.

create table if not exists website_conversion_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  event_name text not null check(event_name in (
    'home_view','home_sample_clicked','wholesale_view','wholesale_sample_clicked',
    'trade_brief_started','trade_lead_submitted','sample_view','sample_pack_selected',
    'sample_details_started','sample_submitted'
  )),
  session_id text not null check(char_length(session_id) between 8 and 80),
  path text not null default '',
  referrer text not null default '',
  source text not null default 'direct',
  medium text not null default '',
  campaign text not null default '',
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object')
);

create index if not exists website_conversion_events_time_idx on website_conversion_events(ts desc,event_name);
create index if not exists website_conversion_events_source_idx on website_conversion_events(source,ts desc);
alter table website_conversion_events enable row level security;
drop policy if exists "website conversions: manager select" on website_conversion_events;
drop policy if exists "website conversions: manager delete" on website_conversion_events;
create policy "website conversions: manager select" on website_conversion_events for select using(is_staff());
create policy "website conversions: manager delete" on website_conversion_events for delete using(is_staff());

create or replace function record_public_conversion_event(
  p_event_name text,p_session text,p_path text,p_referrer text,p_source text,
  p_medium text,p_campaign text,p_content text,p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path=public
as $$
begin
  if p_event_name not in (
    'home_view','home_sample_clicked','wholesale_view','wholesale_sample_clicked',
    'trade_brief_started','trade_lead_submitted','sample_view','sample_pack_selected',
    'sample_details_started','sample_submitted'
  ) then raise exception 'invalid_conversion_event'; end if;
  if char_length(btrim(coalesce(p_session,''))) not between 8 and 80 then raise exception 'invalid_session'; end if;
  insert into website_conversion_events(event_name,session_id,path,referrer,source,medium,campaign,content,metadata)
  values(
    p_event_name,left(btrim(p_session),80),left(btrim(coalesce(p_path,'')),120),
    left(btrim(coalesce(p_referrer,'')),200),left(regexp_replace(lower(btrim(coalesce(p_source,'direct'))),'[^a-z0-9._-]','-','g'),80),
    left(regexp_replace(lower(btrim(coalesce(p_medium,''))),'[^a-z0-9._-]','-','g'),80),
    left(regexp_replace(lower(btrim(coalesce(p_campaign,''))),'[^a-z0-9._-]','-','g'),80),
    left(regexp_replace(lower(btrim(coalesce(p_content,''))),'[^a-z0-9._-]','-','g'),80),
    jsonb_strip_nulls(jsonb_build_object(
      'pack',nullif(left(btrim(coalesce(coalesce(p_metadata,'{}'::jsonb)->>'pack','')),24),''),
      'placement',nullif(left(btrim(coalesce(coalesce(p_metadata,'{}'::jsonb)->>'placement','')),48),'')
    ))
  );
end;
$$;

revoke all on function record_public_conversion_event(text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function record_public_conversion_event(text,text,text,text,text,text,text,text,jsonb) to anon,authenticated;

create or replace function b2b_conversion_snapshot(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_days integer:=greatest(1,least(coalesce(p_days,30),365));
  v_from timestamptz:=now()-make_interval(days=>v_days);
  v_result jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  with base as (
    select * from website_conversion_events where ts>=v_from
  ), source_rows as (
    select source,
      count(*) filter(where event_name='sample_submitted') sample_requests,
      count(*) filter(where event_name='trade_lead_submitted') trade_leads
    from base group by source
    having count(*) filter(where event_name in ('sample_submitted','trade_lead_submitted'))>0
  )
  select jsonb_build_object(
    'days',v_days,
    'home_visitors',(select count(distinct session_id) from base where event_name='home_view'),
    'wholesale_visitors',(select count(distinct session_id) from base where event_name='wholesale_view'),
    'sample_visitors',(select count(distinct session_id) from base where event_name='sample_view'),
    'sample_starts',(select count(distinct session_id) from base where event_name='sample_details_started'),
    'sample_requests',(select count(*) from base where event_name='sample_submitted'),
    'trade_leads',(select count(*) from base where event_name='trade_lead_submitted'),
    'sample_clicks',(select count(*) from base where event_name in ('home_sample_clicked','wholesale_sample_clicked')),
    'by_source',coalesce((select jsonb_agg(to_jsonb(source_rows) order by sample_requests desc,trade_leads desc) from source_rows),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function b2b_conversion_snapshot(integer) from public,anon;
grant execute on function b2b_conversion_snapshot(integer) to authenticated;
