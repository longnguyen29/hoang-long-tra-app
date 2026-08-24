-- Internal ops console's 7-stage Order Flow board (public/ops/index.html), independent of
-- the customer-facing `status` (pending/confirmed/shipped/completed). Backfills a reasonable
-- starting stage for existing rows from their current status; new rows default to new_order.
alter table orders add column if not exists stage text;

update orders set stage = case status
  when 'pending' then 'new_order'
  when 'confirmed' then 'confirm_details'
  when 'shipped' then 'shipping'
  when 'completed' then 'completed'
  else 'new_order'
end
where stage is null;

alter table orders alter column stage set default 'new_order';
alter table orders alter column stage set not null;
alter table orders add constraint orders_stage_check check (stage in
  ('new_order', 'confirm_details', 'prepare_materials', 'production', 'packing', 'shipping', 'completed'));
