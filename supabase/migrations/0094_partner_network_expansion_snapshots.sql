-- Compose the existing CRM projections with private quotes, explicit Classic terms and retail referrals.
-- No public programme activation, customer reattribution or financial writes occur in this migration.
begin;
alter function public.partner_network_snapshot() rename to partner_network_snapshot_before_expansion;
revoke all on function public.partner_network_snapshot_before_expansion() from public,anon,authenticated;
create function public.partner_network_snapshot() returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare result jsonb; p public.partner_network_partners; r public.partner_network_referrals; c public.partner_network_commissions;
 item jsonb; refs jsonb:='[]'::jsonb; commissions_value jsonb:='[]'::jsonb;
begin
 result:=public.partner_network_snapshot_before_expansion();
 select * into p from public.partner_network_partners where user_id=auth.uid();
 if not found then return result||jsonb_build_object('quote_proposals','[]'::jsonb,'rewards',public.partner_network_rewards_snapshot(null)); end if;
 for item in select value from jsonb_array_elements(coalesce(result->'referrals','[]'::jsonb)) loop
  select * into r from public.partner_network_referrals where id=(item->>'id')::uuid and partner_id=p.id;
  if found then
   item:=item||jsonb_build_object('channel',r.channel);
   -- Retail consent covers the referred orders, not the customer's older commercial history.
   if r.channel='b2c' then item:=item||jsonb_build_object('samples','[]'::jsonb,'quotes','[]'::jsonb,'pipeline_stage',case when r.status='accepted' then case when exists(select 1 from public.partner_network_order_links l where l.referral_id=r.id) then 'won' else 'qualified' end else r.status end); end if;
   refs:=refs||jsonb_build_array(item);
  end if;
 end loop;
 for item in select value from jsonb_array_elements(coalesce(result->'commissions','[]'::jsonb)) loop
  select * into c from public.partner_network_commissions where id=(item->>'id')::uuid and partner_id=p.id;
  if found then commissions_value:=commissions_value||jsonb_build_array(item||jsonb_build_object('remuneration_mode',c.remuneration_mode,'classic_agreement_id',c.classic_agreement_id)); end if;
 end loop;
 return result||jsonb_build_object('referrals',refs,'commissions',commissions_value,
  'quote_proposals',case when p.status='approved' then public.partner_network_quote_proposals(p.id) else '[]'::jsonb end,
  'rewards',public.partner_network_rewards_snapshot(p.id));
end $$;

alter function public.partner_network_admin_snapshot() rename to partner_network_admin_snapshot_before_expansion;
revoke all on function public.partner_network_admin_snapshot_before_expansion() from public,anon,authenticated;
create function public.partner_network_admin_snapshot() returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result jsonb; item jsonb; refs jsonb:='[]'::jsonb; orders_value jsonb:='[]'::jsonb; referral_row public.partner_network_referrals; q jsonb;
begin
 if not public.is_staff_manager() then raise exception 'manager_required'; end if;
 result:=public.partner_network_admin_snapshot_before_expansion();
 for item in select value from jsonb_array_elements(coalesce(result->'referrals','[]'::jsonb)) loop
  select * into referral_row from public.partner_network_referrals where id=(item->>'id')::uuid;
  refs:=refs||jsonb_build_array(item||jsonb_build_object('channel',referral_row.channel,'source_order_count',(select count(*) from public.partner_network_retail_intakes i where i.referral_id=referral_row.id)));
 end loop;
 -- Keep wholesale suggestions and append only structurally referred retail orders.
 for item in select value from jsonb_array_elements(coalesce(result->'orders','[]'::jsonb))
 union all
 select jsonb_build_object('id',o.id,'customer_name',o.customer_name,'contact',o.contact,'type',o.type,'status',o.status,'ts',o.ts,
  'collected',(public.partner_network_financial(o.id)->>'collected')::numeric,'receivable_id',public.partner_network_financial(o.id)->>'receivable_id',
  'receivable_total',(public.partner_network_financial(o.id)->>'receivable_total')::numeric,'referral_id',l.referral_id,'partner_id',r.partner_id)
 from public.orders o left join public.partner_network_order_links l on l.order_id=o.id left join public.partner_network_referrals r on r.id=l.referral_id
 where o.type='retail' and (l.order_id is not null or exists(select 1 from public.partner_network_retail_intakes i where i.order_id=o.id))
 loop
  q:=public.partner_network_price_difference_terms(item->>'id');
  orders_value:=orders_value||jsonb_build_array(item||jsonb_build_object('classic_agreement',public.partner_network_classic_for_order(item->>'id'),
   'remuneration_mode',coalesce(q->>'remuneration_mode','commission')));
 end loop;
 return result||jsonb_build_object('referrals',refs,'orders',orders_value,'quote_proposals',public.partner_network_quote_proposals(null),
  'quote_catalog',public.partner_network_quote_catalog(),'rewards',public.partner_network_rewards_snapshot(null));
end $$;
revoke all on function public.partner_network_snapshot(),public.partner_network_admin_snapshot() from public,anon;
grant execute on function public.partner_network_snapshot(),public.partner_network_admin_snapshot() to authenticated;
commit;
