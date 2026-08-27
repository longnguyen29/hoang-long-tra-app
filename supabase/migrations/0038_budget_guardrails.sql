-- Guardrails added after the budget ledger was transaction-tested in production.

create or replace function review_budget_allocation(
  p_id uuid,
  p_status text,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_period_id uuid; v_amount numeric; v_limit numeric; v_approved numeric;
begin
  if not is_budget_approver() then raise exception 'approver_required'; end if;
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_status'; end if;

  select period_id, amount into v_period_id, v_amount
  from budget_allocations where id = p_id and status = 'pending' for update;
  if v_period_id is null then raise exception 'allocation_not_pending'; end if;

  if p_status = 'approved' then
    select total_limit into v_limit from budget_periods where id = v_period_id for update;
    select coalesce(sum(amount), 0) into v_approved from budget_allocations
    where period_id = v_period_id and status = 'approved';
    if v_approved + v_amount > v_limit then raise exception 'period_limit_exceeded'; end if;
  end if;

  update budget_allocations
  set status = p_status,
      approved_by = auth.uid(),
      approved_at = now(),
      review_note = btrim(coalesce(p_note, '')),
      updated_at = now()
  where id = p_id and status = 'pending';
end;
$$;
create or replace function create_budget_spend(
  p_allocation_id uuid,
  p_description text,
  p_vendor text,
  p_amount numeric,
  p_status text,
  p_incurred_on date,
  p_due_on date,
  p_linked_app text default '',
  p_linked_ref text default '',
  p_outcome_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_limit numeric; v_used numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned', 'committed', 'paid') then raise exception 'invalid_status'; end if;
  if coalesce(p_linked_app, '') not in ('', 'orders', 'pipeline', 'operations', 'control', 'house') then raise exception 'invalid_linked_app'; end if;
  if btrim(coalesce(p_description, '')) = '' or coalesce(p_amount, 0) <= 0 then raise exception 'description_and_amount_required'; end if;

  select amount into v_limit from budget_allocations where id = p_allocation_id and status = 'approved' for update;
  if v_limit is null then raise exception 'approved_allocation_required'; end if;
  select coalesce(sum(amount), 0) into v_used from budget_spend_items
  where allocation_id = p_allocation_id and status in ('committed', 'paid');
  if p_status in ('committed', 'paid') and v_used + p_amount > v_limit then raise exception 'allocation_exceeded'; end if;

  insert into budget_spend_items(
    allocation_id, description, vendor, amount, status, incurred_on, due_on,
    linked_app, linked_ref, outcome_note
  ) values(
    p_allocation_id, btrim(p_description), btrim(coalesce(p_vendor, '')), p_amount,
    p_status, case when p_status = 'paid' then coalesce(p_incurred_on, current_date) else p_incurred_on end,
    p_due_on, coalesce(p_linked_app, ''), btrim(coalesce(p_linked_ref, '')),
    btrim(coalesce(p_outcome_note, ''))
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function set_budget_spend_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_allocation uuid; v_amount numeric; v_limit numeric; v_used numeric; v_current text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_status not in ('planned', 'committed', 'paid', 'cancelled') then raise exception 'invalid_status'; end if;

  select allocation_id, amount, status into v_allocation, v_amount, v_current
  from budget_spend_items where id = p_id for update;
  if v_allocation is null then raise exception 'spend_not_found'; end if;
  if not (
    p_status = v_current or
    (v_current = 'planned' and p_status in ('committed', 'cancelled')) or
    (v_current = 'committed' and p_status in ('paid', 'cancelled'))
  ) then raise exception 'invalid_status_transition'; end if;

  if p_status in ('committed', 'paid') then
    select amount into v_limit from budget_allocations where id = v_allocation and status = 'approved';
    if v_limit is null then raise exception 'approved_allocation_required'; end if;
    select coalesce(sum(amount), 0) into v_used from budget_spend_items
    where allocation_id = v_allocation and id <> p_id and status in ('committed', 'paid');
    if v_used + v_amount > v_limit then raise exception 'allocation_exceeded'; end if;
  end if;

  update budget_spend_items
  set status = p_status,
      incurred_on = case when p_status = 'paid' then coalesce(incurred_on, current_date) else incurred_on end,
      updated_at = now()
  where id = p_id;
end;
$$;
