-- Keep the original matching key intact while staff maintain preferred contacts.
alter table public.trade_opportunities
  add column if not exists preferred_contact text,
  add column if not exists additional_contacts text[] not null default '{}'::text[];
