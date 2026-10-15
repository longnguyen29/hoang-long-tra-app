-- Private introducer terms extend the existing buyer quotation, never a second CRM.
begin;
create table public.partner_network_quote_terms (
 id uuid primary key,
 partner_id uuid not null references public.partner_network_partners(id) on delete restrict,
 referral_id uuid not null references public.partner_network_referrals(id) on delete restrict,
 supersedes_id uuid unique references public.partner_network_quote_terms(id) on delete restrict,
 version integer not null default 1 check(version>0),
 revision integer not null default 1 check(revision>0),
 status text not null default 'released' check(status in ('released','submitted','approved','rejected','revoked')),
 remuneration_mode text not null check(remuneration_mode in ('commission','price_difference')),
 base_lines jsonb not null check(jsonb_typeof(base_lines)='array' and jsonb_array_length(base_lines) between 1 and 30),
 proposed_lines jsonb not null default '[]' check(jsonb_typeof(proposed_lines)='array'),
 discount_percent numeric(7,4) not null default 0 check(discount_percent between 0 and 100),
 subtotal numeric(16,2),total numeric(16,2),estimated_difference numeric(16,2),
 valid_until date not null,
 commercial_terms text not null check(length(commercial_terms) between 1 and 3000),
 partner_note text not null default '' check(length(partner_note)<=1500),
 release_reason text not null check(length(release_reason) between 1 and 1500),
 review_reason text not null default '' check(length(review_reason)<=1500),
 quote_id text unique references public.trade_quotes(id) on delete restrict,
 released_by uuid not null references auth.users(id),released_at timestamptz not null default now(),
 submitted_by uuid references auth.users(id),submitted_at timestamptz,
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 updated_at timestamptz not null default now()
);
create index partner_network_quote_terms_partner_idx on public.partner_network_quote_terms(partner_id,released_at desc);
alter table public.partner_network_quote_terms enable row level security;
revoke all on public.partner_network_quote_terms from public,anon,authenticated;
grant select on public.partner_network_quote_terms to authenticated;
grant all on public.partner_network_quote_terms to service_role;
create policy partner_quote_manager_read on public.partner_network_quote_terms for select to authenticated using(public.is_staff_manager());
create trigger partner_quote_terms_audit after insert or update on public.partner_network_quote_terms for each row execute function public.partner_network_audit_change();

