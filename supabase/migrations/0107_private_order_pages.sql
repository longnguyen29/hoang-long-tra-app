create table public.private_order_pages (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 30),
  active boolean not null default false check (not active or jsonb_array_length(items) > 0),
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
alter table public.private_order_pages enable row level security;
revoke all on public.private_order_pages from public, anon, authenticated;
grant select, insert, update on public.private_order_pages to service_role;

-- Keep the receipt independent of later edits to the customer page or the order.
create table public.private_order_receipts (
  request_id uuid primary key,
  page_id uuid not null references public.private_order_pages(id),
  request_hash text not null,
  order_id text not null
);
alter table public.private_order_receipts enable row level security;
revoke all on public.private_order_receipts from public, anon, authenticated;
grant select, insert on public.private_order_receipts to service_role;

create function public.submit_private_order(
  p_token uuid, p_revision integer, p_request uuid, p_quantities jsonb,
  p_contact text, p_address text, p_note text, p_payment text
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  page public.private_order_pages%rowtype;
  receipt public.private_order_receipts%rowtype;
  offered jsonb;
  quantity numeric;
  amount numeric;
  lines jsonb := '[]';
  total numeric := 0;
  kilograms numeric := 0;
  line_count integer := 0;
  fingerprint text;
  v_order_id text;
begin
  if p_request is null or p_revision is null or p_payment is null or p_payment not in ('qr','cash')
    or coalesce(char_length(btrim(p_contact)),0) not between 1 and 240
    or coalesce(char_length(btrim(p_address)),0) not between 1 and 1000
    or char_length(coalesce(p_note,'')) > 1000
    or jsonb_typeof(p_quantities) is distinct from 'object'
  then raise exception 'invalid_order'; end if;

  select * into page from public.private_order_pages where token = p_token for update;
  if not found then raise exception 'page_closed'; end if;

  fingerprint := md5(jsonb_build_array(p_revision,p_quantities,p_contact,p_address,p_note,p_payment)::text);
  select * into receipt from public.private_order_receipts where request_id = p_request;
  if found then
    if receipt.page_id <> page.id or receipt.request_hash <> fingerprint then raise exception 'request_conflict'; end if;
    return receipt.order_id;
  end if;
  if not page.active then raise exception 'page_closed'; end if;
  if page.revision <> p_revision then raise exception 'page_changed'; end if;

  for offered in select value from jsonb_array_elements(page.items) loop
    if not (p_quantities ? (offered->>'id')) then continue; end if;
    if jsonb_typeof(p_quantities->(offered->>'id')) is distinct from 'number' then raise exception 'invalid_order'; end if;
    quantity := (p_quantities->>(offered->>'id'))::numeric;
    if quantity <= 0 or quantity > 100000 or quantity <> round(quantity,3)
      or (offered->>'unit' <> 'kg' and quantity <> trunc(quantity)) then raise exception 'invalid_order'; end if;
    amount := round(quantity * (offered->>'price')::numeric);
    total := total + amount;
    if offered->>'unit' = 'kg' then kilograms := kilograms + quantity; end if;
    line_count := line_count + 1;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'name', offered->>'name', 'weight', nullif(offered->>'weight',''),
      'unit', offered->>'unit', 'qty', quantity, 'price', (offered->>'price')::numeric, 'total', amount
    ));
  end loop;
  if line_count = 0 or line_count <> (select count(*) from jsonb_object_keys(p_quantities)) or total <= 0
    then raise exception 'invalid_order'; end if;

  v_order_id := 'order-private-' || p_request::text;
  insert into public.orders(id,type,customer_name,contact,address,note,lines,total_kg,estimated_total,payment_method,status,unread)
  values (v_order_id,'wholesale',page.customer_name,btrim(p_contact),btrim(p_address),coalesce(p_note,''),lines,kilograms,total,p_payment,'pending',true);
  insert into public.private_order_receipts(request_id,page_id,request_hash,order_id)
  values (p_request,page.id,fingerprint,v_order_id);
  return v_order_id;
end;
$$;
revoke all on function public.submit_private_order(uuid,integer,uuid,jsonb,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_private_order(uuid,integer,uuid,jsonb,text,text,text,text) to service_role;
