-- Record staff-confirmed interests without changing historical enquiries or orders.
alter table public.trade_opportunities
  add column if not exists product_interest text not null default '';
