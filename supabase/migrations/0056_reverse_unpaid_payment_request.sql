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
  if exists (select 1 from receivables where order_id = v_order.id and status <> 'void') then
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
  ) on conflict (order_id) do update set
    invoice_number=excluded.invoice_number, issued_at=excluded.issued_at,
    due_at=excluded.due_at, total=excluded.total, paid=0, status='open',
    payment_terms=excluded.payment_terms, note=excluded.note, updated_at=now()
    where receivables.status='void' and receivables.paid=0
      and not exists (select 1 from receivable_payments where receivable_id=receivables.id);
  if not found then raise exception 'receivable_has_payments'; end if;
  insert into order_events(order_id,kind,message,actor)
    values(v_order.id,'payment_request_issued','Yêu cầu thanh toán: ' || v_order.estimated_total::text,auth.uid()::text);

  return v_id;
end;
$$;

revoke all on function issue_receivable(text,text,date,date,text,text) from public;
revoke all on function issue_receivable(text,text,date,date,text,text) from anon;
grant execute on function issue_receivable(text,text,date,date,text,text) to authenticated;


create or replace function void_unpaid_receivable(p_order_id text, p_receivable_id text, p_updated_at timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare r receivables%rowtype;
begin
  if not exists(select 1 from staff_roles where user_id=auth.uid() and role in ('admin','manager'))
    then raise exception 'not_authorised'; end if;
  -- Same lock order as issue_receivable. Payment recording locks this receivable too.
  perform 1 from orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into r from receivables where id=p_receivable_id and order_id=p_order_id for update;
  if not found then raise exception 'receivable_not_found'; end if;
  if r.status='void' then return; end if;
  if p_updated_at is null or r.updated_at <> p_updated_at then raise exception 'receivable_changed'; end if;
  if r.paid<>0 or exists(select 1 from receivable_payments where receivable_id=r.id)
    then raise exception 'receivable_has_payments'; end if;
  if r.status not in ('open','draft') then raise exception 'receivable_not_open'; end if;
  update receivables set status='void',updated_at=now() where id=r.id;
  insert into order_events(order_id,kind,message,actor)
    values(p_order_id,'payment_request_voided','Hủy yêu cầu thanh toán nhập nhầm. Bản ghi trước khi hủy: ' || row_to_json(r)::text,auth.uid()::text);
end;
$$;
revoke all on function void_unpaid_receivable(text,text,timestamptz) from public, anon;
grant execute on function void_unpaid_receivable(text,text,timestamptz) to authenticated;

commit;
