-- Strip query strings and fragments from public referrers. These can contain personal
-- data on third-party sites and are not needed to understand acquisition sources.

update website_conversion_events
set referrer=left(split_part(split_part(referrer,'?',1),'#',1),200)
where referrer like '%?%' or referrer like '%#%';

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
    left(split_part(split_part(btrim(coalesce(p_referrer,'')),'?',1),'#',1),200),
    left(regexp_replace(lower(btrim(coalesce(p_source,'direct'))),'[^a-z0-9._-]','-','g'),80),
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
