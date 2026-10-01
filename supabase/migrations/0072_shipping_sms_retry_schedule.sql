-- Vercel Hobby only allows daily cron. Supabase invokes this small, protected
-- shipping-only endpoint. Credentials remain in Vault, never in cron.job or Git.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_shipping_sms_retry()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare retry_secret text;
begin
  -- Tick every ten minutes, but only invoke the website when a message has been
  -- waiting three hours. No idle HTTP calls; no dependency on an open browser.
  if not exists (
    select 1 from public.sms_tracking_updates
    where status in ('pending','failed','needs_phone','sending')
      and updated_at <= now() - interval '3 hours'
  ) then return null; end if;
  select decrypted_secret into retry_secret
    from vault.decrypted_secrets where name = 'hoang_long_sms_retry_cron' limit 1;
  if retry_secret is null or retry_secret = '' then
    raise exception 'SMS retry scheduler secret is not configured';
  end if;
  return net.http_get(
    url := 'https://www.hoanglongtra.com/api/cron/shipping-sms',
    headers := jsonb_build_object('Authorization', 'Bearer ' || retry_secret),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.invoke_shipping_sms_retry() from public, anon, authenticated;
grant execute on function public.invoke_shipping_sms_retry() to service_role;

select cron.schedule('hoang-long-shipping-sms-retry', '*/10 * * * *',
  'select public.invoke_shipping_sms_retry();');
commit;
