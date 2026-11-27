begin;
create table public.document_approval_packets (
  id uuid primary key,
  title text not null check (length(title) between 1 and 160),
  seller_id text not null references public.b2b_selling_entities(id),
  order_id text references public.orders(id) on delete set null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  signer_ids uuid[] not null check (cardinality(signer_ids) between 1 and 2),
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  stamp_path text,
  approvals jsonb not null default '{}' check (jsonb_typeof(approvals) = 'object'),
  version integer not null default 1
);
create index document_approval_owner_idx on public.document_approval_packets(created_by, created_at desc);
create index document_approval_signers_idx on public.document_approval_packets using gin(signer_ids);
alter table public.document_approval_packets enable row level security;
revoke all on public.document_approval_packets from public, anon, authenticated;
grant select, insert, update on public.document_approval_packets to service_role;
notify pgrst, 'reload schema';
commit;
