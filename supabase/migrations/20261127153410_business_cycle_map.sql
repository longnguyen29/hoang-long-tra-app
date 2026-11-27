begin;
alter table public.business_growth_plans
  add column cycle jsonb check (cycle is null or (
    jsonb_typeof(cycle) = 'object' and octet_length(cycle::text) <= 7000
  ));
notify pgrst, 'reload schema';
commit;
