# Hoàng Long B2B Partner Network — Phase 1

Internal release preparation, 12 October 2026. Branch: `codex/b2b-partner-network-phase-1`.

**Internal release in preparation; public registration remains closed.** The latest `origin/main`, including the released B2C catalog and shared cart, has been merged into the feature branch. Production migrations 0084–0086 were applied together in one transaction on 12 October 2026 after checking the live quote converters and required schema. A read-only postflight confirmed six RLS tables, three attribution triggers, corrected quote conversion and no anonymous/partner access to internal financial helpers. No partner records were created. SMTP and actual email-link delivery remain incomplete; application deployment status will be recorded after verification. Do not invite partners yet.

## What is implemented

- Vietnamese partner programme landing and registration, separate from approval.
- Existing Supabase email-link authentication; applications require a confirmed email. An application draft is kept locally for at most 24 hours, bound to the requested email so a new-tab callback can resume it; it contains only registration fields and that email, never tokens or customer leads. Success/signout/account changes clear old identity state; stale asynchronous account responses cannot re-open another account's draft. Initial verified-email draft resumption remains available. No new passwords, provider or user-role system.
- Manager/admin review: approve, reject, disable, reactivate by approving again, edit details and commercial terms. An immutable unique public code is assigned on first approval.
- Approved partners submit authorized business contacts, location, product interest, estimated **monthly** kg and notes. Unknown volume remains unknown. One request ID protects retry submissions; 30 new submissions per partner per day.
- Manager duplicate review against referrals, existing Pipeline contacts, wholesale buyers, orders and discovery prospects. Phone normalization handles `+84`/`0`; email matching is case-insensitive. Exact business/location matches are review signals, not automatic ownership.
- Accepting a referral creates or explicitly links the existing `trade_opportunities` record. It does not create a second CRM. Sampling, quotation, order conversion and receipt recording use the existing workflows.
- Referral attribution appears in the existing Pipeline and wholesale order detail when this feature is enabled and the viewer is a manager. Links open the partner desk with the correct referral selected.
- Quotations and customer-account relationships automatically link **orders created from the referral submission date onward**, immediately on order creation or relevant quote/account association changes. This no longer depends on opening the manager desk. Existing explicit attribution is never overwritten; phone matching alone never silently claims an order. Manual historical attribution requires a manager reason and audit record. A manager refresh also fills eligible legacy structural links.
- Quotation and customer-specific price-rule lines retain their agreed units and prices. Product selection starts with the actual catalog sale unit; changing units requires the price to be reviewed rather than silently converting kg, packs, viên or bánh. New order conversions count explicit mass and item totals separately, reject fractional piece quantities, and check recorded stock units. Historical orders and negotiated prices are not rewritten.
- Configurable first-order and limited repeat commissions per referred customer; no seeded commission rate. Repeats default to zero entitlement. Distributor resale discounts do not automatically gain an extra referral commission: a separately reviewed order agreement is required.
- Actual-cash reconciliation, signed adjustment, manager approval, admin-only profit exception and manual recording of a completed payout. No automated payouts.
- Partner view contains only their own application, referrals, basic commercial stages, linked-order counts, paid-order counts and commission status/amounts. Costs, margins, internal CRM notes, other partners and duplicate candidates are never in this projection.
- Permanent append-only operational audit. Paid commission records remain immutable; later order reviews retain refunds/cancellations and identify overpayments. If the first/repeat position changes after payout, the admin view flags manual entitlement review and leaves recovery unknown rather than asserting a verified zero from the historical rate.

## Routes and release gate

| Route | Purpose |
|---|---|
| `/partners` | New programme when enabled; the original signed-in wholesale customer portal remains available to existing buyer accounts. With the feature disabled, this route retains the original portal for everyone. |
| `/partners/account` | Original wholesale buyer portal. The existing wholesale-page CTA and new buyer email links return here; old root PKCE links still finish the original buyer flow. Existing account access, prices and history are preserved. |
| `/partners/network` | Partner email login, application continuation, own referrals and commissions. |
| `/partners/auth/callback` | PKCE email-link completion; only fixed partner destinations are accepted. |
| `/admin/partner-network` | Manager/admin partner, referral and commission desk. |
| `/admin/partner-network?referral=<uuid>` | Opens the relevant referral filter from existing Pipeline/order screens. |
| `/ui-review/partner-network` | Local development only: read-only simulated layout using the actual management cards. Save buttons are disabled; no database writes, email or payout calls. Always 404 in production. |

