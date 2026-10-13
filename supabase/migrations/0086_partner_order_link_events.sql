-- Attribute new B2B orders immediately through their existing quote/account.
-- No phone-only matching, ownership rewrite or public access to internal helpers.
begin;

create function public.partner_network_try_link_order(p_order_id text) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare order_row public.orders; referral_id_value uuid; source_value text;
begin
  select * into order_row from public.orders where id=p_order_id for update;
  if not found or order_row.type<>'wholesale' or exists(select 1 from public.partner_network_order_links where order_id=p_order_id) then return; end if;
  select r.id into referral_id_value from public.partner_network_referrals r
    join public.trade_quotes q on q.opportunity_id=r.opportunity_id
    where r.status='accepted' and order_row.ts>=r.created_at
      and (q.id=order_row.quote_id or q.converted_order_id=order_row.id)
    order by r.created_at,r.id limit 1;
  source_value:='quote';
  if referral_id_value is null then
    select r.id into referral_id_value from public.partner_network_referrals r
      join public.wholesale_accounts a on a.opportunity_id=r.opportunity_id
      where r.status='accepted' and order_row.ts>=r.created_at and a.id=order_row.partner_account_id
      order by r.created_at,r.id limit 1;
    source_value:='account';
  end if;
  if referral_id_value is not null then
    insert into public.partner_network_order_links(order_id,referral_id,source,reason,created_by)
    values(order_row.id,referral_id_value,source_value,
      case source_value when 'quote' then 'Liên kết báo giá trong Pipeline' else 'Liên kết tài khoản khách B2B trong Pipeline' end,auth.uid())
    on conflict(order_id) do nothing;
  end if;
end $$;

-- Batch callers acquire every order lock before inserting any referral FK.
-- This avoids holding referral A while waiting for another order of that client.
create function public.partner_network_link_order_batch(p_order_ids text[]) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare linked_order_id text;
begin
  perform 1 from public.orders where id=any(p_order_ids) order by id for update;
  for linked_order_id in select distinct unnest(p_order_ids) order by 1
  loop perform public.partner_network_try_link_order(linked_order_id); end loop;
end $$;

create or replace function public.partner_network_sync_order_links() returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare candidates text[];
begin
  if not public.is_staff_manager() then raise exception 'manager_required'; end if;
  select array_agg(o.id order by o.id) into candidates from public.orders o
    where o.type='wholesale' and not exists(select 1 from public.partner_network_order_links l where l.order_id=o.id)
      and (exists(select 1 from public.partner_network_referrals r join public.trade_quotes q on q.opportunity_id=r.opportunity_id
        where r.status='accepted' and o.ts>=r.created_at and (o.quote_id=q.id or q.converted_order_id=o.id))
      or exists(select 1 from public.partner_network_referrals r join public.wholesale_accounts a on a.opportunity_id=r.opportunity_id
        where r.status='accepted' and o.ts>=r.created_at and o.partner_account_id=a.id));
  perform public.partner_network_link_order_batch(coalesce(candidates,'{}'::text[]));
end $$;

create function public.partner_network_order_link_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  perform public.partner_network_try_link_order(new.id);
  return new;
end $$;
create trigger partner_network_order_link_event after insert or update of quote_id,partner_account_id,type,ts on public.orders
  for each row execute function public.partner_network_order_link_event();

create function public.partner_network_quote_link_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare candidates text[];
begin
  select array_agg(id order by id) into candidates from public.orders where quote_id=new.id or id=new.converted_order_id;
  perform public.partner_network_link_order_batch(coalesce(candidates,'{}'::text[]));
  return new;
end $$;
create trigger partner_network_quote_link_event after insert or update of opportunity_id,converted_order_id on public.trade_quotes
  for each row execute function public.partner_network_quote_link_event();

create function public.partner_network_account_link_event() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare candidates text[];
begin
  select array_agg(id order by id) into candidates from public.orders where partner_account_id=new.id;
  perform public.partner_network_link_order_batch(coalesce(candidates,'{}'::text[]));
  return new;
end $$;
create trigger partner_network_account_link_event after insert or update of opportunity_id on public.wholesale_accounts
  for each row execute function public.partner_network_account_link_event();

revoke all on function public.partner_network_try_link_order(text),public.partner_network_link_order_batch(text[]),public.partner_network_order_link_event(),
  public.partner_network_quote_link_event(),public.partner_network_account_link_event() from public,anon,authenticated;
commit;
