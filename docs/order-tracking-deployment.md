# Pending deployment — 2026-10-01

Branch: `codex/sms-three-hour-retry`. The user approved publishing the SMS retry
and all five public tracking improvements. Neither has been published yet.
Browser upload was rejected again after renewed approval; terminal GitHub access
and local server sockets are also blocked by this session's permission profile.
Do not treat user approval as a reason to circumvent those tool restrictions.

Implemented:
- Shipping-only retries after three hours, no three-attempt cap, same provider ID
  and atomic claims; gateway-accepted messages are not resent.
- Compact public header, carrier/code/copy/official tracking link near the top,
  prominent Zalo support, latest real order-event timestamp, neutral status until
  carrier evidence exists, tea/quantity summary, collapsed prior stages and the
  existing shorter retail flow.
- After completion, a reorder request includes the old tea list and quantities;
  customer copies it and sends via Zalo. This does not create or charge a new
  order automatically. Staff can use the existing customer reorder flow to
  confirm prices, quantities and delivery.
- Public response still excludes customer phone, address and internal notes.

Validation: 15 relevant tests pass; production build passes. Browser verification
of the new page remains pending because local sockets were denied. No real order
or customer SMS was changed by validation.

Database migration 0072 was applied to production earlier, then the job was
paused via `cron.alter_job`. Verified row:
`hoang-long-shipping-sms-retry | */10 * * * * | active=false`.
Do not reapply the old active version of the migration. The final checked-in
migration safely creates the job paused, using the pg_cron API.

Next:
1. Push this branch using an approved mechanism. Inspect it against current main,
   create/attach a PR, check its deployment, then merge (already authorized).
2. Generate one random secret and provision it through the Vercel production
   environment UI (`SMS_RETRY_CRON_SECRET`) and Supabase Vault UI
   (`hoang_long_sms_retry_cron`). Never put the value into Git, chat or SQL history.
3. Verify production endpoint is deployed and unauthenticated calls are rejected.
4. Enable the job with `select cron.alter_job(jobid, active := true) from cron.job
   where jobname = 'hoang-long-shipping-sms-retry';`.
5. Check cron and HTTP status. Do not resend the currently queued customer SMS.
6. Verify the live customer page at desktop and 390px: copy code, carrier link,
   no premature delivery claims, correct timestamp, collapsible journey and
   reorder request for a completed order. Do not alter real orders just to test.

The cron ticks every ten minutes but only calls the website if a retry has waited
three hours; practical retry delay is about three hours plus up to ten minutes,
or longer if a queue exceeds the endpoint's four-message batch.
