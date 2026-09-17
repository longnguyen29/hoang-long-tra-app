-- Phase 1 only. Apply after 0058; never replay 0057/0058 on existing databases.
-- No row rewrite of existing identity, evidence, status, contacts, drafts or versions.
begin;
alter table public.discovery_prospects
  add column account_type text not null default 'shop'
    check (account_type in ('shop','chain','distributor_wholesaler','importer','exporter_trader','horeca','manufacturer_oem','specialty_retail','other')),
  add column country_code text not null default 'VN' check (country_code ~ '^[A-Z]{2,3}$'),
  add column vertical_tags jsonb not null default '[]'::jsonb,
  add column is_watchlisted boolean not null default false,
  add constraint discovery_prospects_vertical_tags_check check (
    case when jsonb_typeof(vertical_tags) = 'array' then
      jsonb_array_length(vertical_tags) <= 30 and
      vertical_tags <@ '["coffee","milk_tea","fruit_tea","tea_house","tea_retail","restaurant","hotel","catering","beverage_ingredients","foodservice","rtd","bottled_drink","private_label","tea_import","tea_export","wholesale","premium_hospitality","ecommerce","multi_branch"]'::jsonb
    else false end
  );
create index discovery_prospects_account_status_idx on public.discovery_prospects(account_type,status,updated_at desc);
create index discovery_prospects_watchlist_idx on public.discovery_prospects(updated_at desc) where is_watchlisted;

-- Same compare-and-set version as review_discovery_prospect. Only metadata changes.
create function public.update_discovery_account_meta(
  p_id uuid, p_version integer, p_account_type text, p_country_code text,
  p_vertical_tags jsonb, p_watchlisted boolean
) returns public.discovery_prospects
language plpgsql security definer set search_path = public as $$
declare result public.discovery_prospects;
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  -- Table constraints also protect the existing direct-insert client path.
  update public.discovery_prospects set
    account_type = p_account_type, country_code = upper(trim(p_country_code)),
    vertical_tags = p_vertical_tags, is_watchlisted = p_watchlisted,
    version = version + 1, updated_at = now()
    where id = p_id and version = p_version returning * into result;
  if not found then raise exception 'stale_prospect'; end if;
  return result;
end $$;
revoke all on function public.update_discovery_account_meta(uuid,integer,text,text,jsonb,boolean) from public, anon;
grant execute on function public.update_discovery_account_meta(uuid,integer,text,text,jsonb,boolean) to authenticated;
commit;
