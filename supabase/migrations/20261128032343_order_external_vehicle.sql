begin;
alter table public.orders
  add column external_vehicle jsonb
  check (external_vehicle is null or (
    jsonb_typeof(external_vehicle) = 'object'
    and coalesce(jsonb_typeof(external_vehicle->'phone') = 'string', false)
    and coalesce(jsonb_typeof(external_vehicle->'plate') = 'string', false)
    and char_length(external_vehicle->>'phone') <= 50
    and char_length(external_vehicle->>'plate') <= 40
  ));

-- Callers creating orders through public checkout cannot populate private notes.
create policy orders_external_vehicle_empty_on_client_insert
  on public.orders as restrictive for insert to anon, authenticated
  with check (external_vehicle is null);
notify pgrst, 'reload schema';
commit;
