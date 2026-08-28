-- Carrier-owned delivery state. The order remains the source of truth for its internal
-- workflow; these fields keep the latest authenticated update received from the carrier.
alter table orders add column if not exists shipping_carrier text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_shipping_carrier_check') then
    alter table orders add constraint orders_shipping_carrier_check check (
      shipping_carrier is null or shipping_carrier in ('viettel_post', 'vietnam_post')
    );
  end if;
end $$;
alter table orders add column if not exists carrier_status_code text not null default '';
alter table orders add column if not exists carrier_status_name text not null default '';
alter table orders add column if not exists carrier_status_at timestamptz;
alter table orders add column if not exists carrier_event_key text not null default '';
alter table orders add column if not exists delivered_at timestamptz;

create unique index if not exists orders_carrier_tracking_idx
  on orders(shipping_carrier, tracking_code)
  where shipping_carrier is not null and tracking_code <> '';

-- Carrier webhooks may retry. A stable external reference makes their activity timeline
-- idempotent even if two identical deliveries reach the app at the same time.
alter table order_events add column if not exists external_ref text;
create unique index if not exists order_events_external_ref_idx
  on order_events(external_ref)
  where external_ref is not null;
