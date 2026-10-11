# Sample follow-up

One follow-up is scheduled seven days after actual dispatch, for sample requests
and pure sample orders created after `sample_followup_settings.starts_at`.
Existing requests/orders are not backfilled. A request's first `sent_at` and each
source's unique queue receipt keep status toggles from restarting its timer.
Order classification uses catalogue product IDs with `line=sample`; free-text
legacy test packs and mixed commercial/sample orders are not guessed.

Staff see **Hỏi thăm mẫu thử** on Dashboard and Order book. They can preview the
message, add notes, record feedback/contact, stop, switch an individual record to
Telegram-only, or pause automation. Recorded feedback, do-not-contact, closed
relationships, a later commercial order and delivery problems suppress sending.
SMS replies are not automatically imported: record them in the panel/Pipeline.

SMS uses the existing encrypted Android gateway. Only a complete Vietnamese
mobile number is accepted. Sending runs 09:00–18:00 Vietnam time, up to three
attempts with at least three hours between definite rejections. Accepted messages
are never retried. Timeout/ambiguous provider responses and unconfirmed receipts
require checking the sending phone. A successful gateway response means queued
for the phone, not confirmed customer delivery. Telegram reports queued SMS,
exhausted failures, or uncertain results after the active lease expires.

Deployment: apply additive migrations 0078 and 0079, deploy the protected
`/api/cron/sample-followups` route, then activate `hoang-long-sample-followups` in
`cron.job`. The paused job checks every ten minutes and calls only when work is
due, reusing Vault `hoang_long_sms_retry_cron` and the production
`SMS_RETRY_CRON_SECRET`. Never copy credential values into source, SQL or logs.
The laptop and browser do not need to remain open.

Validation: `tests/sample-followup.test.mjs` mocks all external sends;
`tests/sql/sample-followups.sql` runs transactional fixtures and rolls back.
Do not invoke the live sending endpoint or seed customer messages for QA.
