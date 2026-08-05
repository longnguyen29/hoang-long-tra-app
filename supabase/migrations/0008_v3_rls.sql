-- House of Hoàng Long v3.0 — Row Level Security for new tables/columns
-- Run after 0007_v3_schema.sql.

-- ---------- customer_profiles: each customer owns exactly their own row; staff can read all ----------
alter table customer_profiles enable row level security;

create policy "customer_profiles: self select" on customer_profiles
  for select using (auth.uid() = user_id);

create policy "customer_profiles: self insert" on customer_profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "customer_profiles: self update" on customer_profiles
  for update using (auth.uid() = user_id);

create policy "customer_profiles: staff select" on customer_profiles
  for select using (is_staff());

-- ---------- wholesale_accounts: customers can now self-register (pending approval) ----------
-- Existing staff-only policies from 0005_v2_rls.sql are untouched; these add self-service
-- access scoped to the caller's own row, and a customer can never approve their own account
-- (the insert check pins wholesale_verified = false; only staff can flip it via the
-- pre-existing "wholesale_accounts: staff update" policy).
create policy "wholesale_accounts: self insert" on wholesale_accounts
  for insert to authenticated
  with check (auth.uid() = user_id and wholesale_verified = false);

create policy "wholesale_accounts: self select" on wholesale_accounts
  for select using (auth.uid() = user_id);

-- ---------- tea_sessions: staff manage directly; public books only through book_tea_session() ----------
alter table tea_sessions enable row level security;

create policy "tea_sessions: staff select" on tea_sessions
  for select using (is_staff());

create policy "tea_sessions: staff update" on tea_sessions
  for update using (is_staff());

create policy "tea_sessions: staff delete" on tea_sessions
  for delete using (is_staff());

-- Deliberately no anon/authenticated insert policy on tea_sessions — bookings must go through
-- the book_tea_session() SECURITY DEFINER RPC (0009_v3_functions.sql) so the one-per-day lock
-- can't be bypassed by a direct insert.
