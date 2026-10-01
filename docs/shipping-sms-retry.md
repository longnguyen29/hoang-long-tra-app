# Shipping SMS retries

Failed tracking SMS is retried after three hours, without the old three-attempt
cap. A Supabase cron tick every ten minutes invokes the protected shipping-only
endpoint only if a retry is due. This works on Vercel Hobby; it does not require a
phone browser, Codex or a laptop to remain open.

Messages already accepted by the gateway (`queued`) are never resubmitted. The
same provider message ID is retained across retries, and the existing atomic
claim prevents concurrent saves/jobs from submitting twice. An order that leaves
Shipping or changes its waybill makes the old retry ineligible.

Deployment: apply migration 0072 and provision the same random secret as Vercel
production `SMS_RETRY_CRON_SECRET` and Supabase Vault secret
`hoang_long_sms_retry_cron`. Do not store its value in files, Git or query history.
The migration creates a paused job. After the endpoint and secret are deployed,
enable it with `select cron.alter_job(jobid, active := true) from cron.job
where jobname = 'hoang-long-shipping-sms-retry';`.
Inspect `cron.job_run_details`, `net._http_response` (status only), and the order's
SMS history to check operation. A cron success means its SQL ran; also check the
HTTP response. The daily payment-reminder scan remains a fallback for shipping.

Scope: this schedule retries gateway submission failures for shipping updates.
It does not automatically resend gateway-accepted messages, infer delivery to a
customer, or change the existing three-day payment-reminder policy.
