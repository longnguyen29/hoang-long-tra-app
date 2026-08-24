-- Second dimension for the ops console's Order Flow board, independent of `stage`: an order
-- can be "Production · blocked · raw material shortage" — stage alone can't say that.
alter table orders add column if not exists health text not null default 'on_track';
alter table orders add constraint orders_health_check check (health in ('on_track', 'waiting', 'blocked'));

alter table orders add column if not exists waiting_on text;
alter table orders add constraint orders_waiting_on_check check (waiting_on is null or waiting_on in
  ('us', 'customer', 'supplier', 'production', 'carrier'));

alter table orders add column if not exists health_note text not null default '';
alter table orders add column if not exists health_changed_at timestamptz not null default now();
