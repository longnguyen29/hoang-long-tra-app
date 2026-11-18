alter table public.trade_opportunities
  add column delivery_address text not null default '' check (char_length(delivery_address) <= 1000);

alter table public.private_order_pages
  add column opportunity_id text references public.trade_opportunities(id) on delete set null,
  add column delivery_contact text not null default '' check (char_length(delivery_contact) <= 240),
  add column delivery_address text not null default '' check (char_length(delivery_address) <= 1000);

create index private_order_pages_opportunity_idx on public.private_order_pages(opportunity_id)
  where opportunity_id is not null;

create or replace function public.submit_private_order(
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
      'name', offered->>'name', 'productId', nullif(offered->>'productId',''),
      'weight', nullif(case when offered ? 'productId' then offered->>'variantWeight' else offered->>'weight' end,''),
      'unit', offered->>'unit', 'qty', quantity, 'price', (offered->>'price')::numeric, 'total', amount
    ));
  end loop;
  if line_count = 0 or line_count <> (select count(*) from jsonb_object_keys(p_quantities)) or total <= 0
    then raise exception 'invalid_order'; end if;

  v_order_id := 'order-private-' || p_request::text;
  insert into public.orders(id,type,customer_name,contact,address,note,lines,total_kg,estimated_total,payment_method,status,unread)
  values (v_order_id,'wholesale',page.customer_name,btrim(p_contact),btrim(p_address),coalesce(p_note,''),lines,kilograms,total,p_payment,'pending',true);
  if page.opportunity_id is not null then
    insert into public.customer_directory_order_links(order_id,opportunity_id) values (v_order_id,page.opportunity_id);
  end if;
  insert into public.private_order_receipts(request_id,page_id,request_hash,order_id)
  values (p_request,page.id,fingerprint,v_order_id);
  return v_order_id;
end;
$$;