Server variable `PARTNER_NETWORK_ENABLED=true` enables the module and manager desk. A separate `PARTNER_NETWORK_PUBLIC_REGISTRATION=true` is required to open public registration; it defaults false. With only the module enabled, ordinary `/partners` visitors retain the buyer portal, verified managers can review the programme, and `/partners/network` supports existing accounts without creating new Auth accounts. Manager-only application access is checked on the server and bound to that verified identity across client account switches. Existing pending/approved profiles remain available. These are web-intake gates, not a revocation of the authenticated application RPC: verified users can still call that RPC directly, but new applications remain pending and do not gain lead/CRM access. Omitted/false module flag keeps new routes closed, hides new admin navigation/integration and preserves `/partners`. Partner/admin gates render on request rather than retaining an enabled static page from an earlier build. The programme is not in the sitemap, public homepage or advertising tracking allowlist. All new pages are `noindex`.

The existing session-refresh middleware now covers `/partners/:path*`, so expired wholesale-buyer sessions refresh before the server chooses their original portal. Retail/catalog routes are not added to that middleware scope.

An environment flag closes the web UI; authorization and RLS independently protect the database. Internal review and isolated database tests preceded migration application. Do not assume `noindex` is authentication or replay the applied migrations.

## Financial rules

The financial source is `receivable_payments` joined to the existing order's `receivables`, capped at its invoice total. `estimated_total`, quote value, a won lead and a completed shipment do not prove cash collection. A void receivable or cancelled/non-wholesale order cannot earn eligible revenue.

```text
eligible base = max(0, actual collected cash − reviewed VAT − billed shipping − actual refunds)
calculated commission = round(eligible base × negotiated percentage / 100) in whole VND, capped at floor(eligible base)
reviewed commission = calculated commission + signed, reasoned whole-VND adjustment
profit budget = max(0, eligible base − reviewed internal costs − minimum retained profit)
```

Whole reviewed exclusions and whole reviewed order costs are deducted even on partial collections. This is deliberately conservative. There is no proportional accrual or accounting engine in V1.

Confirm VAT/shipping amounts **remaining after adjustments/refunds**, alongside the actual gross cash refunded, so the same refunded VAT or shipping is not deducted twice. Billed shipping is customer revenue excluded from commission, not Hoàng Long's shipping expense. Internal costs should reflect costs Hoàng Long bears and avoid double-counting depreciation, factory or management allocations already included in production cost; account consistently for reimbursed/pass-through transport.

Actual product/factory costs and target profit have not been invented. The figures in the supplied policy discussion and the read-only design fixture are examples, not defaults or a published rate policy. For a mixed-SKU order, a manager must confirm the complete order cost and retained-profit target before approval. The SKU economics/quotation guardrail engine is deferred.

Unknown cost/profit inputs can be saved for review but cannot be approved or paid. An amount above the profit budget needs a specifically recorded admin exception with a meaningful reason; a manager cannot grant that exception. Adjustments cannot create revenue on a cancelled/fully refunded order or exceed the eligible base. The system does not increase selling prices to fund commissions.

First/repeat positions are per referred customer, ordered by order date and ID among cash-collected qualifying orders. Current cancellation/full-refund reviews affect eligibility. Before payout, a changed position makes approval stale and reconciliation re-applies the corresponding agreed first/repeat policy; retaining another rate requires a reason. An unchanged order keeps its rate snapshot when the partner's future policy changes.

After payout, a changed position sets `entitlement_review_required=true` and `overpaid_amount=null` in the manager projection. The original paid record/rate remain unchanged. A manager must review the historical agreement and any recovery/offset outside this V1 ledger; the app does not invent a retroactive entitlement policy. Ordinary cash/refund changes with an unchanged position still show the calculated overpayment. The partner's restricted projection does not expose internal cost or profit-review fields.

