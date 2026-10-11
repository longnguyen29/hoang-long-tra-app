# Hoàng Long B2B Partner Network — Phase 1

Internal implementation, 12 October 2026. Branch: `codex/b2b-partner-network-phase-1`.

This release has not been pushed, deployed or applied to the production database. Main and the pre-existing branches remain intact. The only open PR at preflight was the unrelated Meta Pixel PR #8; this feature has no public PR or deployment.

## What is implemented

- Vietnamese partner programme landing and registration, separate from approval.
- Existing Supabase email-link authentication; applications require a confirmed email. An application draft is kept locally for at most 24 hours, bound to the requested email so a new-tab callback can resume it; it contains only registration fields and that email, never tokens or customer leads. Success/signout clears it and another verified email cannot load it. No new passwords, provider or user-role system.
- Manager/admin review: approve, reject, disable, reactivate by approving again, edit details and commercial terms. An immutable unique public code is assigned on first approval.
- Approved partners submit authorized business contacts, location, product interest, estimated **monthly** kg and notes. Unknown volume remains unknown. One request ID protects retry submissions; 30 new submissions per partner per day.
- Manager duplicate review against referrals, existing Pipeline contacts, wholesale buyers, orders and discovery prospects. Phone normalization handles `+84`/`0`; email matching is case-insensitive. Exact business/location matches are review signals, not automatic ownership.
- Accepting a referral creates or explicitly links the existing `trade_opportunities` record. It does not create a second CRM. Sampling, quotation, order conversion and receipt recording use the existing workflows.
- Referral attribution appears in the existing Pipeline and wholesale order detail when this feature is enabled and the viewer is a manager. Links open the partner desk with the correct referral selected.
- Quotations and customer-account relationships automatically link **orders created from the referral submission date onward**. Phone matching alone never silently claims an order. Manual historical attribution requires a manager reason and audit record.
- Configurable first-order and limited repeat commissions per referred customer; no seeded commission rate. Repeats default to zero entitlement. Distributor resale discounts do not automatically gain an extra referral commission: a separately reviewed order agreement is required.
- Actual-cash reconciliation, signed adjustment, manager approval, admin-only profit exception and manual recording of a completed payout. No automated payouts.
- Partner view contains only their own application, referrals, basic commercial stages, linked-order counts, paid-order counts and commission status/amounts. Costs, margins, internal CRM notes, other partners and duplicate candidates are never in this projection.
- Permanent append-only operational audit. Paid commission records remain immutable; later order reviews retain refunds/cancellations and identify overpayments.

## Routes and release gate

| Route | Purpose |
|---|---|
| `/partners` | New programme when enabled; the original signed-in wholesale customer portal remains available to existing buyer accounts. With the feature disabled, this route retains the original portal for everyone. |
| `/partners/account` | Original wholesale buyer portal. New buyer email links return here; old root PKCE links still finish the original buyer flow. Ordering/pricing functions are unchanged. |
| `/partners/network` | Partner email login, application continuation, own referrals and commissions. |
| `/partners/auth/callback` | PKCE email-link completion; only fixed partner destinations are accepted. |
| `/admin/partner-network` | Manager/admin partner, referral and commission desk. |
| `/admin/partner-network?referral=<uuid>` | Opens the relevant referral filter from existing Pipeline/order screens. |
| `/ui-review/partner-network` | Local development only: read-only simulated layout using the actual management cards. Save buttons are disabled; no database writes, email or payout calls. Always 404 in production. |

Server variable `PARTNER_NETWORK_ENABLED=true` opts into the programme. Omitted/false keeps new routes closed, hides new admin navigation/integration and preserves `/partners`. Partner/admin gates render on request rather than retaining an enabled static page from an earlier build. The programme is not in the sitemap, public homepage or advertising tracking allowlist. All new pages are `noindex`.

An environment flag closes the web UI; authorization and RLS independently protect the database. Do not apply this migration to production before internal review or assume `noindex` is authentication.

## Financial rules

The financial source is `receivable_payments` joined to the existing order's `receivables`, capped at its invoice total. `estimated_total`, quote value, a won lead and a completed shipment do not prove cash collection. A void receivable or cancelled/non-wholesale order cannot earn eligible revenue.

```text
eligible base = max(0, actual collected cash − reviewed VAT − billed shipping − actual refunds)
calculated commission = round(eligible base × negotiated percentage / 100, 2)
reviewed commission = calculated commission + signed, reasoned adjustment
profit budget = max(0, eligible base − reviewed internal costs − minimum retained profit)
```

Whole reviewed exclusions and whole reviewed order costs are deducted even on partial collections. This is deliberately conservative. There is no proportional accrual or accounting engine in V1.

Confirm VAT/shipping amounts **remaining after adjustments/refunds**, alongside the actual gross cash refunded, so the same refunded VAT or shipping is not deducted twice. Billed shipping is customer revenue excluded from commission, not Hoàng Long's shipping expense. Internal costs should reflect costs Hoàng Long bears and avoid double-counting depreciation, factory or management allocations already included in production cost; account consistently for reimbursed/pass-through transport.

