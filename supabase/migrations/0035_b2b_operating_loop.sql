-- Hoàng Long B2B operating loop: partner self-service, receivables, batch passports,
-- reservations, reorder signals and owner-level operating metrics.
-- Additive only. Existing orders, quotes, price agreements and catalogue rows remain intact.

alter table wholesale_accounts add column if not exists opportunity_id text references trade_opportunities(id) on delete set null;
alter table wholesale_accounts add column if not exists delivery_address text not null default '';
alter table wholesale_accounts add column if not exists tax_number text not null default '';
alter table wholesale_accounts add column if not exists reorder_cadence_days integer not null default 30 check (reorder_cadence_days between 1 and 365);
alter table wholesale_accounts add column if not exists lead_time_days integer not null default 3 check (lead_time_days between 0 and 180);

update wholesale_accounts w set opportunity_id = o.id
from trade_opportunities o
where w.opportunity_id is null
  and (o.source_id = w.id or lower(btrim(o.contact)) = lower(btrim(w.contact)));

alter table orders add column if not exists partner_account_id text references wholesale_accounts(id) on delete set null;
alter table orders add column if not exists quote_id text references trade_quotes(id) on delete set null;
create index if not exists orders_partner_account_idx on orders(partner_account_id, ts desc);

update orders o set partner_account_id = w.id
from wholesale_accounts w
where o.partner_account_id is null and o.type = 'wholesale'
  and lower(btrim(o.contact)) = lower(btrim(w.contact));

alter table trade_quotes add column if not exists partner_account_id text references wholesale_accounts(id) on delete set null;
create index if not exists trade_quotes_partner_account_idx on trade_quotes(partner_account_id, created_at desc);

update trade_quotes q set partner_account_id = w.id
from wholesale_accounts w
where q.partner_account_id is null
  and lower(btrim(q.contact)) = lower(btrim(w.contact));

create table if not exists receivables (
  id text primary key,
  order_id text not null unique references orders(id) on delete cascade,
  partner_account_id text references wholesale_accounts(id) on delete set null,
  invoice_number text not null default '',
  issued_at date not null default current_date,
  due_at date,
  total numeric(14,2) not null default 0 check (total >= 0),
  paid numeric(14,2) not null default 0 check (paid >= 0),
  status text not null default 'open' check (status in ('draft','open','partial','paid','void')),
  payment_terms text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receivables_paid_not_excessive check (paid <= total or status = 'void')
);

