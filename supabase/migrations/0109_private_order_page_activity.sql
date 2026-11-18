-- Earlier edits have no reliable change timestamp. Use creation time until the next save.
alter table public.private_order_pages add column updated_at timestamptz;
update public.private_order_pages set updated_at = created_at;
alter table public.private_order_pages
  alter column updated_at set default now(),
  alter column updated_at set not null;
