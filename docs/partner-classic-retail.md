# Partner Network: Classic, retail and private quote terms

Routes: `/admin/partner-network` (manager), `/partners/network` (own partner), `/gioi-thieu/[published-personal-page-slug]` (retail sharing), `/shop?ref=slug` (retail checkout), `/admin/documents` (read-only agreement drafting).

## Confirmed policy

Classic applies prospectively after explicit manager adoption. Both B2B and B2C use 1% of confirmed profit before commission for the first two qualifying purchases of the same referred customer; subsequent purchases use 2%. Only accepted, explicitly linked partner sales count. Completed, fully collected, non-refunded earlier purchases determine repeat eligibility. No company-wide or silent telephone-based attribution. Legacy agreements and paid history remain intact.

Configurable commissioner tiers specify tenure since approval, net collected revenue from attributed orders in the trailing twelve months, all/any eligibility, base/repeat profit rates and a monthly reward multiplier. Managers explicitly adopt an eligible tier with a reason; no automatic promotion or retroactive settlement change. Tier definitions are immutable except for opening/stopping future eligibility; applied agreements retain snapshots. Current net revenue is unknown if relevant exclusions have not been reviewed.

The UI offers **inactive illustrative** examples, not adopted policies:

| Example | Eligibility (either) | First two / third onward | Monthly reward multiplier |
| --- | --- | --- | --- |
| Classic | Manager adoption | 1% / 2% profit | 1 |
| Gắn bó | 12 months or VND500m net collected / 12 months | 2% / 2% profit | 1.25 |
| Phát triển | 24 months or VND2bn net collected / 12 months | 2% / 2% profit | 1.5 |

Commission rates do not stack. Higher personal rewards remain discretionary; a tier does not automatically promise them. The numbers above need actual commercial-cost review.

## Rewards

Manager-configured monthly thresholds are versioned, inactive until explicitly adopted. The highest threshold only applies, not the sum. The example form fills 5/10/20 orders = VND50k/150k/400k and leaves approval unchecked. No migration seeds real rules or liabilities. A month is Vietnam civil time. Orders count when completed **and** fully collected, using the later of actual completion and the first payment that reached the invoice total. Historical orders without a reliable completion date are excluded. Refunds, order/source or rule changes stale outstanding reviews. Monthly approval/payment waits for month close.

Personal rewards require a deliberate amount/reason. Both reward types have review, approval, void and paid records. Creation supports durable retry IDs; payment records one full actual external payment, never transfers funds. Paid records remain unchanged; later source changes require human reconciliation.

## B2C source and privacy

Reuse each approved partner's explicitly published personal page slug; no new public partner directory or automatic launch. A buyer chooses a named partner and explicitly consents per order. Session storage contains only the partner's already-public contact metadata, never buyer details. Real order + CRM intake + durable checkout receipt are atomic. A retry recovers the receipt before stock/pricing checks. Pending source is reviewed by a manager; only the structurally submitted orders attach on acceptance. A repeat buyer must consent again; an ordinary direct order is not silently assigned to that partner. Different partner ownership is a manager conflict.

Offline/manual retail linkage requires an accepted retail referral, matching authorized contact, an order created since the referral and a reason of at least ten characters. It never auto-claims historical orders. Own projections omit older CRM quotations/samples, other partners, full delivery addresses, tax details, internal buyer notes and internal margin/cost rows. Shared cost statements still require deliberate manager publication.

A page reload does not persist buyer form data or in-memory checkout request identifiers. After an uncertain checkout and reload, contact the House before submitting again. Existing open tabs should refresh after release.

## Private price proposals

See `partner-quote-proposals.md`. Hoàng Long releases finite base prices for a specific accepted customer and partner. Partner proposes selling prices; post-discount prices must remain above the approved floor. Manager review creates the existing `trade_quotes` entity and existing conversion/source tracking. The buyer print contains selling prices only. Approved commercial versions stay immutable; superseding does not rewrite a converted order.

Each order uses either percentage commission or price difference, never both. Difference requires completed recorded fulfilment and a matching quote/product/unit/price. Quantity reductions scale both the approved goods value and the base; the eligible collected revenue is capped at approved goods value so an overpayment is not treated as commission income. VAT, shipping, refunds and costs still require reconciliation; retained-profit caps still apply. Product/price/unit changes or quantity increases require a new commercial review; V1 does not amend already-converted commercial terms in place. There are no automatic payouts.

## Database and environment

Apply once, in order: 0091 Classic/tiers/rewards, 0092 private quote proposals, 0093 retail intake and receipts, 0094 composed snapshots. No existing agreement, paid record or order is rewritten by these migrations. New functions retain existing manager/own-partner authorization. Checkout receipts and retail order writes are service-role only. No service credentials in client code.

Reuse production Supabase URL/anon key, server-only service role and `PARTNER_NETWORK_ENABLED=true`. Keep `PARTNER_NETWORK_PUBLIC_REGISTRATION` false/unset during private pilot. No new external service or email setup is required. Do not publish an individual's page or send invitations as deployment QA.

## Focused QA

- Manager: approve a synthetic partner in an isolated database; apply Classic; create a disabled tier; examine eligibility; adopt it prospectively; disable new promotions without changing adopted terms.
- Own partner: private invite sign-in, own sharing page, pending lead, accepted order progress, rates, rewards; another account must never see these rows.
- Buyer: choose/refuse introducer, per-order consent, stale/withdrawn page, ordinary direct order, repeat purchase, lost-response retry; existing catalogue prices and 5/20/50/100kg benefits remain unchanged.
- Manager: release quote, propose above/post-discount floor, review, convert using Pipeline, fulfil, collect, confirm costs, approve and record one payout; cancellation/refund/quantity reduction must flag reconciliation.
- Month: confirm completion/payment month boundaries, highest tier only, disabled rules, month-open approval rejection, refund staleness, personal bonus retry, and immutable paid history.
- Documents: select a partner with an active Classic agreement; confirm first-two/third onward wording and saved tier rates. Old drafts retain their explicit policy. Check customer quote PDF has no base price.
- Physical mobile QA around 390px remains a manual check; forms wrap, controls have at least44px targets, no wide table is required.

## Pilot

Start with 5–10 individually invited partners. Agree tenure/revenue thresholds and monthly budgets using real cost data. Confirm each contact and personal page, issue a small approved quote range, perform one real sample/order to settlement, review source conflicts and per-order consent, check returns handling and reconcile the first closed month before widening intake. Do not migrate existing signed agreements without explicit manager adoption. Phase2 may add amendments for converted quotes, installment commission settlements, optional automatic tier suggestions/notifications, bonus profit budgets and better uncertain-checkout recovery after reload.
