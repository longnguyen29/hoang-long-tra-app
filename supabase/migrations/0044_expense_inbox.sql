-- Capture a real expense immediately, then classify it into the controlled budget ledger later.

create table if not exists expense_inbox (
  id uuid primary key default gen_random_uuid(),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount numeric(14,2) not null check (amount > 0),
  vendor text not null default '',
  incurred_on date not null default current_date,
  payment_status text not null default 'paid' check (payment_status in ('planned', 'committed', 'paid')),
  suggested_envelope_code text references budget_envelopes(code) on delete set null,
  note text not null default '',
  status text not null default 'unsorted' check (status in ('unsorted', 'classified', 'cancelled')),
  allocation_id uuid references budget_allocations(id) on delete set null,
  spend_item_id uuid references budget_spend_items(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  classified_by uuid references auth.users(id) on delete set null,
  classified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_inbox_status_date_idx
  on expense_inbox(status, incurred_on desc, created_at desc);
create index if not exists expense_inbox_creator_idx
  on expense_inbox(created_by, created_at desc);

alter table expense_inbox enable row level security;

drop policy if exists "expense_inbox: staff select" on expense_inbox;
create policy "expense_inbox: staff select" on expense_inbox
  for select using (is_staff());

create or replace function create_quick_expense(
  p_description text,
  p_amount numeric,
  p_vendor text default '',
  p_incurred_on date default current_date,
  p_payment_status text default 'paid',
  p_suggested_envelope_code text default null,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if btrim(coalesce(p_description, '')) = '' or coalesce(p_amount, 0) <= 0 then
    raise exception 'description_and_amount_required';
  end if;
  if p_payment_status not in ('planned', 'committed', 'paid') then raise exception 'invalid_status'; end if;
  if p_suggested_envelope_code is not null and not exists(
    select 1 from budget_envelopes where code = p_suggested_envelope_code and active
  ) then raise exception 'invalid_envelope'; end if;

  insert into expense_inbox(
    description, amount, vendor, incurred_on, payment_status,
    suggested_envelope_code, note, created_by
  ) values(
    btrim(p_description), p_amount, btrim(coalesce(p_vendor, '')),
    coalesce(p_incurred_on, current_date), p_payment_status,
    p_suggested_envelope_code, btrim(coalesce(p_note, '')), auth.uid()
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function classify_quick_expense(p_id uuid, p_allocation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_expense expense_inbox%rowtype; v_spend_id uuid;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select * into v_expense from expense_inbox where id = p_id for update;
  if v_expense.id is null then raise exception 'expense_not_found'; end if;
  if v_expense.status <> 'unsorted' then raise exception 'expense_already_sorted'; end if;

  v_spend_id := create_budget_spend(
    p_allocation_id,
    v_expense.description,
    v_expense.vendor,
    v_expense.amount,
    v_expense.payment_status,
    v_expense.incurred_on,
    null,
    'operations',
    'quick-expense:' || v_expense.id::text,
    v_expense.note
  );

  update expense_inbox set
    status = 'classified', allocation_id = p_allocation_id, spend_item_id = v_spend_id,
    classified_by = auth.uid(), classified_at = now(), updated_at = now()
  where id = p_id;

  return v_spend_id;
end;
$$;

revoke all on function create_quick_expense(text,numeric,text,date,text,text,text) from public;
revoke all on function create_quick_expense(text,numeric,text,date,text,text,text) from anon;
grant execute on function create_quick_expense(text,numeric,text,date,text,text,text) to authenticated;

revoke all on function classify_quick_expense(uuid,uuid) from public;
revoke all on function classify_quick_expense(uuid,uuid) from anon;
grant execute on function classify_quick_expense(uuid,uuid) to authenticated;