create table if not exists receivable_payments (
  id text primary key,
  receivable_id text not null references receivables(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null default 'bank_transfer' check (method in ('bank_transfer','cash','card','other')),
  reference text not null default '',
  note text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists receivables_due_idx on receivables(due_at) where status in ('open','partial');
create index if not exists receivables_partner_idx on receivables(partner_account_id, issued_at desc);
create index if not exists receivable_payments_receivable_idx on receivable_payments(receivable_id, paid_at desc);

create table if not exists tea_batches (
  id text primary key,
  code text not null unique,
  product_id text references catalog_products(id) on delete set null,
  name jsonb not null default '{}'::jsonb,
  origin text not null default '',
  producer text not null default '',
  harvest_date date,
  season text not null default '',
  process text not null default '',
  cultivar text not null default 'Shan Tuyết',
  tasting_notes jsonb not null default '{}'::jsonb,
  quality_metrics jsonb not null default '{}'::jsonb,
  moisture_percent numeric(5,2) check (moisture_percent is null or moisture_percent between 0 and 100),
  grade text not null default '',
  available_kg numeric(12,2) not null default 0 check (available_kg >= 0),
  reserved_kg numeric(12,2) not null default 0 check (reserved_kg >= 0 and reserved_kg <= available_kg),
  cost_per_kg numeric(14,2) check (cost_per_kg is null or cost_per_kg >= 0),
  status text not null default 'draft' check (status in ('draft','released','held','exhausted')),
  photo_url text not null default '',
  document_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists order_batch_allocations (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  batch_id text not null references tea_batches(id) on delete restrict,
  product_id text references catalog_products(id) on delete set null,
  quantity_kg numeric(12,2) not null check (quantity_kg > 0),
  created_by text not null default '',
  created_at timestamptz not null default now(),
  constraint order_batch_allocations_unique unique (order_id, batch_id, product_id)
);

create table if not exists inventory_reservations (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text not null references catalog_products(id) on delete restrict,
  variant_weight text not null default '',
  quantity numeric(12,2) not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','fulfilled','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tea_batches_product_idx on tea_batches(product_id, status);
create index if not exists allocations_order_idx on order_batch_allocations(order_id);
create index if not exists reservations_product_idx on inventory_reservations(product_id, variant_weight, status);

alter table receivables enable row level security;
alter table receivable_payments enable row level security;
alter table tea_batches enable row level security;
alter table order_batch_allocations enable row level security;
alter table inventory_reservations enable row level security;

create policy "receivables: staff select" on receivables for select using (is_staff());
create policy "receivables: staff insert" on receivables for insert to authenticated with check (is_staff());
create policy "receivables: staff update" on receivables for update using (is_staff()) with check (is_staff());
create policy "receivable_payments: staff select" on receivable_payments for select using (is_staff());
create policy "receivable_payments: staff insert" on receivable_payments for insert to authenticated with check (is_staff());
create policy "tea_batches: staff select" on tea_batches for select using (is_staff());
create policy "tea_batches: staff insert" on tea_batches for insert to authenticated with check (is_staff());
create policy "tea_batches: staff update" on tea_batches for update using (is_staff()) with check (is_staff());
create policy "allocations: staff select" on order_batch_allocations for select using (is_staff());
create policy "allocations: staff insert" on order_batch_allocations for insert to authenticated with check (is_staff());
create policy "allocations: staff delete" on order_batch_allocations for delete using (is_staff());
create policy "reservations: staff select" on inventory_reservations for select using (is_staff());
create policy "reservations: staff insert" on inventory_reservations for insert to authenticated with check (is_staff());
create policy "reservations: staff update" on inventory_reservations for update using (is_staff()) with check (is_staff());

create or replace function partner_portal_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a wholesale_accounts%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into a from wholesale_accounts where user_id = auth.uid() limit 1;
  if not found then return jsonb_build_object('state','application_required'); end if;
  if not a.wholesale_verified then
    return jsonb_build_object('state','pending','account',jsonb_build_object('business_name',a.business_name,'contact',a.contact));
  end if;

  select jsonb_build_object(
    'state','active',
    'account',jsonb_build_object(
      'id',a.id,'business_name',a.business_name,'contact',a.contact,
      'delivery_address',a.delivery_address,'tax_number',a.tax_number,
      'reorder_cadence_days',a.reorder_cadence_days,'lead_time_days',a.lead_time_days
    ),
    'price_agreement',(
      select (to_jsonb(pa)-'note'-'created_by'-'created_at'-'superseded_at') || jsonb_build_object('rules',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',r.id,'product_id',r.product_id,'variant_weight',r.variant_weight,
          'product_name',r.product_name,'unit',r.unit,'minimum_quantity',r.minimum_quantity,
          'price',r.price,'available',p.available,
          'stock',case when r.variant_weight<>'' then coalesce((select coalesce(v.stock_ha_giang,0)+coalesce(v.stock_soc_son,0) from catalog_variants v where v.product_id=r.product_id and v.weight=r.variant_weight),0)
            else coalesce(p.stock_ha_giang,0)+coalesce(p.stock_soc_son,0) end
            -coalesce((select sum(ir.quantity) from inventory_reservations ir where ir.product_id=r.product_id and ir.variant_weight=r.variant_weight and ir.status='active'),0)
        ) order by r.sort_order)
        from partner_price_rules r join catalog_products p on p.id=r.product_id
        where r.agreement_id=pa.id
      ),'[]'::jsonb))
      from partner_price_agreements pa
      where pa.opportunity_id=a.opportunity_id and pa.status='active'
        and pa.effective_from<=current_date and (pa.valid_until is null or pa.valid_until>=current_date)
      order by pa.version desc limit 1
    ),
    'quotes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'status',q.status,'lines',q.lines,'subtotal',q.subtotal,
        'discount_percent',q.discount_percent,'total',q.total,'payment_method',q.payment_method,
        'valid_until',q.valid_until,'terms',q.terms,'sent_at',q.sent_at,
        'accepted_at',q.accepted_at,'converted_order_id',q.converted_order_id,'created_at',q.created_at
      ) order by q.created_at desc)
      from trade_quotes q where q.partner_account_id=a.id
    ),'[]'::jsonb),
    'orders',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'ts',o.ts,'status',o.status,'stage',o.stage,'health',o.health,
        'lines',o.lines,'total_kg',o.total_kg,'total_items',o.total_items,
        'estimated_total',o.estimated_total,'tracking_code',o.tracking_code,
        'address',o.address,'quote_id',o.quote_id
      ) order by o.ts desc)
      from orders o where o.partner_account_id=a.id
    ),'[]'::jsonb),
    'receivables',coalesce((
      select jsonb_agg(to_jsonb(r)-'note' || jsonb_build_object(
        'display_status',case when r.status in ('open','partial') and r.due_at<current_date then 'overdue' else r.status end,
        'payments',coalesce((select jsonb_agg(to_jsonb(p)-'created_by'-'note' order by p.paid_at desc) from receivable_payments p where p.receivable_id=r.id),'[]'::jsonb)
      ) order by r.issued_at desc)
      from receivables r where r.partner_account_id=a.id
    ),'[]'::jsonb),
    'batch_passports',coalesce((
      select jsonb_agg(jsonb_build_object(
        'order_id',x.order_id,'quantity_kg',x.quantity_kg,'code',b.code,'name',b.name,
        'origin',b.origin,'producer',b.producer,'harvest_date',b.harvest_date,'season',b.season,
        'process',b.process,'cultivar',b.cultivar,'tasting_notes',b.tasting_notes,
        'quality_metrics',b.quality_metrics,'moisture_percent',b.moisture_percent,
        'grade',b.grade,'photo_url',b.photo_url,'document_url',b.document_url
      ) order by x.created_at desc)
      from order_batch_allocations x join tea_batches b on b.id=x.batch_id
      join orders o on o.id=x.order_id where o.partner_account_id=a.id and b.status<>'draft'
    ),'[]'::jsonb),
    'reorder',(
      select jsonb_build_object(
        'last_order_at',max(o.ts),
        'order_count',count(*)::int,
        'avg_days',case when count(*)>1 then round(extract(epoch from (max(o.ts)-min(o.ts)))/86400.0/(count(*)-1)) else a.reorder_cadence_days end,
        'expected_at',coalesce(max(o.ts)::date,current_date)+coalesce(case when count(*)>1 then round(extract(epoch from (max(o.ts)-min(o.ts)))/86400.0/(count(*)-1))::int end,a.reorder_cadence_days)
      ) from orders o where o.partner_account_id=a.id
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function partner_portal_snapshot() from public;
revoke all on function partner_portal_snapshot() from anon;
grant execute on function partner_portal_snapshot() to authenticated;

create or replace function submit_partner_application(p_business_name text,p_contact text,p_address text,p_tax_number text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_account_id text; v_opportunity_id text; v_key text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if btrim(coalesce(p_business_name,''))='' or btrim(coalesce(p_contact,''))='' then raise exception 'business_and_contact_required'; end if;
  if exists(select 1 from wholesale_accounts where user_id=auth.uid()) then raise exception 'application_exists'; end if;
  v_key:=lower(btrim(p_contact));
  select id into v_opportunity_id from trade_opportunities where contact_key=v_key limit 1;
  if v_opportunity_id is null then
    v_opportunity_id:='opp-portal-'||substr(md5(auth.uid()::text||':'||v_key),1,16);
    insert into trade_opportunities(id,contact_key,business_name,contact,stage,source_type,next_action,next_action_at)
    values(v_opportunity_id,v_key,btrim(p_business_name),btrim(p_contact),'lead','partner_portal','Duyệt hồ sơ đối tác',now());
  end if;
  v_account_id:='partner-'||substr(md5(auth.uid()::text),1,16);
  insert into wholesale_accounts(id,business_name,contact,user_id,wholesale_verified,opportunity_id,delivery_address,tax_number)
  values(v_account_id,btrim(p_business_name),btrim(p_contact),auth.uid(),false,v_opportunity_id,coalesce(p_address,''),coalesce(p_tax_number,''));
  update trade_opportunities set source_id=v_account_id,updated_at=now() where id=v_opportunity_id;
  return v_account_id;
end;
$$;

revoke all on function submit_partner_application(text,text,text,text) from public;
revoke all on function submit_partner_application(text,text,text,text) from anon;
grant execute on function submit_partner_application(text,text,text,text) to authenticated;

create or replace function partner_update_profile(p_business_name text,p_contact text,p_address text,p_tax_number text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if btrim(coalesce(p_business_name,''))='' or btrim(coalesce(p_contact,''))='' then raise exception 'business_and_contact_required'; end if;
  update wholesale_accounts set business_name=btrim(p_business_name),contact=btrim(p_contact),delivery_address=coalesce(p_address,''),tax_number=coalesce(p_tax_number,'') where user_id=auth.uid();
  if not found then raise exception 'partner_not_found'; end if;
end;
$$;

revoke all on function partner_update_profile(text,text,text,text) from public;
revoke all on function partner_update_profile(text,text,text,text) from anon;
grant execute on function partner_update_profile(text,text,text,text) to authenticated;

create or replace function partner_submit_order(p_lines jsonb,p_address text,p_note text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  a wholesale_accounts%rowtype;
  agreement partner_price_agreements%rowtype;
  input_line jsonb;
  rule partner_price_rules%rowtype;
  output_lines jsonb := '[]'::jsonb;
  v_order_id text;
  v_qty numeric;
  v_total numeric := 0;
  v_total_kg numeric := 0;
  v_stock_hg numeric;
  v_stock_ss numeric;
  v_reserved numeric;
  v_key text;
  v_seen jsonb := '{}'::jsonb;
begin
  select * into a from wholesale_accounts where user_id=auth.uid() and wholesale_verified=true limit 1;
  if not found then raise exception 'partner_not_approved'; end if;
  select * into agreement from partner_price_agreements
  where opportunity_id=a.opportunity_id and status='active' and effective_from<=current_date
    and (valid_until is null or valid_until>=current_date) order by version desc limit 1;
  if not found then raise exception 'active_price_agreement_required'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'order_lines_required'; end if;

  for input_line in select * from jsonb_array_elements(p_lines)
  loop
    select * into rule from partner_price_rules
    where agreement_id=agreement.id and product_id=input_line->>'product_id'
      and variant_weight=coalesce(input_line->>'variant_weight','') limit 1;
    if not found then raise exception 'price_rule_not_found:%',input_line->>'product_id'; end if;
    v_qty:=coalesce((input_line->>'quantity')::numeric,0);
    if v_qty<rule.minimum_quantity then raise exception 'minimum_quantity:%:%',rule.product_id,rule.minimum_quantity; end if;
    v_key:=rule.product_id||'|'||rule.variant_weight;
    if v_seen ? v_key then raise exception 'duplicate_order_line:%',v_key; end if;
    v_seen:=v_seen||jsonb_build_object(v_key,true);
    if rule.variant_weight<>'' then
      select stock_ha_giang,stock_soc_son into v_stock_hg,v_stock_ss from catalog_variants where product_id=rule.product_id and weight=rule.variant_weight for update;
    else
      select stock_ha_giang,stock_soc_son into v_stock_hg,v_stock_ss from catalog_products where id=rule.product_id and available=true for update;
    end if;
    if not found then raise exception 'product_unavailable:%',rule.product_id; end if;
    if v_stock_hg is not null or v_stock_ss is not null then
      select coalesce(sum(quantity),0) into v_reserved from inventory_reservations where product_id=rule.product_id and variant_weight=rule.variant_weight and status='active';
      if coalesce(v_stock_hg,0)+coalesce(v_stock_ss,0)-v_reserved<v_qty then raise exception 'insufficient_available_stock:%',rule.product_id; end if;
    end if;
    output_lines:=output_lines||jsonb_build_array(jsonb_build_object(
      'productId',rule.product_id,'weight',nullif(rule.variant_weight,''),'name',rule.product_name,
      'qty',v_qty,'unit',rule.unit,'price',rule.price,'total',round(v_qty*rule.price)
    ));
    v_total:=v_total+round(v_qty*rule.price);
    if rule.unit='kg' then v_total_kg:=v_total_kg+v_qty; end if;
  end loop;

  v_order_id:='order-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4);
  insert into orders(id,ts,type,customer_name,contact,address,tax_number,note,lines,total_kg,estimated_total,payment_method,status,unread,partner_account_id)
  values(v_order_id,now(),'wholesale',a.business_name,a.contact,coalesce(nullif(btrim(p_address),''),a.delivery_address),a.tax_number,
    coalesce(p_note,''),output_lines,v_total_kg,v_total,'qr','pending',true,a.id);

  insert into inventory_reservations(id,order_id,product_id,variant_weight,quantity)
  select 'reserve-'||substr(md5(v_order_id||':'||(line->>'productId')||':'||coalesce(line->>'weight','')),1,20),v_order_id,
    line->>'productId',coalesce(line->>'weight',''),(line->>'qty')::numeric
  from jsonb_array_elements(output_lines) line;
  return v_order_id;
end;
$$;

revoke all on function partner_submit_order(jsonb,text,text) from public;
revoke all on function partner_submit_order(jsonb,text,text) from anon;
grant execute on function partner_submit_order(jsonb,text,text) to authenticated;

create or replace function assert_inventory_available(p_lines jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line jsonb;
  v_product_id text;
  v_variant_weight text;
  v_qty numeric;
  v_stock_hg numeric;
  v_stock_ss numeric;
  v_reserved numeric;
  v_key text;
  v_seen jsonb := '{}'::jsonb;
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'order_lines_required'; end if;
  for line in select * from jsonb_array_elements(p_lines)
  loop
    v_product_id:=line->>'productId';
    v_variant_weight:=coalesce(line->>'weight','');
    v_qty:=coalesce((line->>'qty')::numeric,0);
    if nullif(v_product_id,'') is null or v_qty<=0 then raise exception 'invalid_order_line'; end if;
    v_key:=v_product_id||'|'||v_variant_weight;
    if v_seen ? v_key then raise exception 'duplicate_order_line:%',v_key; end if;
    v_seen:=v_seen||jsonb_build_object(v_key,true);
    if v_variant_weight<>'' then
      select v.stock_ha_giang,v.stock_soc_son into v_stock_hg,v_stock_ss
      from catalog_variants v join catalog_products p on p.id=v.product_id
      where v.product_id=v_product_id and v.weight=v_variant_weight and p.available=true for update of v;
    else
      select p.stock_ha_giang,p.stock_soc_son into v_stock_hg,v_stock_ss
      from catalog_products p where p.id=v_product_id and p.available=true for update;
    end if;
    if not found then raise exception 'product_unavailable:%',v_product_id; end if;
    if v_stock_hg is not null or v_stock_ss is not null then
      select coalesce(sum(quantity),0) into v_reserved from inventory_reservations
      where product_id=v_product_id and variant_weight=v_variant_weight and status='active';
      if coalesce(v_stock_hg,0)+coalesce(v_stock_ss,0)-v_reserved<v_qty then
        raise exception 'insufficient_available_stock:%',v_product_id;
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function assert_inventory_available(jsonb) from public;
revoke all on function assert_inventory_available(jsonb) from anon, authenticated;

create or replace function partner_accept_quote(p_quote_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  a wholesale_accounts%rowtype;
  q trade_quotes%rowtype;
  v_order_id text;
  v_total_kg numeric;
begin
  select * into a from wholesale_accounts where user_id=auth.uid() and wholesale_verified=true limit 1;
  if not found then raise exception 'partner_not_approved'; end if;
  select * into q from trade_quotes where id=p_quote_id and partner_account_id=a.id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if q.converted_order_id is not null then return q.converted_order_id; end if;
  if q.status<>'sent' then raise exception 'quote_not_open'; end if;
  if q.valid_until is not null and q.valid_until<current_date then raise exception 'quote_expired'; end if;
  perform assert_inventory_available(q.lines);
  select coalesce(sum(coalesce((line->>'qty')::numeric,0)),0) into v_total_kg from jsonb_array_elements(q.lines) line;
  v_order_id:='order-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4);
  insert into orders(id,ts,type,customer_name,contact,address,note,lines,total_kg,estimated_total,payment_method,status,unread,partner_account_id,quote_id)
  values(v_order_id,now(),'wholesale',q.customer_name,q.contact,q.address,'Đối tác chấp nhận báo giá '||q.id,q.lines,v_total_kg,q.total,q.payment_method,'pending',true,a.id,q.id);
  insert into inventory_reservations(id,order_id,product_id,variant_weight,quantity)
  select 'reserve-'||substr(md5(v_order_id||':'||(line->>'productId')||':'||coalesce(line->>'weight','')),1,20),v_order_id,
    line->>'productId',coalesce(line->>'weight',''),(line->>'qty')::numeric
  from jsonb_array_elements(q.lines) line where nullif(line->>'productId','') is not null;
  update trade_quotes set status='converted',accepted_at=now(),converted_order_id=v_order_id,updated_at=now() where id=q.id;
  update trade_opportunities set stage='won',next_action='Xác nhận và chuẩn bị đơn',next_action_at=now(),updated_at=now() where id=q.opportunity_id;
  return v_order_id;
end;
$$;

revoke all on function partner_accept_quote(text) from public;
revoke all on function partner_accept_quote(text) from anon;
grant execute on function partner_accept_quote(text) to authenticated;

create or replace function record_receivable_payment(p_receivable_id text,p_amount numeric,p_method text,p_reference text,p_note text,p_actor text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r receivables%rowtype; v_paid numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select * into r from receivables where id=p_receivable_id for update;
  if not found or r.status='void' then raise exception 'receivable_not_open'; end if;
  if p_amount<=0 or r.paid+p_amount>r.total then raise exception 'invalid_payment_amount'; end if;
  insert into receivable_payments(id,receivable_id,amount,method,reference,note,created_by)
  values('payment-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4),r.id,p_amount,
    case when p_method in ('bank_transfer','cash','card','other') then p_method else 'other' end,coalesce(p_reference,''),coalesce(p_note,''),coalesce(p_actor,''));
  v_paid:=r.paid+p_amount;
  update receivables set paid=v_paid,status=case when v_paid>=total then 'paid' else 'partial' end,updated_at=now() where id=r.id;
end;
$$;

revoke all on function record_receivable_payment(text,numeric,text,text,text,text) from public;
revoke all on function record_receivable_payment(text,numeric,text,text,text,text) from anon;
grant execute on function record_receivable_payment(text,numeric,text,text,text,text) to authenticated;

create or replace function allocate_batch_to_order(p_order_id text,p_batch_id text,p_product_id text,p_quantity_kg numeric,p_actor text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare b tea_batches%rowtype; v_id text;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  if p_quantity_kg<=0 then raise exception 'invalid_quantity'; end if;
  if not exists(select 1 from orders where id=p_order_id) then raise exception 'order_not_found'; end if;
  select * into b from tea_batches where id=p_batch_id for update;
  if not found or b.status not in ('released','held') then raise exception 'batch_not_allocatable'; end if;
  if b.available_kg-b.reserved_kg<p_quantity_kg then raise exception 'batch_quantity_unavailable'; end if;
  v_id:='allocation-'||substr(md5(p_order_id||':'||p_batch_id||':'||coalesce(p_product_id,'')),1,20);
  insert into order_batch_allocations(id,order_id,batch_id,product_id,quantity_kg,created_by)
  values(v_id,p_order_id,p_batch_id,nullif(p_product_id,''),p_quantity_kg,coalesce(p_actor,''));
  update tea_batches set reserved_kg=reserved_kg+p_quantity_kg,updated_at=now() where id=p_batch_id;
  return v_id;
end;
$$;

revoke all on function allocate_batch_to_order(text,text,text,numeric,text) from public;
revoke all on function allocate_batch_to_order(text,text,text,numeric,text) from anon;
grant execute on function allocate_batch_to_order(text,text,text,numeric,text) to authenticated;

create or replace function public_batch_passport(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'code',b.code,'name',b.name,'origin',b.origin,'producer',b.producer,'harvest_date',b.harvest_date,
    'season',b.season,'process',b.process,'cultivar',b.cultivar,'tasting_notes',b.tasting_notes,
    'quality_metrics',b.quality_metrics,'moisture_percent',b.moisture_percent,'grade',b.grade,
    'photo_url',b.photo_url,'document_url',b.document_url
  ) from tea_batches b where upper(b.code)=upper(btrim(p_code)) and b.status='released' limit 1;
$$;

revoke all on function public_batch_passport(text) from public;
grant execute on function public_batch_passport(text) to anon, authenticated;

create or replace function convert_trade_quote_to_order(p_quote_id text,p_actor text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare q trade_quotes%rowtype; v_order_id text; v_total_kg numeric;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select * into q from trade_quotes where id=p_quote_id for update;
  if not found then raise exception 'quote_not_found'; end if;
  if q.converted_order_id is not null then return q.converted_order_id; end if;
  if q.status<>'accepted' then raise exception 'quote_not_accepted'; end if;
  perform assert_inventory_available(q.lines);
  select coalesce(sum(coalesce((line->>'qty')::numeric,0)),0) into v_total_kg from jsonb_array_elements(q.lines) line;
  v_order_id:='order-'||to_char(now(),'YYYYMMDDHH24MISSMS')||'-'||substr(md5(random()::text),1,4);
  insert into orders(id,ts,type,customer_name,contact,address,note,lines,total_kg,estimated_total,payment_method,status,tracking_code,unread,partner_account_id,quote_id)
  values(v_order_id,now(),'wholesale',q.customer_name,q.contact,q.address,concat('Từ báo giá ',q.id,case when q.note<>'' then E'\n'||q.note else '' end),q.lines,v_total_kg,q.total,q.payment_method,'pending','',true,q.partner_account_id,q.id);
  insert into inventory_reservations(id,order_id,product_id,variant_weight,quantity)
  select 'reserve-'||substr(md5(v_order_id||':'||(line->>'productId')||':'||coalesce(line->>'weight','')),1,20),v_order_id,
    line->>'productId',coalesce(line->>'weight',''),(line->>'qty')::numeric
  from jsonb_array_elements(q.lines) line where nullif(line->>'productId','') is not null;
  update trade_quotes set status='converted',converted_order_id=v_order_id,updated_at=now() where id=q.id;
  update trade_opportunities set stage='won',next_action='Xác nhận và chuẩn bị đơn đầu tiên',next_action_at=now(),updated_at=now() where id=q.opportunity_id;
  return v_order_id;
end;
$$;

revoke all on function convert_trade_quote_to_order(text,text) from public;
revoke all on function convert_trade_quote_to_order(text,text) from anon;
grant execute on function convert_trade_quote_to_order(text,text) to authenticated;

create or replace function operations_control_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not is_staff() then raise exception 'not_authorised'; end if;
  select jsonb_build_object(
    'kpis',jsonb_build_object(
      'revenue_30d',(select coalesce(sum(estimated_total),0) from orders where ts>=now()-interval '30 days' and status<>'pending'),
      'orders_30d',(select count(*) from orders where ts>=now()-interval '30 days'),
      'receivable_open',(select coalesce(sum(total-paid),0) from receivables where status in ('open','partial')),
      'receivable_overdue',(select coalesce(sum(total-paid),0) from receivables where status in ('open','partial') and due_at<current_date),
      'cash_collected_30d',(select coalesce(sum(amount),0) from receivable_payments where paid_at>=now()-interval '30 days'),
      'quotes_waiting',(select count(*) from trade_quotes where status='sent' and (valid_until is null or valid_until>=current_date)),
      'allocated_cost_30d',(select coalesce(sum(x.quantity_kg*b.cost_per_kg),0) from order_batch_allocations x join tea_batches b on b.id=x.batch_id join orders o on o.id=x.order_id where o.ts>=now()-interval '30 days'),
      'gross_margin_known_30d',(
        select coalesce(sum(covered.estimated_total),0)-coalesce(sum(covered.allocated_cost),0)
        from (
          select o.id,o.estimated_total,coalesce(sum(x.quantity_kg*b.cost_per_kg),0) allocated_cost
          from orders o join order_batch_allocations x on x.order_id=o.id join tea_batches b on b.id=x.batch_id
          where o.ts>=now()-interval '30 days' and o.status<>'pending'
          group by o.id,o.estimated_total
        ) covered
      ),
      'cost_coverage_orders',(select count(distinct x.order_id) from order_batch_allocations x join orders o on o.id=x.order_id where o.ts>=now()-interval '30 days')
    ),
    'reorders',coalesce((
      select jsonb_agg(jsonb_build_object('account_id',w.id,'business_name',w.business_name,'contact',w.contact,
        'last_order_at',x.last_order_at,'order_count',x.order_count,'expected_at',coalesce(x.last_order_at::date,current_date)+coalesce(x.avg_days,w.reorder_cadence_days),
        'days_due',current_date-(coalesce(x.last_order_at::date,current_date)+coalesce(x.avg_days,w.reorder_cadence_days)))
        order by current_date-(coalesce(x.last_order_at::date,current_date)+coalesce(x.avg_days,w.reorder_cadence_days)) desc)
      from wholesale_accounts w left join lateral (
        select max(o.ts) last_order_at,count(*)::int order_count,
          case when count(*)>1 then round(extract(epoch from (max(o.ts)-min(o.ts)))/86400.0/(count(*)-1))::int end avg_days
        from orders o where o.partner_account_id=w.id
      ) x on true where w.wholesale_verified
    ),'[]'::jsonb),
    'stock',coalesce((
      select jsonb_agg(jsonb_build_object(
        'row_key',s.product_id||'|'||s.variant_weight,
        'product_id',s.product_id,'variant_weight',s.variant_weight,'name',s.name,
        'on_hand',s.on_hand,'reserved',s.reserved,'available',s.on_hand-s.reserved,
        'demand_90d',s.demand_90d
      ) order by s.sort_order,s.variant_weight)
      from (
        select p.id product_id,''::text variant_weight,p.name,p.sort_order,
          coalesce(p.stock_ha_giang,0)+coalesce(p.stock_soc_son,0) on_hand,
          coalesce((select sum(ir.quantity) from inventory_reservations ir where ir.product_id=p.id and ir.variant_weight='' and ir.status='active'),0) reserved,
          coalesce((select sum(coalesce((l->>'qty')::numeric,0)) from orders o,jsonb_array_elements(o.lines) l
            where o.ts>=now()-interval '90 days' and l->>'productId'=p.id and coalesce(l->>'weight','')=''),0) demand_90d
        from catalog_products p where p.kind='tea' and (
          not exists(select 1 from catalog_variants v where v.product_id=p.id)
          or coalesce(p.stock_ha_giang,0)+coalesce(p.stock_soc_son,0)>0
        )
        union all
        select p.id,v.weight,p.name,p.sort_order,
          coalesce(v.stock_ha_giang,0)+coalesce(v.stock_soc_son,0) on_hand,
          coalesce((select sum(ir.quantity) from inventory_reservations ir where ir.product_id=p.id and ir.variant_weight=v.weight and ir.status='active'),0) reserved,
          coalesce((select sum(coalesce((l->>'qty')::numeric,0)) from orders o,jsonb_array_elements(o.lines) l
            where o.ts>=now()-interval '90 days' and l->>'productId'=p.id and coalesce(l->>'weight','')=v.weight),0) demand_90d
        from catalog_variants v join catalog_products p on p.id=v.product_id where p.kind='tea'
      ) s
    ),'[]'::jsonb),
    'today_actions',jsonb_build_object(
      'overdue_invoices',(select count(*) from receivables where status in ('open','partial') and due_at<current_date),
      'quotes_expiring',(select count(*) from trade_quotes where status='sent' and valid_until between current_date and current_date+7),
      'orders_blocked',(select count(*) from orders where health='blocked'),
      'price_reviews',(select count(*) from partner_price_agreements where status='active' and review_at between current_date and current_date+14)
    )
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function operations_control_snapshot() from public;
revoke all on function operations_control_snapshot() from anon;
grant execute on function operations_control_snapshot() to authenticated;