V1 records **one full commission settlement per order after the customer has paid the order in full**. Partial collections still support provisional calculation and approval; further collections invalidate approval until reviewed again. Paying early, paying partially, paying twice or paying more than the approved/current amount is rejected. Recording a payout does not send money. A later refund keeps the original paid record and flags recovery/offset work; actual recovery and supplementary settlement ledgers are V2.

## Database and authentication requirements

For a new isolated development/staging copy, apply these migrations once, in order, after the existing migrations through 0083. Production project `wwhrnbgvlfccriudvhqy` already has all three, applied on 12 October 2026. Do not replay them there. Disable the module/public intake with the flags if a rollout problem appears; do not destroy attribution, audit or payout history as a rollback.

| Migration | Change |
|---|---|
| `0084_b2b_partner_network.sql` | Six new Partner Network tables, authorization/RLS, intake/approval, CRM attribution, actual-cash commission reconciliation and immutable payout/audit history. |
| `0085_partner_quote_units.sql` | Private unit/quantity helpers; replaces the existing staff and wholesale-buyer quote-conversion functions while retaining their authentication, approval/status, inventory and reservation checks. Separates mass from item totals; historical orders remain untouched. |
| `0086_partner_order_link_events.sql` | Private event-linking helpers and triggers on orders, quotations and wholesale accounts. Immediate structural attribution with immutable origin and ordered batch locks; no extra scheduled job. |

All three are transactional. They retain the existing commercial entities and sampling/payment workflows; 0085 deliberately hardens the existing conversion entry points instead of adding another order flow.

New tables:

| Table | Purpose |
|---|---|
| `partner_network_partners` | Auth user membership, application, approval code and negotiated terms. |
| `partner_network_referrals` | Intake/attribution and the real CRM opportunity reference. |
| `partner_network_order_links` | One originating referral per real order, with linkage reason. |
| `partner_network_commissions` | One reviewed commission and immutable settlement per order. |
| `partner_network_order_reviews` | Latest exclusions, costs, cancellations/refunds, separate from historic payout. |
| `partner_network_audit` | Append-only actor/time/before/after history. |

Existing entities reused: `auth.users`, `staff_roles`, `is_staff_manager()`, `discovery_trade_contact_key()`, `discovery_prospects`/`discovery_contacts`, `trade_opportunities`, `sample_requests`, `trade_quotes`, `wholesale_accounts`, `orders`, `receivables`, `receivable_payments`.

All new direct table reads require manager/admin RLS; authenticated users have no direct insert/update/delete grant. Narrow security-definer RPCs derive partner identity from `auth.uid()`, reject unexpected self-application fields and validate input server-side. Internal financial/dedupe helpers are not publicly callable. No partner gets broader CRM or wholesale customer access.

Unreconciled mistaken orders remain deletable through the existing order flow: their referral link cascades and the audit retains the original link. Orders with commission/financial review history are protected from hard deletion.

Use existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, pointing to the isolated project for mutation testing. The new feature itself needs **no service-role credential**, extra paid infrastructure or new runtime dependency.

Enable email-link sign-in and a working authenticated SMTP sender in that Supabase project. SMTP configuration and hosted delivery are still incomplete at this checkpoint; approving a partner does not solve missing email delivery. The hosted Auth site URL has been corrected and five exact partner/buyer redirects saved; this is configuration evidence, not proof that login emails arrive or complete authentication. Allow the exact test-origin partner callback redirect, including the `next=/partners/network` destination. Also allow `/partners/account` for new buyer email links and retain `/partners` for links already sent; verify the corresponding production origins before release. Test on the same browser/device used to request the link, because PKCE requires that browser's verifier. Confirm actual delivery, callback completion, new application and existing customer login before a pilot. Assign pilot managers through the existing staff-role administration, not by modifying partner input.

Local read-only review:

```sh
PARTNER_NETWORK_ENABLED=true npm run dev -- --hostname 127.0.0.1 --port 3110
```

The read-only fixture is safe without the migration. Real signup/approval/referral/reconciliation testing requires the isolated database and Auth setup above. Do not press live-save controls against production during internal review.

## Validation and limits