-- Manager publishes a finite commercial basis for one accepted referral. A new
-- price basis creates a new version, rather than rewriting an agreed quotation.
create function public.partner_network_release_quote_terms(p_referral_id uuid,p_input jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.partner_network_referrals;p public.partner_network_partners; old public.partner_network_quote_terms;
 id_value uuid; supersedes_value uuid; revision_value integer; line jsonb; product public.catalog_products; lines_value jsonb:='[]';
 product_id_value text; weight_value text; unit_value text; minimum_value numeric; maximum_value numeric; base_value numeric;
 mode_value text; terms_value text; reason_value text; expiry date; version_value integer:=1;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['request_id','expected_revision','supersedes_id','lines','remuneration_mode','valid_until','commercial_terms','reason']) then raise exception 'invalid_partner_quote';end if;
 id_value:=(p_input->>'request_id')::uuid;supersedes_value:=nullif(p_input->>'supersedes_id','')::uuid;
 revision_value:=(p_input->>'expected_revision')::integer;
 if id_value is null or revision_value is null then raise exception 'invalid_partner_quote';end if;
 perform pg_advisory_xact_lock(hashtextextended('partner-quote-referral:'||p_referral_id::text,0));
 select * into r from public.partner_network_referrals where id=p_referral_id for update;
 if not found or r.status<>'accepted' then raise exception 'accepted_referral_required';end if;
 select * into p from public.partner_network_partners where id=r.partner_id for update;
 if p.status<>'approved' then raise exception 'partner_not_approved';end if;
 if exists(select 1 from public.partner_network_quote_terms where id=id_value) then raise exception 'quote_release_already_exists';end if;
 if supersedes_value is not null then
  select * into old from public.partner_network_quote_terms where id=supersedes_value and referral_id=r.id for update;
  if not found or old.revision<>revision_value or old.status='revoked' then raise exception 'partner_quote_changed';end if;
  if old.quote_id is not null and exists(select 1 from public.trade_quotes where id=old.quote_id and converted_order_id is not null) then raise exception 'converted_quote_immutable';end if;
  version_value:=old.version+1;
 elsif revision_value<>0 then raise exception 'partner_quote_changed';end if;
 mode_value:=p_input->>'remuneration_mode';terms_value:=public.partner_network_text(p_input->>'commercial_terms');reason_value:=public.partner_network_text(p_input->>'reason');expiry:=(p_input->>'valid_until')::date;
 if mode_value not in ('commission','price_difference') or expiry is null or expiry<current_date or expiry>current_date+366 or length(terms_value) not between 1 and 3000 or length(reason_value) not between 1 and 1500
  or jsonb_typeof(p_input->'lines') is distinct from 'array' or jsonb_array_length(p_input->'lines') not between 1 and 30 then raise exception 'invalid_partner_quote';end if;
 for line in select * from jsonb_array_elements(p_input->'lines') loop
  if not public.partner_network_input_keys(line,array['product_id','variant_weight','unit','min_qty','max_qty','base_price']) then raise exception 'invalid_partner_quote_line';end if;
  product_id_value:=line->>'product_id';weight_value:=coalesce(line->>'variant_weight','');unit_value:=line->>'unit';
  select * into product from public.catalog_products where id=product_id_value and available;
  if not found or (weight_value<>'' and not exists(select 1 from public.catalog_variants where product_id=product.id and weight=weight_value)) then raise exception 'quote_product_unavailable';end if;
  minimum_value:=(line->>'min_qty')::numeric;maximum_value:=(line->>'max_qty')::numeric;base_value:=(line->>'base_price')::numeric;
  if minimum_value is null or maximum_value is null or base_value is null or minimum_value<=0 or maximum_value<minimum_value or maximum_value>10000000 or minimum_value<>round(minimum_value,3) or maximum_value<>round(maximum_value,3) or base_value<=0 or base_value>999999999 or base_value<>round(base_value,2)
   or minimum_value::text in ('NaN','Infinity','-Infinity') or maximum_value::text in ('NaN','Infinity','-Infinity') or base_value::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_partner_quote_line';end if;
  perform public.trade_quote_quantity_totals(jsonb_build_array(jsonb_build_object('qty',minimum_value,'unit',unit_value)));
  perform public.trade_quote_quantity_totals(jsonb_build_array(jsonb_build_object('qty',maximum_value,'unit',unit_value)));
  if exists(select 1 from jsonb_array_elements(lines_value) x where x->>'product_id'=product_id_value and x->>'variant_weight'=weight_value) then raise exception 'duplicate_quote_product';end if;
  lines_value:=lines_value||jsonb_build_array(jsonb_build_object('product_id',product_id_value,'variant_weight',weight_value,'name',coalesce(nullif(product.name->>'vi',''),product.name->>'en',product.id),'unit',unit_value,'min_qty',minimum_value,'max_qty',maximum_value,'base_price',base_value));
 end loop;
 if supersedes_value is not null then
  update public.partner_network_quote_terms set status='revoked',revision=revision+1,review_reason=reason_value,updated_at=now() where id=old.id;
  if old.quote_id is not null then update public.trade_quotes set status='expired',updated_at=now() where id=old.quote_id;end if;
 end if;
 insert into public.partner_network_quote_terms(id,partner_id,referral_id,supersedes_id,version,remuneration_mode,base_lines,valid_until,commercial_terms,release_reason,released_by)
 values(id_value,p.id,r.id,supersedes_value,version_value,mode_value,lines_value,expiry,terms_value,reason_value,auth.uid());
 return id_value;
end $$;

