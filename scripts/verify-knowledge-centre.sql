-- Run the entire file in the privileged Supabase SQL editor. All test rows and
-- transaction-local authentication claims disappear at ROLLBACK. No IDs or
-- business data are returned; existing Growth/customer/order rows are read only.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  v_name text;
  v_relation regclass;
  v_function regprocedure;
  v_manager uuid;
  v_variant uuid;
  v_topic public.knowledge_topics%rowtype;
  v_child public.knowledge_topics%rowtype;
  v_angle public.knowledge_angles%rowtype;
  v_post public.knowledge_posts%rowtype;
  v_snapshot jsonb;
begin
  foreach v_name in array array['knowledge_topics', 'knowledge_angles', 'knowledge_posts'] loop
    v_relation := format('public.%I', v_name)::regclass;
    if not (select relrowsecurity from pg_class where oid = v_relation) or
      (select count(*) from pg_policy where polrelid = v_relation) <> 1 or not exists (
        select 1 from pg_policy where polrelid = v_relation and polcmd = 'r'
          and polroles = array[(select oid from pg_roles where rolname = 'authenticated')]
          and pg_get_expr(polqual, polrelid) ~ 'is_staff\(\)'
      ) then raise exception 'knowledge_rls_assertion_failed'; end if;
    if not has_table_privilege('authenticated', v_relation, 'SELECT') or
      has_table_privilege('authenticated', v_relation, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or
      has_table_privilege('anon', v_relation, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or exists (
        select 1 from pg_class c, lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
        where c.oid = v_relation and a.grantee = 0
      ) then raise exception 'knowledge_table_grant_assertion_failed'; end if;
    if (select count(*) from pg_attribute where attrelid = v_relation and not attisdropped
      and attname in ('version', 'created_by', 'updated_by', 'created_at', 'updated_at') and attnotnull) <> 5 then
      raise exception 'knowledge_audit_catalog_assertion_failed';
    end if;
  end loop;

  foreach v_name in array array['save_knowledge_topic(uuid,jsonb,integer)',
    'save_knowledge_angle(uuid,jsonb,integer)', 'save_knowledge_post(uuid,jsonb,integer)', 'knowledge_centre_snapshot()'] loop
    v_function := ('public.' || v_name)::regprocedure;
    if not exists (select 1 from pg_proc where oid = v_function and prosecdef
      and proconfig @> array['search_path=pg_catalog, public']) or
      not has_function_privilege('authenticated', v_function, 'EXECUTE') or
      has_function_privilege('anon', v_function, 'EXECUTE') or exists (
        select 1 from pg_proc p, lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where p.oid = v_function and a.grantee = 0 and a.privilege_type = 'EXECUTE'
      ) then raise exception 'knowledge_rpc_catalog_assertion_failed'; end if;
  end loop;
  foreach v_name in array array['knowledge_https_url_valid(text)', 'knowledge_sources_valid(jsonb)',
    'knowledge_metrics_valid(jsonb)', 'knowledge_validate_fields(jsonb,text[],text[],text[],text[])'] loop
    v_function := ('public.' || v_name)::regprocedure;
    if has_function_privilege('authenticated', v_function, 'EXECUTE') or
      has_function_privilege('anon', v_function, 'EXECUTE') then
      raise exception 'knowledge_helper_grant_assertion_failed';
    end if;
  end loop;
  if not exists (select 1 from pg_constraint where conrelid = 'public.knowledge_posts'::regclass
      and confrelid = 'public.knowledge_angles'::regclass and confdeltype = 'r'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (angle_id, topic_id)%') or
    not exists (select 1 from pg_constraint where conrelid = 'public.knowledge_posts'::regclass
      and confrelid = 'public.growth_variants'::regclass and confdeltype = 'r') or
    not exists (select 1 from pg_constraint where conrelid = 'public.knowledge_posts'::regclass
      and contype = 'u' and pg_get_constraintdef(oid) = 'UNIQUE (growth_variant_id)') then
    raise exception 'knowledge_link_catalog_assertion_failed';
  end if;

  select user_id into v_manager from public.staff_roles where role in ('admin', 'manager') limit 1;
  if v_manager is null then raise exception 'verification_requires_existing_manager'; end if;
  select id into v_variant from public.growth_variants limit 1;
  perform set_config('request.jwt.claim.sub', v_manager::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select * into strict v_topic from public.save_knowledge_topic(null,
    '{"domain":"tea","title":"Rollback verification topic","sources":[{"label":"Verification URL","url":"https://example.com/verification"}]}'::jsonb, null);
  select * into strict v_child from public.save_knowledge_topic(null,
    jsonb_build_object('domain', 'tea', 'title', 'Rollback verification child', 'parent_id', v_topic.id), null);
  select * into strict v_angle from public.save_knowledge_angle(null,
    jsonb_build_object('topic_id', v_topic.id, 'title', 'Rollback verification angle'), null);
  select * into strict v_post from public.save_knowledge_post(null,
    jsonb_build_object('topic_id', v_topic.id, 'angle_id', v_angle.id, 'channel', 'other',
      'title', 'Rollback verification external post', 'url', 'https://example.com/verification-post',
      'published_at', null, 'metrics', jsonb_build_object('views', 0, 'likes', null, 'revenue', 0.5, 'spend', null)), null);
  if v_topic.version <> 1 or v_topic.created_by <> v_manager or v_topic.updated_by <> v_manager or
    v_angle.version <> 1 or v_angle.topic_id <> v_topic.id or v_angle.created_by <> v_manager or
    v_post.version <> 1 or v_post.created_by <> v_manager or v_post.updated_by <> v_manager or
    v_post.metrics->'views' <> '0'::jsonb or v_post.metrics->'likes' <> 'null'::jsonb or
    v_post.metrics->'revenue' <> '0.5'::jsonb or v_post.published_at is not null then
    raise exception 'knowledge_insert_assertion_failed';
  end if;

  select * into strict v_topic from public.save_knowledge_topic(v_topic.id, '{"status":"reviewed"}', 1);
  select * into strict v_angle from public.save_knowledge_angle(v_angle.id, '{"notes":"Verification update"}', 1);
  select * into strict v_post from public.save_knowledge_post(v_post.id, '{"measurement_note":"Verification update"}', 1);
  if v_topic.version <> 2 or v_topic.reviewed_by <> v_manager or v_topic.reviewed_at is null or
    v_angle.version <> 2 or v_post.version <> 2 then raise exception 'knowledge_update_assertion_failed'; end if;
  begin
    perform public.save_knowledge_topic(v_topic.id, '{"title":"Stale edit"}', 1);
    raise exception 'expected_knowledge_topic_conflict';
  exception when others then if sqlerrm <> 'knowledge_topic_conflict' then raise; end if; end;
  begin
    perform public.save_knowledge_angle(v_angle.id, '{"title":"Stale edit"}', 1);
    raise exception 'expected_knowledge_angle_conflict';
  exception when others then if sqlerrm <> 'knowledge_angle_conflict' then raise; end if; end;
  begin
    perform public.save_knowledge_post(v_post.id, '{"title":"Stale edit"}', 1);
    raise exception 'expected_knowledge_post_conflict';
  exception when others then if sqlerrm <> 'knowledge_post_conflict' then raise; end if; end;
  begin
    perform public.save_knowledge_topic(v_topic.id, jsonb_build_object('parent_id', v_child.id), 2);
    raise exception 'expected_knowledge_topic_cycle';
  exception when others then if sqlerrm <> 'knowledge_topic_cycle' then raise; end if; end;
  if v_variant is not null then
    begin
      perform public.save_knowledge_post(null, jsonb_build_object('topic_id', v_topic.id,
        'growth_variant_id', v_variant, 'metrics', jsonb_build_object('views', 0)), null);
      raise exception 'expected_canonical_growth_metadata_rejection';
    exception when others then if sqlerrm <> 'knowledge_growth_metadata_is_canonical' then raise; end if; end;
  end if;

  select * into strict v_post from public.save_knowledge_post(v_post.id, '{"status":"archived"}', 2);
  select * into strict v_angle from public.save_knowledge_angle(v_angle.id, '{"status":"archived"}', 2);
  select * into strict v_child from public.save_knowledge_topic(v_child.id, '{"status":"archived"}', 1);
  select * into strict v_topic from public.save_knowledge_topic(v_topic.id, '{"status":"archived"}', 2);
  if v_post.status <> 'archived' or v_post.version <> 3 or v_angle.status <> 'archived' or v_angle.version <> 3 or
    v_child.status <> 'archived' or v_topic.status <> 'archived' or v_topic.version <> 3 then
    raise exception 'knowledge_archive_assertion_failed';
  end if;
  v_snapshot := public.knowledge_centre_snapshot();
  if not (v_snapshot ?& array['topics', 'angles', 'posts', 'memory_items', 'growth']) or
    not exists (select 1 from jsonb_array_elements(v_snapshot->'topics') t where t->>'id' = v_topic.id::text) then
    raise exception 'knowledge_snapshot_assertion_failed';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform public.knowledge_centre_snapshot();
    raise exception 'expected_unauthenticated_snapshot_rejection';
  exception when others then if sqlerrm <> 'manager_required' then raise; end if; end;
  execute 'reset role';
end $$;

select 'Knowledge Centre verification passed; rollback follows.' as result;
rollback;