Validation results and manual QA are recorded in `docs/partner-network-qa.md`; genuine PostgreSQL evidence is in `docs/partner-network-postgres-qa.md`. The complete Node suite passed 377 tests before the final separate-intake gate; the final focused Partner Network run passed 23 tests, including three new gate/identity checks. The genuine PostgreSQL harness passed 69 authorization/finance SQL assertions, 26 event-attribution SQL assertions and 12 independent-backend concurrency cases. Migration 0085 also passed 28 isolated quote-unit SQL assertions; nine trade-line/selling-unit JS tests and 27 retail tests passed. The initial production build with the feature enabled passed. The final internal-gate build is recorded in the QA document. SQL fixtures contain fabricated contacts and never contact Supabase or trigger customer messages. Test runtimes live outside this repository and are not production dependencies.

Current limits: exact/normalized duplicate signals require human resolution; no automatic ownership disputes, contract engine, beneficiary banking, tax withholding, email approval notification, partial commission payout/recovery ledger or scheduled financial reconciliation. Structural attribution is event-driven; commission calculation/approval remains an explicit manager operation. Long histories are paginated in the manager UI but loaded in one snapshot in this small pilot; server pagination is a future growth step.

True multi-session PostgreSQL concurrency is now verified in a disposable PostgreSQL 17 cluster. Hosted Supabase schema/configuration, SMTP delivery and complete browser email/login/mutation flows still need release QA. The isolated fixture is not evidence that those hosted checks passed.

The existing Codex with ChatGPT association was inspected. Its connector returned an internal error; its old connection required repair and the ChatGPT browser session was signed out. This delivery does **not** claim a completed external ChatGPT review. No source, secrets or real customer data were pasted into ChatGPT.

## Changed-file map

- Shared rules/labels/gates/draft: `lib/partner-network.js`, `lib/partner-network-server.js`, `lib/partner-network-draft.js`; agreed-unit helpers in `lib/trade-line-units.js`.
- Public UI: `components/public/PartnerNetworkLanding.jsx` and `.module.css`, `PartnerNetworkPortal.jsx` and `.module.css`; `PartnerPortal.jsx` preserves the buyer login destination and explains stock-unit conversion failures. `TradeDesk.jsx` keeps its CTA pointed to the buyer portal.
- Routes: `app/partners/page.js`, `account/page.js`, `network/page.js`, `auth/callback/route.js`, `app/admin/partner-network/page.js`.
- Admin UI: `components/staff/PartnerNetworkDesk.jsx` and `.module.css`.
- Existing workflow integration: `StaffFeatures.jsx`, `PartnerReferralLink.jsx` and `.module.css`, `StaffShell.jsx`, `staff-navigation.js`, `MorningDesk.jsx`, `TradePipeline.jsx` and `.module.css`, `StaffWorkbench.jsx`, `app/admin/layout.jsx`, `proxy.js`.
- Local design review: `PartnerNetworkReview.jsx`, `app/ui-review/partner-network/page.js`.
- Database/tests: migrations 0084–0086, shared input/finance/draft and agreed-unit tests, callback/matcher regression, isolated quote-unit runner/fixtures, Partner Network SQL assertions and genuine PostgreSQL concurrency runner, `package.json` test commands.
- Documentation: this file, `partner-network-qa.md`, `partner-network-postgres-qa.md`, `retail-b2b-product-pages.md`.

No current catalogue, retail checkout, sample, quotation or SMS delivery logic was replaced. No secrets, existing local handoff markers or unrelated untracked files are part of the feature commit.

## Email setup checkpoint

The production Auth site URL is now `https://www.hoanglongtra.com`, with five exact redirects for the network callback (with/without `next=/partners/network`), buyer account, original partners page and staff work. Resend account access was obtained; its only existing verified domain belongs to another project and is not used for Hoàng Long. A separate `auth.hoanglongtra.com` sending-domain setup is prepared, with DNS records awaiting the user’s Wix login. Root domain mail currently uses Spacemail; no root MX/SPF or website routing was changed. SMTP fields are prepared but **not saved/enabled** because domain verification and a dedicated sending-only credential remain pending. No real email/login completion has been verified. See `partner-network-email-setup.md` for the remaining owner actions.
