-- Keep kilogram sales and existing reservations on the base stock ledger.
-- The 100g packs are distinct sale units with their own recorded stock.
do $migration$
declare
  definition text;
  original text := 'if exists(select 1 from public.catalog_variants where product_id=product_id_value) then raise exception ''cart_changed''; end if;';
  updated text := 'if product_id_value not in (''hong-tra-shan-khoi'',''hong-tra-shan-mat'',''luc-tra-lai-tieu-chuan'') and exists(select 1 from public.catalog_variants where product_id=product_id_value) then raise exception ''cart_changed''; end if;';
begin
  select pg_get_functiondef('public.submit_retail_volume_order(text,text,text,text,text,jsonb,integer,numeric,text)'::regprocedure) into strict definition;
  if strpos(definition,updated) = 0 then
    if strpos(definition,original) = 0 then
      raise exception 'retail_base_checkout_guard_changed';
    end if;
    execute replace(definition,original,updated);
  end if;
end
$migration$;

with formats(product_id, price_variant, divisor, track_new_pack) as (
  values
    ('daily-green-tea-iced-tea-mu3w9lr0', '500g', 5, false),
    ('hong-tra-shan-khoi', null, 10, false),
    ('hong-tra-shan-mat', null, 10, true),
    ('luc-tra-lai-tieu-chuan', null, 10, false),
    ('luc-tra-ngoc-lan', '1kg', 10, false),
    ('luc-tra-shan-moc', 'Kg', 10, false)
)
insert into public.catalog_variants(product_id, weight, price, stock_ha_giang, stock_soc_son)
select p.id, '100g', round(case when f.price_variant is null then p.price else v.price end / f.divisor),
  case when f.track_new_pack then 0 end, case when f.track_new_pack then 0 end
from formats f
join public.catalog_products p on p.id=f.product_id
left join public.catalog_variants v on v.product_id=p.id and v.weight=f.price_variant
where p.available and p.kind='tea' and p.line='everyday' and not p.limited
  and case when f.price_variant is null then p.price else v.price end > 0
on conflict (product_id, weight) do nothing;
