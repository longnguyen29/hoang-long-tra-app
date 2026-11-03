-- Atomic reservations for assistant AI requests. No conversation text is stored.
begin;

create function public.reserve_assistant_ai_run(p_user_id uuid, p_model text)
returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_id uuid;
begin
  if p_user_id is null or p_model is null or length(p_model) not between 1 and 100 then
    raise exception 'invalid_ai_reservation';
  end if;
  -- The global lock makes both the per-person and shared caps race-safe.
  perform pg_advisory_xact_lock(hashtextextended('assistant-ai-reservation', 0));
  if (select count(*) from public.growth_ai_runs where action='assistant_extract' and user_id=p_user_id and created_at > now() - interval '1 hour') >= 10
     or (select count(*) from public.growth_ai_runs where action='assistant_extract' and created_at > now() - interval '1 day') >= 100 then
    return null;
  end if;
  insert into public.growth_ai_runs(user_id,action,model)
    values(p_user_id,'assistant_extract',p_model) returning id into v_id;
  return v_id;
end $$;

revoke all on function public.reserve_assistant_ai_run(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_assistant_ai_run(uuid,text) to service_role;
commit;
