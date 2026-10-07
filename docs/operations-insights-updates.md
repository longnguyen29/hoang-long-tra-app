# Rankings, batch assessments and internal reminders

Implemented locally on 2026-10-07. This document does not confirm a production
deployment or any real Telegram delivery.

## App locations

- Dashboard → Đang chờ · Lịch năm: existing reminder settings and new **Gửi nhắc
  đến hạn** button, plus a shortcut to the update list.
- Báo cáo & thiết lập → **Xếp hạng**, `/admin/control?tab=rankings`.
- Vận hành → **Lô & chất lượng**, `/admin/operations?tab=batches`; choose
  **Đánh giá lô** on a batch card. The first batch is shown initially.
- Báo cáo & thiết lập → **Cập nhật app**, `/admin/control?tab=updates`. New
  dated feature entries belong in `lib/app-updates.js`. The list describes the
  build being viewed, not deployment status of other branches or computers.
  Personal notes/pending feature checks reuse Dashboard's existing `feature`
  items and their completion/history controls.

## Ranking rules

The default is completed orders, filtered by creation date in Vietnam, across
the full accessible order history. Data loads in 500-row pages, avoiding the
single-request response cap. Nothing new is saved or duplicated for rankings.

Products default to distinct order count, with a value sort option. The same
product ID is aggregated across pack variants; kg, grams, packages and pieces
remain separate. Line values are quantity × unit price before order-level
discounts, VAT or freight. Buyers default to known completed-order value, with
an order-count option. Buyer values reuse `estimated_total`; they are order
references, not recognized revenue, cash collected or the monthly EBITDA input.

Known Vietnamese/international phone numbers and email identities can be grouped.
Explicit partner IDs are supported by the helper when available. Unknown contacts
stay per order, so shared names do not accidentally combine unrelated customers.
The existing order mapper now preserves `partner_account_id` for that fallback.
Missing amounts are unknown, not zero; partial totals, missing quantities and
incomplete identities are visible. Tea without a product ID falls back to a name
group and is marked as incomplete. Duplicate order IDs do not inflate rankings.

## Telegram

The automatic job remains `/api/cron/dashboard-reminders`, configured for 07:30
Vietnam time daily. `POST /api/staff/dashboard-reminders` authenticates an
admin/manager with their Supabase session; it shares the same due-window scan,
server-only bot credentials, atomic claims and successful-event deduplication.
It cannot accept arbitrary text, a future date or a forced item from the client.
Ordinary reminders use their chosen day lead; confirmed recurring government
obligations use one calendar month. Future periods and completed items are not
sent early. Unchecked tasks stay on the dashboard.

Transport failures release the claim for a later scheduled retry. Successful
Telegram transmission and successful receipt persistence are separate results.
If Telegram accepted the message but the database receipt save failed, the
processor retains the lease and reports `receiptFailed`; inspect Telegram before
retrying. A lease eventually expires, so this is not an exactly-once guarantee
across transport/database outages. Nothing was actually sent during tests.

## Database and deployment

New migration `0075_tea_batch_reviews.sql` adds private append-only sensory review
history and a staff-authorized creation RPC. Reviewer identity and time are
assigned server-side. Reviews never change stock, batch release or public
passport data. See `batch-quality-reviews.md` for fields and access rules.

This local branch also includes the previous **unapplied** migrations 0073
(monthly business metrics) and 0074 (government obligations). Before publishing:

1. Fetch and reconcile remote changes while preserving local work.
2. Check migration history; apply only missing migrations 0073–0075 in order.
   Do not rerun old migrations or assume this document is the live database state.
3. Push/merge the reviewed code and verify the production deployment.
4. Verify the existing bot/chat configuration and scheduled reminder job.

Current session cannot resolve GitHub and has no approved browser/computer
control. Database migrations, publishing and real Telegram sends are therefore
not claimed complete.

## Validation and manual checks

28 focused tests passed: 7 ranking, 6 batch-score validation/summary, 10 calendar,
5 reminder processor checks with a fake transport. Integrated production build
passed. A final display-only correction prevents failed history loads from
showing an apparent zero review count; included in the final build.

After deployment, manually check:

- All history vs month/year, both rank sorts, one product in multiple lines,
  same phone in different formats, missing prices and mixed quantity units.
- A batch assessment with all three scores, an issue with notes, saved reviewer
  identity/time, another batch, page reload, history pagination and a draft.
- One real internal due reminder and a second click, plus a future reminder
  that should not send. Confirm the bot receives the real message.
- Feature links and pending notes; desktop and 390 px mobile layouts.
- Staff access permitted, non-staff/anonymous review writes denied, direct
  authenticated table writes denied. Migration runtime remains unverified here.
