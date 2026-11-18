-- Fall back to creation time for pages that have not been saved with this version.
alter table public.private_order_pages add column updated_at timestamptz;
