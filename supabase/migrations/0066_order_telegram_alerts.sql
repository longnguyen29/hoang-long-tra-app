-- Claim each new order alert atomically. A retry after a failed send can claim again;
-- a successful alert cannot be replayed by another browser or creation path.
alter table public.orders add column if not exists telegram_notification_claimed_at timestamptz;
alter table public.orders add column if not exists telegram_notified_at timestamptz;

create or replace function public.claim_order_telegram_notification(p_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare claimed_id text;
begin
  update public.orders set telegram_notification_claimed_at=now()
  where id=p_id and ts >= now()-interval '5 minutes'
    and telegram_notified_at is null
    and (telegram_notification_claimed_at is null or telegram_notification_claimed_at < now()-interval '2 minutes')
  returning id into claimed_id;
  return claimed_id is not null;
end $$;
revoke all on function public.claim_order_telegram_notification(text) from public,anon,authenticated;
grant execute on function public.claim_order_telegram_notification(text) to service_role;
