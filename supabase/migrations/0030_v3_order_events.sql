-- Activity timeline for the ops console's order panel. No FK to orders.id — deliberately, so
-- an order's history survives even past its own deletion (the row itself is already preserved
-- 7 days via deleted_records; this log is a longer-lived, independent trail).
create table if not exists order_events (
  id bigserial primary key,
  order_id text not null,
  kind text not null,
  message text not null,
  actor text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_id_idx on order_events(order_id, created_at desc);

alter table order_events enable row level security;
-- No policies: only the service-role client (ops API routes) ever touches this table, same
-- posture as every other ops-only write path added in this PR series.