create function public.partner_network_propose_quote(p_id uuid,p_input jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare t public.partner_network_quote_terms;p public.partner_network_partners;line jsonb;base jsonb;lines_value jsonb:='[]';
 qty_value numeric;price_value numeric;discount_value numeric;subtotal_value numeric:=0;base_total numeric:=0;note_value text;referral_value uuid;
begin
 select referral_id into referral_value from public.partner_network_quote_terms where id=p_id;
 if referral_value is not null then perform pg_advisory_xact_lock(hashtextextended('partner-quote-referral:'||referral_value::text,0));end if;
 select * into p from public.partner_network_partners where user_id=auth.uid() for update;
 if not found or p.status<>'approved' then raise exception 'partner_not_approved';end if;
 select * into t from public.partner_network_quote_terms where id=p_id and partner_id=p.id for update;
 if not found then raise exception 'partner_quote_not_found';end if;
 if not exists(select 1 from public.partner_network_referrals where id=t.referral_id and status='accepted' and partner_id=p.id) then raise exception 'accepted_referral_required';end if;
 if not public.partner_network_input_keys(p_input,array['expected_revision','lines','discount_percent','note']) then raise exception 'invalid_partner_quote';end if;
 if t.revision is distinct from (p_input->>'expected_revision')::integer then raise exception 'partner_quote_changed';end if;
 if t.status not in ('released','submitted') or t.valid_until<current_date then raise exception 'partner_quote_not_open';end if;
 discount_value:=coalesce((p_input->>'discount_percent')::numeric,0);note_value:=public.partner_network_text(p_input->>'note');
 if discount_value<0 or discount_value>100 or discount_value<>round(discount_value,4) or discount_value::text in ('NaN','Infinity','-Infinity') or length(note_value)>1500
  or jsonb_typeof(p_input->'lines') is distinct from 'array' or jsonb_array_length(p_input->'lines')<>jsonb_array_length(t.base_lines) then raise exception 'invalid_partner_quote';end if;
 for base in select * from jsonb_array_elements(t.base_lines) loop
  if (select count(*) from jsonb_array_elements(p_input->'lines') x where x->>'product_id'=base->>'product_id' and coalesce(x->>'variant_weight','')=base->>'variant_weight' and x->>'unit'=base->>'unit')<>1 then raise exception 'invalid_partner_quote_line';end if;
  select x into line from jsonb_array_elements(p_input->'lines') x where x->>'product_id'=base->>'product_id' and coalesce(x->>'variant_weight','')=base->>'variant_weight' and x->>'unit'=base->>'unit';
  if not public.partner_network_input_keys(line,array['product_id','variant_weight','unit','qty','price']) then raise exception 'invalid_partner_quote_line';end if;
  qty_value:=(line->>'qty')::numeric;price_value:=(line->>'price')::numeric;
  if qty_value is null or price_value is null or qty_value<(base->>'min_qty')::numeric or qty_value>(base->>'max_qty')::numeric or qty_value<>round(qty_value,3) or price_value<0 or price_value>999999999 or price_value<>round(price_value,2) or qty_value::text in ('NaN','Infinity','-Infinity') or price_value::text in ('NaN','Infinity','-Infinity') then raise exception 'invalid_partner_quote_line';end if;
  perform public.trade_quote_quantity_totals(jsonb_build_array(jsonb_build_object('qty',qty_value,'unit',base->>'unit')));
  if price_value*(1-discount_value/100)<(base->>'base_price')::numeric then raise exception 'partner_quote_below_floor';end if;
  subtotal_value:=subtotal_value+qty_value*price_value;base_total:=base_total+qty_value*(base->>'base_price')::numeric;
  lines_value:=lines_value||jsonb_build_array(jsonb_build_object('productId',base->>'product_id','weight',nullif(base->>'variant_weight',''),'name',jsonb_build_object('vi',base->>'name'),'unit',base->>'unit','qty',qty_value,'price',price_value));
 end loop;
 update public.partner_network_quote_terms set status='submitted',proposed_lines=lines_value,discount_percent=discount_value,subtotal=round(subtotal_value,2),total=round(subtotal_value*(1-discount_value/100),0),estimated_difference=greatest(0,round(subtotal_value*(1-discount_value/100),0)-round(base_total,2)),partner_note=note_value,submitted_by=auth.uid(),submitted_at=now(),revision=revision+1,updated_at=now() where id=t.id;
 return t.id;
end $$;

create function public.partner_network_review_quote_proposal(p_id uuid,p_action text,p_input jsonb) returns text
language plpgsql security definer set search_path=pg_catalog,public as $$
declare t public.partner_network_quote_terms;r public.partner_network_referrals;p public.partner_network_partners;reason_value text;quote_value text;buyer_value text;address_value text;payment_value text;referral_value uuid;
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 if not public.partner_network_input_keys(p_input,array['expected_revision','reason','address','payment_method']) then raise exception 'invalid_partner_quote';end if;
 select referral_id into referral_value from public.partner_network_quote_terms where id=p_id;
 if referral_value is not null then perform pg_advisory_xact_lock(hashtextextended('partner-quote-referral:'||referral_value::text,0));end if;
 select * into t from public.partner_network_quote_terms where id=p_id for update;
 if not found then raise exception 'partner_quote_not_found';end if;
 if t.status='approved' and p_action='approve' then return t.quote_id;end if;
 if t.revision is distinct from (p_input->>'expected_revision')::integer then raise exception 'partner_quote_changed';end if;
 if t.status<>'submitted' or t.valid_until<current_date then raise exception 'partner_quote_not_open';end if;
 select * into r from public.partner_network_referrals where id=t.referral_id for update;
 select * into p from public.partner_network_partners where id=t.partner_id;
 if r.status<>'accepted' or p.status<>'approved' then raise exception 'accepted_referral_required';end if;
 reason_value:=public.partner_network_text(p_input->>'reason');
 if length(reason_value) not between 1 and 1500 or p_action not in ('approve','reject') then raise exception 'invalid_partner_quote';end if;
 if p_action='approve' then
  address_value:=public.partner_network_text(coalesce(p_input->>'address',r.location));payment_value:=coalesce(p_input->>'payment_method','qr');
  if length(address_value)>1000 or payment_value not in ('qr','cash') then raise exception 'invalid_partner_quote';end if;
  perform public.trade_quote_assert_stock_units(t.proposed_lines);
  -- Only an existing wholesale BUYER with this opportunity is the account.
  select id into buyer_value from public.wholesale_accounts where opportunity_id=r.opportunity_id order by id limit 1;
  quote_value:='quote-partner-'||replace(t.id::text,'-','');
  insert into public.trade_quotes(id,opportunity_id,partner_account_id,customer_name,contact,address,status,lines,subtotal,discount_percent,total,payment_method,valid_until,terms,note,created_by,sent_at)
   values(quote_value,r.opportunity_id,buyer_value,r.business_name,r.contact,address_value,'sent',t.proposed_lines,t.subtotal,t.discount_percent,t.total,payment_value,t.valid_until,t.commercial_terms,'',coalesce(auth.uid()::text,''),now());
  update public.trade_opportunities set stage='quoted',next_action='Xác nhận khách đã nhận báo giá',next_action_at=now(),updated_at=now() where id=r.opportunity_id;
 end if;
 update public.partner_network_quote_terms set status=case p_action when 'approve' then 'approved' else 'rejected' end,quote_id=quote_value,review_reason=reason_value,reviewed_by=auth.uid(),reviewed_at=now(),revision=revision+1,updated_at=now() where id=t.id;
 return coalesce(quote_value,t.id::text);
end $$;

-- Other staff screens retain status/accept/convert actions, but cannot overwrite
-- sent commercial versions or move one to another customer's opportunity.
create function public.partner_network_protect_approved_quote() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare t public.partner_network_quote_terms;
begin
 select * into t from public.partner_network_quote_terms where quote_id=old.id;
 if found and new.status in ('sent','accepted','converted') and new.status is distinct from old.status then
  if t.status='revoked' or (old.converted_order_id is null and (t.valid_until<current_date or not exists(select 1 from public.partner_network_partners where id=t.partner_id and status='approved') or not exists(select 1 from public.partner_network_referrals where id=t.referral_id and status='accepted' and partner_id=t.partner_id))) then raise exception 'partner_quote_not_open';end if;
 end if;
 if new.converted_order_id is not null and new.converted_order_id is distinct from old.converted_order_id and t.id is not null and not exists(select 1 from public.orders where id=new.converted_order_id and quote_id=old.id) then raise exception 'partner_quote_order_mismatch';end if;
 if exists(select 1 from public.partner_network_quote_terms where quote_id=old.id) and
  (new.opportunity_id,new.partner_account_id,new.customer_name,new.contact,new.address,new.lines,new.subtotal,new.discount_percent,new.total,new.valid_until,new.terms,new.note,new.payment_method)
  is distinct from (old.opportunity_id,old.partner_account_id,old.customer_name,old.contact,old.address,old.lines,old.subtotal,old.discount_percent,old.total,old.valid_until,old.terms,old.note,old.payment_method) then raise exception 'partner_quote_version_immutable';end if;
 if exists(select 1 from public.partner_network_quote_terms where quote_id=old.id and status='revoked') and new.status in ('sent','accepted','converted') then raise exception 'partner_quote_not_open';end if;
 return new;
end $$;
create trigger partner_network_quote_immutable before update on public.trade_quotes for each row execute function public.partner_network_protect_approved_quote();

create function public.partner_network_quote_catalog() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_staff_manager() then raise exception 'manager_required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('product_id',p.id,'name',coalesce(nullif(p.name->>'vi',''),p.name->>'en',p.id),'variant_weight',coalesce(v.weight,''),'unit',public.trade_catalog_sale_unit(p.line,p.kind,p.pack_size,v.weight)) order by p.id,v.weight)
 from public.catalog_products p left join public.catalog_variants v on v.product_id=p.id where p.available),'[]');
