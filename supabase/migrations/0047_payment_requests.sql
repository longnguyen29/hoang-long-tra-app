-- Issue one validated payment request for any payable order, retail or wholesale.
-- This is an internal receivable/payment request, not a statutory e-invoice.
begin;

create or replace function issue_receivable(
  p_order_id text,
  p_invoice_number text,
  p_issued_at date,
  p_due_at date,
  p_payment_terms text,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_id text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;

  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if coalesce(v_order.estimated_total, 0) <= 0 then raise exception 'order_has_no_total'; end if;
  if exists (select 1 from receivables where order_id = v_order.id) then
    raise exception 'receivable_exists';
  end if;
  if p_due_at is not null and p_due_at < coalesce(p_issued_at, current_date) then
    raise exception 'due_date_before_issue_date';
  end if;

  v_id := 'recv-' || v_order.id;
  insert into receivables(
    id, order_id, partner_account_id, invoice_number, issued_at, due_at,
    total, paid, status, payment_terms, note
  ) values (
    v_id, v_order.id, v_order.partner_account_id,
    left(btrim(coalesce(p_invoice_number, '')), 120), coalesce(p_issued_at, current_date), p_due_at,
    v_order.estimated_total, 0, 'open',
    left(btrim(coalesce(p_payment_terms, '')), 500), left(btrim(coalesce(p_note, '')), 1000)
  );

  return v_id;
end;
$$;

revoke all on function issue_receivable(text,text,date,date,text,text) from public;
revoke all on function issue_receivable(text,text,date,date,text,text) from anon;
grant execute on function issue_receivable(text,text,date,date,text,text) to authenticated;

commit;
