# Personal partner pages and a shared commercial journey

Extends the existing Partner Network, CRM, samples, quotes, orderbook and commission ledger. Each partner has an own-scope CRM view; there is no second customer/order database.

## Where to use it

- `/admin/partner-network` → **Bộ chào hàng**: choose an approved partner, create a public display name/phone/region/tea selection and a stable `/doi-tac/[slug]` link. Save privately first or explicitly review contact-publication permission before enabling it. Opening public partner registration remains a separate disabled flag.
- The same section creates selected-tea/currency links for an enabled page. Static sales profiles and UTM codes remain presentation/source hints, not ownership.
- `/admin/partner-network` → **Khách giới thiệu**: review inbound source/duplicates and accept/reject using the existing CRM workflow.
- `/admin/partner-network` → **Tiến độ đơn**: manage a partner-facing update, next action, optional explained forecast and expected commission payment date on an already attributed order.
- `/partners/network` → **Đơn & tiến độ**: own accepted referrals, samples, quotations, individual orders, carrier status and commission figures. Orders, delivery and actual customer collection remain separate facts.

The legacy `/export/taiwan?profile=anh-long` page stays usable without an account. Its form records a presentation source in the private CRM note but does not invent commission rights. Once a real approved partner page with slug `anh-long` is explicitly published, old links/printed QR codes redirect to it. Optional lookup failure preserves the old presentation; submitted source hints still need manager review. No legacy person is automatically attached to an account by name or phone.

## Identity, intake and duplicate resolution

1. Published page metadata contains only slug, reviewed public name/phone/region, known tea IDs and revision. Account ID, login email, customer data and financial terms never become public props.
2. The buyer explicitly permits sharing the enquiry/contact and basic progress with the named partner. The form keeps customer and introducer identities separate. Region/destination is required; an order quantity is stored separately from monthly potential.
3. The server validates origin/body/contact, resolves slug+revision under database locks, rechecks active approved ownership and permitted teas, then invokes the existing service-only event transaction and creates a pending referral atomically.
4. Retries return the same public receipt. Different content/page ownership for the same request is rejected. A disabled/withdrawn/changed page never silently becomes an uncredited general enquiry.
5. Hoàng Long reviews duplicates before acceptance. The central opportunity created/matched by intake is reused. Pending/rejected sources expose only the submitted data, with no preexisting sample/quote/order history. Existing customer commercial fields and accepted sources are not overwritten.
6. Accepted referrals reuse existing structural quote/account order attribution and explicit manager linkage. Source receipt time prevents automatic credit for older orders. A manager's exceptional manual attribution still needs the existing recorded reason.

Page ownership is immutable; slugs are fixed after first publication so old links cannot silently move to a different partner. `expected_revision` blocks stale manager forms from overwriting or reopening a changed/withdrawn page. Contact/product edits require renewed content review.

## Truthful progress and money

| Field | Meaning |
|---|---|
| Sample / quotation state | Existing linked record status; “sent” is not receipt/delivery confirmation. |
| Order stage | Existing Orderbook stage reconciled with status. No separate partner-stage writer. |
| Carrier / POD | Existing carrier state and delivered timestamp. A waybill alone is not successful delivery. |
| Planned delivery | Existing Procedure Run's `delivery_due_at`, unknown when no plan exists. |
| Latest update | Latest order-event timestamp, actual carrier/delivery or shared update. Event messages/actors remain private. |
| Expected commission | Optional whole-VND forecast explicitly entered by management with an explanation. Not automatic income or an approved amount. |
| Provisional / approved | Existing actual-collection/cost review and commission approval, preserving the chosen revenue/profit basis. Stale/unknown values are not shown as zero. |
| Actual paid | Immutable existing payout record and `paid_at`. Recording it does not transfer money. |
| Planned payment date | Explicit management estimate, distinct from planned delivery and actual payout. |

The eventual reviewed/paid commission can exceed or fall below the forecast; existing reasoned adjustments apply before approval/payment. Supplementary payments after a recorded full settlement require a future separate ledger. No payout policy or delivery-completion gate was silently changed in this release.

Own-order projection exposes only product names/quantities/units, progress, shipping and explicitly shared updates. It excludes prices/margins, costs, internal notes, full addresses, staff event contents and customer tracking-access tokens. Detailed cost statements continue to require the separate explicit per-order release implemented in migration 0087.

## Database / environment

Apply `0088_partner_sales_journey.sql` once, after existing migrations 0077 and 0084–0087. It adds `partner_network_sales_pages`, source fields to referrals and forecast/public-update fields to existing order links; extends authenticated own/admin snapshots and source resolution; adds scoped page/update/intake RPCs and audit history. No new environment variable or runtime dependency. Existing server-only Supabase credentials and Partner Network flags are reused. Actual page publication/invitations are not seeded by migration.

## Validation and pilot

Focused JavaScript tests cover safe public DTOs, valid scoped links, consent/body validation, source-only legacy behavior, no uncredited fallback, truthful shipping/collection/forecast/date semantics and unknown values. Isolated real PostgreSQL tests cover atomic intake/retries, same central opportunity, competing source review, old-order exclusion, scoped projections, stale editor checks, disabled pages and immutable paid history. Run `EMBEDDED_POSTGRES_MODULE=... node tests/partner-sales-journey-db.mjs` only against its disposable fixture; it never accepts a production database URL.

Release validation completed: 32 focused JavaScript tests passed; disposable real PostgreSQL verification passed 60 focused SQL assertions, an actual concurrent intake race and 69 legacy assertions. The production build passed. The legacy `npm run lint` command is unsupported by the installed Next.js version, so no successful lint result is claimed. Production rollout and the real-partner pilot remain separate from these automated checks.

Before inviting 5–10 real partners: confirm business contact publication permission; invite/verify/approve; create and review their page; use the first actual authorized enquiry to verify central intake and the partner's pending row; resolve any duplicate; create sample/quote/order through existing workflows; confirm order progress and plans; enter an explained forecast; reconcile actual costs/cash; review, approve and record only an actual payout. Check phones at 390px, downloads and the partner's own login. Do not submit synthetic customer enquiries or test financial entries to production.

V1 limits: one public page per approved partner; four current export offers; latest 10 samples/quotes per referral and latest 200 linked order cards; no live push/subscription (use **Cập nhật**/reload), separate supplementary payouts, automatic costing, fuzzy ownership, public registration launch or automatic invitations. The generic downloadable PDF remains branded Hoàng Long; native **In / lưu PDF** captures the current personalized contact and selection.