end $$;

create function public.partner_network_quote_proposals(p_partner_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare partner_value uuid;
begin
 if public.is_staff_manager() then partner_value:=p_partner_id;
 else
  select id into partner_value from public.partner_network_partners where user_id=auth.uid() and status='approved';
  if partner_value is null or (p_partner_id is not null and p_partner_id<>partner_value) then raise exception 'partner_not_approved';end if;
 end if;
 return coalesce((select jsonb_agg(x.data order by x.released_at desc) from (
  select t.released_at,jsonb_build_object('id',t.id,'partner_id',t.partner_id,'referral_id',t.referral_id,'customer_name',r.business_name,'partner_name',p.contact_name,'version',t.version,'revision',t.revision,'status',t.status,'remuneration_mode',t.remuneration_mode,'base_lines',t.base_lines,'proposed_lines',t.proposed_lines,'discount_percent',t.discount_percent,'subtotal',t.subtotal,'total',t.total,'estimated_difference',case when t.remuneration_mode='price_difference' then t.estimated_difference end,'valid_until',t.valid_until,'commercial_terms',t.commercial_terms,'partner_note',t.partner_note,'quote_id',t.quote_id,'quote_status',q.status,'released_at',t.released_at,'submitted_at',t.submitted_at,'reviewed_at',t.reviewed_at) data
  from public.partner_network_quote_terms t join public.partner_network_referrals r on r.id=t.referral_id join public.partner_network_partners p on p.id=t.partner_id left join public.trade_quotes q on q.id=t.quote_id
  where (partner_value is null or t.partner_id=partner_value) and (public.is_staff_manager() or r.status='accepted') order by t.released_at desc limit 200)x),'[]');
end $$;

-- Finance0091 consumes this server-only immutable commercial snapshot. Current
-- order quantities may decrease on fulfilment; added/replaced products, increased
-- quantities, changed units or cancellation require a fresh commercial review.
create or replace function public.partner_network_price_difference_terms(p_order_id text) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare o public.orders;t public.partner_network_quote_terms;base jsonb;approved_line jsonb;actual jsonb;qty_value numeric;amount_value numeric:=0;goods_value numeric:=0;valid_value boolean:=true;reason_value text:='';fingerprint_value text;
begin
 select * into o from public.orders where id=p_order_id;
 if not found then return null;end if;
 select terms.* into t from public.partner_network_quote_terms terms join public.trade_quotes q on q.id=terms.quote_id where terms.status='approved' and (q.id=o.quote_id or q.converted_order_id=o.id) order by terms.reviewed_at desc limit 1;
 if not found or t.remuneration_mode<>'price_difference' then return null;end if;
 if o.status is distinct from 'completed' and coalesce(to_jsonb(o)->>'stage','')<>'completed' then valid_value:=false;reason_value:='fulfilment_not_completed';end if;
 if lower(coalesce(o.status,''))~'(cancel|return|refund|hủy|huỷ)' then valid_value:=false;reason_value:='order_cancelled_or_returned';end if;
 if jsonb_typeof(o.lines) is distinct from 'array' or jsonb_array_length(o.lines)=0 or jsonb_array_length(o.lines)<>jsonb_array_length(t.proposed_lines) then valid_value:=false;reason_value:='order_lines_changed';
 else
  for base in select * from jsonb_array_elements(t.base_lines) loop
   select x into approved_line from jsonb_array_elements(t.proposed_lines) x where x->>'productId'=base->>'product_id' and coalesce(x->>'weight','')=base->>'variant_weight' and x->>'unit'=base->>'unit';
   if (select count(*) from jsonb_array_elements(o.lines) x where x->>'productId'=base->>'product_id' and coalesce(x->>'weight','')=base->>'variant_weight' and x->>'unit'=base->>'unit')<>1 then valid_value:=false;reason_value:='order_product_or_unit_changed';exit;end if;
   select x into actual from jsonb_array_elements(o.lines) x where x->>'productId'=base->>'product_id' and coalesce(x->>'weight','')=base->>'variant_weight' and x->>'unit'=base->>'unit';
   begin qty_value:=(actual->>'qty')::numeric;exception when others then qty_value:=null;end;
   if qty_value is null or qty_value<=0 or qty_value>(approved_line->>'qty')::numeric or qty_value::text in ('NaN','Infinity','-Infinity') then valid_value:=false;reason_value:='order_quantity_changed';exit;end if;
   if (actual->>'price')::numeric is distinct from (approved_line->>'price')::numeric then valid_value:=false;reason_value:='order_price_changed';exit;end if;
   amount_value:=amount_value+qty_value*(base->>'base_price')::numeric;
   goods_value:=goods_value+qty_value*(approved_line->>'price')::numeric*(1-t.discount_percent/100);
  end loop;
 end if;
 if not exists(select 1 from public.partner_network_order_links l where l.order_id=o.id and l.referral_id=t.referral_id) then valid_value:=false;reason_value:='order_referral_changed';end if;
 fingerprint_value:=md5(jsonb_build_object('agreement_id',t.id,'version',t.version,'base_lines',t.base_lines,'approved_lines',t.proposed_lines,'actual_lines',o.lines,'mode',t.remuneration_mode,'valid',valid_value,'status',o.status)::text);
 return jsonb_build_object('remuneration_mode','price_difference','agreement_id',t.id,'version',t.version,'fingerprint',fingerprint_value,'valid',valid_value,'base_amount',round(amount_value,2),'goods_amount',round(goods_value,0),'reason',reason_value);
end $$;
revoke all on function public.partner_network_protect_approved_quote(),public.partner_network_price_difference_terms(text) from public,anon,authenticated;
revoke all on function public.partner_network_release_quote_terms(uuid,jsonb),public.partner_network_propose_quote(uuid,jsonb),public.partner_network_review_quote_proposal(uuid,text,jsonb),public.partner_network_quote_catalog(),public.partner_network_quote_proposals(uuid) from public,anon;
grant execute on function public.partner_network_release_quote_terms(uuid,jsonb),public.partner_network_propose_quote(uuid,jsonb),public.partner_network_review_quote_proposal(uuid,text,jsonb),public.partner_network_quote_catalog(),public.partner_network_quote_proposals(uuid) to authenticated;
commit;
