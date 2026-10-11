-- Receipt reads and manager-controlled retries reuse the existing SMS ledgers.
-- No messages are sent and no historic delivery outcome is guessed here.
begin;

alter table public.sms_tracking_updates
  add column provider_checked_at timestamptz,
  add column provider_sent_at timestamptz,
  add column provider_delivered_at timestamptz,
  add column provider_states jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_states)='object'),
  add column provider_check_error text not null default '',
  add column retry_generation integer not null default 0 check (retry_generation>=0),
  add column submission_token uuid;
alter table public.sms_tracking_updates drop constraint sms_tracking_updates_status_check;
alter table public.sms_tracking_updates add constraint sms_tracking_updates_status_check
  check (status in ('pending','sending','queued','failed','needs_phone','skipped','uncertain'));

alter table public.sms_payment_reminders
  add column provider_checked_at timestamptz,
  add column provider_sent_at timestamptz,
  add column provider_delivered_at timestamptz,
  add column provider_states jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_states)='object'),
  add column provider_check_error text not null default '';

-- sample_followups.sent_at remains the sample-dispatch date, protected by the
-- seven-day due_at constraint. Provider timestamps are separate on all ledgers.
alter table public.sample_followups
  add column provider_checked_at timestamptz,
  add column provider_sent_at timestamptz,
  add column provider_delivered_at timestamptz,
  add column provider_states jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_states)='object'),
  add column provider_check_error text not null default '';

create index sms_tracking_updates_provider_check_idx on public.sms_tracking_updates(provider_checked_at)
  where status in ('queued','uncertain');

-- Reuse the existing protected 10-minute tick. It also refreshes accepted or
-- uncertain receipts; definite pre-submission failures retain the 3-hour wait.
create or replace function public.invoke_shipping_sms_retry()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare retry_secret text;
begin
  if not exists (
    select 1 from public.sms_tracking_updates
      where status in ('pending','failed','needs_phone','sending') and updated_at<=now()-interval '3 hours'
    union all
    select 1 from public.sms_tracking_updates
      where status in ('queued','uncertain') and provider_message_id<>''
        and provider_state not in ('Delivered','Failed','Cancelled') and updated_at>=now()-interval '7 days'
        and (provider_checked_at is null or provider_checked_at<=now()-interval '10 minutes')
    union all
    select 1 from public.sms_payment_reminders
      where status in ('queued','sent') and provider_message_id<>''
        and provider_state not in ('Delivered','Failed','Cancelled') and updated_at>=now()-interval '7 days'
        and (provider_checked_at is null or provider_checked_at<=now()-interval '10 minutes')
    union all
    select 1 from public.sample_followups
      where status='queued' and channel='sms' and provider_message_id<>''
        and provider_state not in ('Delivered','Failed','Cancelled') and updated_at>=now()-interval '7 days'
        and (provider_checked_at is null or provider_checked_at<=now()-interval '10 minutes')
  ) then return null; end if;
  select decrypted_secret into retry_secret from vault.decrypted_secrets
    where name='hoang_long_sms_retry_cron' limit 1;
  if retry_secret is null or retry_secret='' then raise exception 'SMS retry scheduler secret is not configured'; end if;
  return net.http_get(url:='https://www.hoanglongtra.com/api/cron/shipping-sms',
    headers:=jsonb_build_object('Authorization','Bearer '||retry_secret),timeout_milliseconds:=60000);
end;
$$;
revoke all on function public.invoke_shipping_sms_retry() from public,anon,authenticated;
grant execute on function public.invoke_shipping_sms_retry() to service_role;

commit;
