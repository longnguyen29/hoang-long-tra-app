# Partner quotation proposals

This extension uses the existing accepted referral, Pipeline opportunity, customer quotation and order. It does not create another CRM or give introducers wholesale buyer access.

## Workflow

1. A manager chooses an accepted referral and releases a finite set of products, sale units, permitted quantities, Hoàng Long base prices, customer-facing packaging/delivery terms and expiry. The manager selects one remuneration mode: percentage commission or price difference.
2. The approved referring partner can propose quantities and customer selling prices for that release. The effective unit selling price after the quotation discount cannot be below its approved base. Requests for a lower base require the manager to release a new version with a reason.
3. A manager reviews the proposal. Approval creates an ordinary **sent** `trade_quotes` row for the real buyer opportunity; `partner_account_id` is the existing wholesale buyer account, never the introducer ID. Customer lines and terms contain selling prices only.
4. The established buyer acceptance / staff acceptance and quote conversion workflow creates the order and preserves referral attribution and conversion idempotency.
5. Finance reconciliation consumes a private immutable base snapshot for price-difference mode. It subtracts approved base for the actual eligible quantity from collected goods revenue; the finance module applies VAT/shipping/refund exclusions once. The mode cannot stack percentage commission automatically.

## Private data and permissions

`partner_network_quote_terms` is the private companion table. Authenticated table reads are manager-only; no authenticated direct writes are granted. Introducers receive an explicit own-partner projection through `partner_network_quote_proposals`. Pending/rejected referrals and disabled/unapproved partners do not grant proposal access. A separate manager-only catalog projection powers the release form.

The private Hoàng Long base, release reason and remuneration mode are not written into customer quote lines, terms or notes. Browser print/save-PDF uses `partnerCustomerQuote`, an explicit allowlist of customer name, selling lines, discount, total, expiry and public commercial terms.

Sent commercial versions cannot be overwritten through other staff quote screens. Changing the basis creates a new version, retains history and expires the superseded quote. Converted versions cannot be superseded. Existing quote status/accept/convert actions remain usable. New accept/convert transitions reject expired/revoked releases or disabled/referral-invalid sources.

## Finance hook

`partner_network_price_difference_terms(order_id)` is private and returns null for ordinary percentage commission. Approved price-difference quotes return:

- `remuneration_mode: price_difference`
- agreement ID, version and financial fingerprint
- `valid`
- `base_amount`
- reason when invalid

The base scales down for the same products, variants and sale units when fulfilled quantities decrease. Added/replaced products, changed units, increased/invalid quantities, cancellation/return status or changed referral attribution require a fresh review rather than guessing a base. All actual order lines are included in the fingerprint. Expiry after a valid order was created does not erase its settlement basis.

## Routes/components and RPC contracts

The existing manager and partner screens mount `PartnerQuoteDesk` and `PartnerQuoteProposals`. There is no new public route and no automatic public launch.

- `partner_network_release_quote_terms(referral_id, input)` — manager; UUID request ID, expected revision (0 for a new release), optional superseded ID, approved lines, mode, expiry, customer terms, internal reason.
- `partner_network_propose_quote(id, input)` — own approved partner; expected revision, exact released products/units, quantities, selling prices, discount and note.
- `partner_network_review_quote_proposal(id, action, input)` — manager approve/reject with expected revision and reason; optional delivery address and payment method.
- `partner_network_quote_proposals(partner_id default null)` — manager or strictly own partner projection.
- `partner_network_quote_catalog()` — manager catalog projection.

Migration: `0092_partner_quote_proposals.sql`, after the Classic/rewards finance migration `0091`. No new environment variables, integrations or automatic email/customer messages.

## Focused verification

`node --test lib/partner-quote-proposals.test.mjs`: four tests cover unit/quantity inputs, post-discount floors, mutually exclusive estimates and the customer print allowlist.

`EMBEDDED_POSTGRES_MODULE=... node tests/partner-quote-proposals-db.mjs`: creates a disposable local PostgreSQL instance; 26 assertions cover cross-partner isolation, manager-only release/review/catalog, private hook permissions, forged fields, revisions, below-floor prices, quote data separation, immutable versions, real established quote conversion/idempotency/attribution and changed fulfilled quantities/units/cancellations. It does not accept an external database URL or write production data.

Internal QA should use two isolated partner identities and a test buyer: release → propose → manager approve → customer print → accept → convert → reconcile. Check print preview for selling prices only. Test a revised release before conversion and confirm the superseded quote cannot be accepted. A 390px real-phone keyboard/print inspection remains useful.

## Deliberately limited

One full settlement per order; no automated payout, partial/supplemental payout ledger, partner price overrides below an approved floor, automatic commission-plus-spread combination, currency conversion or separate shipping/VAT pricing engine. The manager writes the public commercial basis explicitly. Existing converted/paid history is not rewritten. Large historical lists are bounded to the latest 200 proposals.
