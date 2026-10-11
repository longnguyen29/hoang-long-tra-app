-- Run as postgres in Supabase SQL Editor after 0083. All fixtures roll back.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
do $$
declare v_manager uuid; v_source uuid; v_topic uuid; v_result jsonb; v_input jsonb; v_link jsonb; v_snapshot jsonb;
begin
  if not (select relrowsecurity from pg_class where oid='public.knowledge_social_posts'::regclass)
    or has_table_privilege('anon','public.knowledge_social_posts','SELECT')
    or has_table_privilege('authenticated','public.knowledge_social_posts','INSERT')
    or has_function_privilege('authenticated','public.ingest_knowledge_social_posts(jsonb)','EXECUTE')
    or has_function_privilege('anon','public.knowledge_social_inbox_snapshot()','EXECUTE') then
    raise exception 'social access boundary failed';
  end if;
  if public.knowledge_social_url_key('https://facebook.com/story.php?story_fbid=1&id=2') =
     public.knowledge_social_url_key('https://facebook.com/story.php?story_fbid=9&id=2') then
    raise exception 'distinct Facebook identities collapsed';
  end if;
  if public.knowledge_social_url_key('https://www.threads.net/@hl-test/post/smoke/?utm_source=a') <>
     public.knowledge_social_url_key('https://threads.com/@hl-test/post/smoke') then
    raise exception 'Threads tracking alias mismatch';
  end if;
  perform set_config('request.jwt.claim.role','service_role',true);
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  v_input := jsonb_build_array(jsonb_build_object('provider','buffer','organization_id','hl-smoke-test',
    'account_id','hl-smoke-test','account_name','Rollback fixture','channel','threads','external_post_id','hl-smoke-test',
    'title','Rollback source','body','Unreviewed source','url','https://threads.com/@hl-test/post/smoke',
    'published_at','2026-01-01T00:00:00Z','fetched_at','2026-01-02T00:00:00Z',
    'metrics_updated_at','2026-01-02T00:00:00Z','metrics',jsonb_build_object('views',0),'import_method','connector'));
  v_result := public.ingest_knowledge_social_posts(v_input);
  if v_result->>'imported'<>'1' then raise exception 'source insert failed'; end if;
  v_result := public.ingest_knowledge_social_posts(v_input);
  if v_result->>'unchanged'<>'1' then raise exception 'idempotent import failed'; end if;
  select id into v_source from public.knowledge_social_posts where organization_id='hl-smoke-test';
  v_input := jsonb_set(jsonb_set(v_input,'{0,fetched_at}','"2026-01-03T00:00:00Z"'),'{0,metrics_updated_at}','null');
  v_input := jsonb_set(v_input,'{0,metrics}','{}');
  perform public.ingest_knowledge_social_posts(v_input);
  if (select metrics->>'views' from public.knowledge_social_posts where id=v_source)<>'0' then
    raise exception 'unmeasured refresh erased known zero';
  end if;
  select user_id into v_manager from public.staff_roles where role in ('admin','manager') order by user_id limit 1;
  if v_manager is null then raise exception 'manager fixture unavailable'; end if;
  perform set_config('request.jwt.claim.role','authenticated',true);
  perform set_config('request.jwt.claim.sub',v_manager::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',v_manager)::text,true);
  begin
    perform public.ingest_knowledge_social_posts(v_input);
    raise exception 'staff import unexpectedly allowed';
  exception when raise_exception then if sqlerrm <> 'service_required' then raise; end if; end;
  select id into v_topic from public.save_knowledge_topic(null,jsonb_build_object('title','Rollback social topic','domain','tea'),null);
  v_result := public.link_knowledge_social_post(v_source,v_topic,null,null); v_link := v_result->'post';
  if v_link->>'social_post_id'<>v_source::text then raise exception 'source relationship missing'; end if;
  begin
    perform public.link_knowledge_social_post(v_source,v_topic,null,0);
    raise exception 'stale source assignment unexpectedly allowed';
  exception when raise_exception then if sqlerrm <> 'knowledge_post_conflict' then raise; end if; end;
  select to_jsonb(p) into v_link from public.save_knowledge_post((v_link->>'id')::uuid,
    jsonb_build_object('metrics',jsonb_build_object('orders',1),'measurement_note','Explicit manual attribution'),
    (v_link->>'version')::integer) p;
  begin
    perform public.save_knowledge_post((v_link->>'id')::uuid,jsonb_build_object('metrics',jsonb_build_object('views',999)),(v_link->>'version')::integer);
    raise exception 'competing platform source unexpectedly allowed';
  exception when raise_exception then if sqlerrm <> 'knowledge_social_source_is_canonical' then raise; end if; end;
  select to_jsonb(p) into v_link from public.save_knowledge_post((v_link->>'id')::uuid,
    jsonb_build_object('status','archived'),(v_link->>'version')::integer) p;
  v_result := public.link_knowledge_social_post(v_source,v_topic,null,(v_link->>'version')::integer);
  if v_result#>>'{post,status}'<>'archived' then raise exception 'archive revived by relink'; end if;
  v_snapshot := public.knowledge_social_inbox_snapshot();
  if not exists(select 1 from jsonb_array_elements(v_snapshot->'posts') s where s->>'id'=v_source::text)
    or not exists(select 1 from jsonb_array_elements(v_snapshot->'links') p where p->>'social_post_id'=v_source::text) then
    raise exception 'source archive/history unavailable';
  end if;
end $$;
select 'PASS: access, identities, idempotency, metric freshness, assignment conflicts, canonical source, archive history' as verification;
rollback;
