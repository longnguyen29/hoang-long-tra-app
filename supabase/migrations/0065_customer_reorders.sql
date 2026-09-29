-- A staff-created reorder is a new order with the same fulfillment flow. Keep its
-- source ID even if the earlier order is later archived or removed.
alter table orders add column if not exists reorder_of_order_id text;
create index if not exists orders_reorder_of_order_id_idx
  on orders(reorder_of_order_id) where reorder_of_order_id is not null;
