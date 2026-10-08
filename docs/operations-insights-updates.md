# Rankings, batch assessments and internal reminders

Deployed on 2026-10-07 through [PR #25](https://github.com/longnguyen29/hoang-long-tra-app/pull/25),
merge commit `8eefec0ce7f6559132d40ac404b61be3e82ca231`. Production deployment
`dpl_EMKxJYXg9AZPCowRxaYPMZPWmmQX` is READY at `www.hoanglongtra.com`.
Authenticated admin live pages and mobile layout were checked as recorded
below. Real Telegram delivery and business-data saves are not yet confirmed.

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

Migrations 0073 (monthly business metrics), 0074 (government obligations) and
0075 (batch review history) were applied to the production database through
the Supabase SQL editor before deploying the code. All 18 read-only catalog,
RLS and role-privilege checks passed. These checks confirm table/function
presence and configured permissions; they do not replace actual save/reload
or identity-specific access checks.

The production reminder schedule for `/api/cron/dashboard-reminders` is
confirmed as `30 0 * * *` (07:30 Vietnam time daily). Clicking **Gửi nhắc đến hạn**
on live returned **Không có nhắc mới đủ điều kiện gửi**, with zero messages sent.
An actual automated job run and Telegram receipt are not yet confirmed. Do not
rerun previously applied migrations during later deployments.

## Validation and manual checks

28 focused tests passed: 7 ranking, 6 batch-score validation/summary, 10 calendar,
5 reminder processor checks with a fake transport. Integrated production build
passed. A final display-only correction prevents failed history loads from
showing an apparent zero review count; included in the final build.

Live checks completed with an authenticated administrator:

- Metrics finished loading an empty month, showed **Tháng này chưa có số liệu
  đã lưu**, and enabled the form without errors.
- Rankings loaded four completed orders and the product/buyer lists.
- Government obligations showed five undated, unconfirmed drafts. Two pending
  feature notes and five older unchecked Today tasks remained visible.
- Metrics, rankings and government pages had no horizontal overflow at 390 px;
  the rankings layout was visually usable. The updates page showed the new
  version headings.
- The batches page loaded without errors, but no existing batch cards were
  available to open the actual review form. No batch or assessment was created.

Remaining manual behavior checks:

- All history vs month/year, both rank sorts, one product in multiple lines,
  same phone in different formats, missing prices and mixed quantity units.
- A batch assessment when a real batch is available: all three scores, an issue with notes, saved reviewer
  identity/time, another batch, page reload, history pagination and a draft.
- One real internal due reminder and a second click, plus a future reminder
  that should not send. Confirm the bot receives the real message and the
  scheduled job executes. The zero-send manual check does not verify delivery.
- Metrics save/reload and version conflict; detailed forms/history on desktop
  and 390 px once real data is available.
- Staff access permitted, non-staff/anonymous review writes denied, direct
  authenticated table writes denied. Catalog/RLS/grants and migration execution
  are verified; identity-specific calls and real writes remain untested.
