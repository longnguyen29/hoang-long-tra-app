-- Order Flow: an internal staff-only stage (finer-grained than the customer-facing `status`),
-- a per-order checklist staff can tick off at each stage, and a place to log real problems
-- against a real order — the Front Desk › Orders › Board view.
--
-- Additive only. Nothing here drops or rewrites `status`, `note`, or anything the public
-- site/track_order RPC reads — the customer-facing order-tracking page is untouched.

-- ---------- orders: new staff-only columns ----------
alter table orders
  add column if not exists stage text not null default 'new_order'
    check (stage in ('new_order', 'confirm_details', 'prepare_materials', 'production', 'packing', 'shipping', 'completed')),
  add column if not exists stage_checklist jsonb not null default '{}'::jsonb;

-- Backfill existing rows from their current customer-facing status, so nothing already in
-- flight lands back at square one. Best-effort, not precise — there's no record of *when*
-- status last changed, so e.g. a 'confirmed' order lands mid-flow rather than staff having to
-- re-triage the whole order book by hand. Only touches rows still on the column default, so
-- re-running this migration (or applying it after staff have already started moving orders
-- along the board) is harmless.
update orders set stage = case status
  when 'pending' then 'new_order'
  when 'confirmed' then 'confirm_details'
  when 'shipped' then 'shipping'
  when 'completed' then 'completed'
  else 'new_order'
end
where stage = 'new_order';

create index if not exists orders_stage_idx on orders(stage);

-- ---------- order_issues: a real problem logged against a real order ----------
-- The *playbook* of common problems/suggested fixes is static config in lib/constants.js
-- (ISSUE_CATEGORIES / ISSUE_PLAYBOOK) — like the rest of the app's copy, nobody edits it from
-- the UI, so it doesn't need a table. This table is only for an actual flagged issue on an
-- actual order — the Issues & Solutions panel in the mockup this feature is based on.
create table if not exists order_issues (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id) on delete cascade,
  category text not null default 'other' check (category in ('material', 'customer', 'documentation', 'logistics', 'other')),
  title text not null,
  impact text not null default 'medium' check (impact in ('low', 'medium', 'high')),
  suggested_fix text not null default '',
  escalate_to text not null default '',
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists order_issues_order_id_idx on order_issues(order_id);
create index if not exists order_issues_open_idx on order_issues(order_id) where not resolved;

alter table order_issues enable row level security;

create policy "order_issues: staff select" on order_issues for select using (is_staff());
create policy "order_issues: staff insert" on order_issues for insert with check (is_staff());
create policy "order_issues: staff update" on order_issues for update using (is_staff());
create policy "order_issues: staff delete" on order_issues for delete using (is_staff());

-- No public access of any kind: these are internal operational notes about an order, not
-- something a customer looking up their own order (via track_order, which returns only
-- id + status) should ever see.