Actual product/factory costs and target profit have not been invented. The figures in the supplied policy discussion and the read-only design fixture are examples, not defaults or a published rate policy. For a mixed-SKU order, a manager must confirm the complete order cost and retained-profit target before approval. The SKU economics/quotation guardrail engine is deferred.

Unknown cost/profit inputs can be saved for review but cannot be approved or paid. An amount above the profit budget needs a specifically recorded admin exception with a meaningful reason; a manager cannot grant that exception. Adjustments cannot create revenue on a cancelled/fully refunded order or exceed the eligible base. The system does not increase selling prices to fund commissions.

First/repeat positions are per referred customer, ordered by order date and ID among cash-collected qualifying orders. Current cancellation/full-refund reviews affect eligibility. If a position changes, approval becomes stale and reconciliation re-applies the corresponding agreed first/repeat policy; retaining another rate requires a reason. An unchanged order keeps its rate snapshot when the partner's future policy changes.

V1 records **one full commission settlement per order after the customer has paid the order in full**. Partial collections still support provisional calculation and approval; further collections invalidate approval until reviewed again. Paying early, paying partially, paying twice or paying more than the approved/current amount is rejected. Recording a payout does not send money. A later refund keeps the original paid record and flags recovery/offset work; actual recovery and supplementary settlement ledgers are V2.

## Database and authentication requirements

Apply `supabase/migrations/0084_b2b_partner_network.sql` once to an **isolated development/staging copy** after the existing migrations through 0083. No production application has occurred. The migration is transactional/additive, not a replay of previous migrations, and does not replace existing sampling, quotation, order or payment functions.

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

Enable email-link sign-in in that Supabase project and allow the exact test-origin partner callback redirect, including the `next=/partners/network` destination. Test on the same browser/device used to request the link, because PKCE requires that browser's verifier. Confirm email delivery and existing customer login in staging. Assign pilot managers through the existing staff-role administration, not by modifying partner input.

Local read-only review:

```sh
PARTNER_NETWORK_ENABLED=true npm run dev -- --hostname 127.0.0.1 --port 3110
```

The read-only fixture is safe without the migration. Real signup/approval/referral/reconciliation testing requires the isolated database and Auth setup above. Do not press live-save controls against production during internal review.

## Validation and limits

Validation results and manual QA are recorded in `docs/partner-network-qa.md`. SQL tests use disposable PGlite and fabricated contacts; they never contact Supabase or trigger messages. The optional PGlite installation lives outside this repository and is not a production dependency.

Current limits: exact/normalized duplicate signals require human resolution; no automatic ownership disputes, contract engine, beneficiary banking, tax withholding, email approval notification, partial commission payout/recovery ledger or scheduled reconciliation. Automatic structural links refresh when a manager opens the network desk or reconciles an order. Long histories are paginated in the manager UI but loaded in one snapshot in this small pilot; server pagination is a future growth step.

True multi-session PostgreSQL concurrency and actual Supabase email/login/browser mutation flows still need the isolated pilot QA. Database permissions/guardrails have been exercised with real SQL and isolated roles, not represented as a live Supabase test.

The existing Codex with ChatGPT association was inspected. Its connector returned an internal error; its old connection required repair and the ChatGPT browser session was signed out. This delivery does **not** claim a completed external ChatGPT review. No source, secrets or real customer data were pasted into ChatGPT.

## Changed-file map

- Shared rules/labels/gates/draft: `lib/partner-network.js`, `lib/partner-network-server.js`, `lib/partner-network-draft.js`.
- Public UI: `components/public/PartnerNetworkLanding.jsx` and `.module.css`, `PartnerNetworkPortal.jsx` and `.module.css`; `PartnerPortal.jsx` changes only its buyer email-link return address.
- Routes: `app/partners/page.js`, `account/page.js`, `network/page.js`, `auth/callback/route.js`, `app/admin/partner-network/page.js`.
- Admin UI: `components/staff/PartnerNetworkDesk.jsx` and `.module.css`.
- Existing workflow integration: `StaffFeatures.jsx`, `PartnerReferralLink.jsx` and `.module.css`, `StaffShell.jsx`, `staff-navigation.js`, `MorningDesk.jsx`, `TradePipeline.jsx`, `StaffWorkbench.jsx`, `app/admin/layout.jsx`.
- Local design review: `PartnerNetworkReview.jsx`, `app/ui-review/partner-network/page.js`.
- Database/tests: migration 0084, shared input/finance tests, real callback tests, isolated SQL runner/fixtures/assertions, `package.json` test commands.
- Documentation: this file, `partner-network-qa.md`, `retail-b2b-product-pages.md`.

No current catalogue, retail checkout, sample, quotation or SMS delivery logic was replaced. No secrets, existing local handoff markers or unrelated untracked files are part of the feature commit.
