-- Reuse the existing protected SMS scheduler secret in Vault. No new paid cron
-- service or always-on laptop is required. Enable the job after the route is live.
begin;
create or replace function public.invoke_sample_followups()
returns bigint language plpgsql security definer set search_path='' as $$
declare retry_secret text;
begin
  if not exists(select 1 from public.sample_followup_settings where id=1 and enabled)
    or extract(hour from now() at time zone 'Asia/Ho_Chi_Minh') not between 9 and 17 then return null; end if;
  if not exists(select 1 from public.sample_followups where due_at<=now() and (
    (channel='sms' and status in ('pending','failed','sending') and attempts<3
      and last_error not in ('receipt_unconfirmed','submission_uncertain') and (retry_at is null or retry_at<=now())
      and (status<>'sending' or claimed_at<=now()-interval '20 minutes'))
    or (status in ('pending','sending','queued','failed') and telegram_notified_at is null and telegram_claimed_at is null
      and (channel='telegram' or status='queued' or (status='failed' and attempts>=3)
        or last_error in ('receipt_unconfirmed','submission_uncertain')))
  )) then return null; end if;
  select decrypted_secret into retry_secret from vault.decrypted_secrets
    where name='hoang_long_sms_retry_cron' limit 1;
  if retry_secret is null or retry_secret='' then raise exception 'SMS scheduler secret is not configured'; end if;
  return net.http_get(url:='https://www.hoanglongtra.com/api/cron/sample-followups',
    headers:=jsonb_build_object('Authorization','Bearer '||retry_secret), timeout_milliseconds:=60000);
end $$;
revoke all on function public.invoke_sample_followups() from public,anon,authenticated;
grant execute on function public.invoke_sample_followups() to service_role;
select cron.schedule('hoang-long-sample-followups','*/10 * * * *','select public.invoke_sample_followups();');
select cron.alter_job(jobid,active:=false) from cron.job where jobname='hoang-long-sample-followups';
commit;
