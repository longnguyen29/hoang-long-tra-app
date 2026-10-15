# Next partner increment: proposed selling price

Recommendation only. This increment is not part of the retail stock/dashboard release and has not changed any price, commission agreement or payout.

The current partner journey has no blocking implementation gap found in the focused source review. Keep the current release usable while the first verified partners are invited and their personal pages are approved. The next coherent partner increment is a **proposed quotation price**, followed by manager review; it is not unrestricted editing of an existing order.

## Reuse the commercial flow

| Existing entity or interface | Reuse / constraint |
| --- | --- |
| `partner_network_partners` | Approved authenticated introducer; derive identity on the server. |
| `partner_network_referrals` | Only the partner's accepted referral can receive a proposal. Pending duplicate review does not grant existing customer access. |
| `trade_opportunities` | Remains the single customer relationship and follow-up record. |
| `trade_quotes` | Customer-facing product, quantity, selling price, validity and terms; keep the existing draft/sent/accepted/converted workflow. |
| `trade_quotes.partner_account_id` | This is a **wholesale buyer account** in `wholesale_accounts`, not a referring partner. Do not put `partner_network_partners.id` here. |
| `partner_price_agreements` / `partner_price_rules` | Existing versioned buyer-specific prices. They are not automatically a universal introducer price floor; reuse only where the intended buyer and approved commercial terms actually match. |
| `convert_trade_quote_to_order` / `partner_accept_quote` | Preserve existing unit validation, quote-to-order linkage and conversion idempotency. The latter authenticates the buyer account, not the introducer. |
| `partner_network_order_links` | Retain existing structural attribution from the accepted referral and quote. |
| `partner_network_reconcile`, `partner_network_commission_action` | Keep actual-collection review, approval, profit guardrails, reasoned exceptions, audit and one full recorded settlement. |

`TradePipeline.jsx` currently writes staff quotes directly; the partner portal has no quote-write permission. Add narrow authenticated RPCs rather than broadening table RLS or making partners staff.

## Smallest reliable quotation extension

1. A manager releases the base selling terms to a specific accepted referral: products, units, permitted quantities, base price, packaging/delivery basis and expiry. A catalog list price alone is not approval for every quantity or destination.
2. The partner proposes customer quantities and prices at or above those released terms. Show the expected difference as an estimate. Hoàng Long can review below-floor exceptions; a partner cannot approve one.
3. A manager approves and sends the customer quotation through the existing workflow. Changing an approved/sent commercial version creates a new version and retains the old one; converted quotes and paid settlements remain unchanged.
4. Conversion uses the final customer selling price in the existing order. The private base and remuneration agreement stay linked to the quote/order for reconciliation.

Use one small private companion table, for example `partner_network_quote_terms`, keyed to the existing quote and accepted referral. Store the remuneration mode, released base-line snapshot, proposed selling-line snapshot, version/revision, validity, review state, reason and actors/timestamps. It can link a superseding quote to the previous version. There is no second customer or order table.

Do **not** place internal base lines in `trade_quotes.lines`, `terms` or `note`: `partner_portal_snapshot()` already returns customer quotation lines and terms to the buyer. Return an explicit own-partner projection from a scoped RPC; the manager sees the full review. Any downloadable customer quotation must contain customer selling prices only.

The proposal RPC must derive partner/referral ownership, check active approval and expected revision, validate product IDs/units and quantities using existing quote helpers, recalculate all totals server-side and enforce the released price floor **after discounts**. It must reject expired/revoked terms and must not take a client-supplied base price or payout amount as authoritative.

## Price difference and percentage commission are different agreements

The existing commission engine supports `revenue` and `profit` percentage bases. It does not currently implement a contractual price-difference payout. Do not represent the latter with an unexplained manual adjustment or silently add it on top of the existing 3–5% arrangement.

For a price-difference agreement, the commercial idea is:

`Eligible difference = max(0, actual collected goods revenue excluding VAT, shipping and refunds − approved Hoàng Long base for the fulfilled eligible quantity)`

The final implementation must also account for cancellations, returns, quantity changes and any explicit included/excluded charges. Never subtract the same refund twice or mix kg, packs and pieces. Until reconciliation is complete, label the result **estimated**, not earned or paid.

A minimal settlement extension can reuse the present approval/payment workflow, but it still needs an explicit `remuneration_mode` such as `commission` / `price_difference` and immutable agreement/base snapshots on the review and commission record. Extend the financial fingerprint and stale detection to include those terms and order changes. Existing rows default to `commission`; all recorded paid history stays immutable. No new partial/supplemental payout ledger is needed for the first version, provided it continues to record one full settlement only.

This is a contained finance extension rather than a new payout system, but a proposal UI alone must not promise automatic price-difference payment before that extension is implemented.

## Follow-up and reorder: reuse before adding

- Central `trade_opportunities.next_action`, `next_action_at` and `owner` already provide the next action, due date and responsible person. `TradePipeline` and the morning dashboard already surface due work.
- The current partner order view already shows the manager-shared `next_action`, progress and expected commission payment date. It does not yet expose the central due date/owner or let the introducer change them. A later safe shared projection can add those facts without another task database.
- Buyer `PartnerPortal` already copies a previous order into the new-order form using the current approved price rules. Staff Orderbook also supports reorder. The introducer portal is read-only; an introducer reorder action should be a **request** attached to the same accepted referral, not permission to impersonate the buyer or reuse an expired price.

## Focused acceptance checks for the future increment

- Two partners cannot read or edit each other's terms, proposals or customers.
- Pending, rejected or disabled identities cannot create proposals.
- Customer quote/PDF and buyer snapshot never reveal Hoàng Long base prices or internal cost/margin data.
- Quantity, unit, discount, expiry and concurrent revision checks cannot bypass a released floor.
- Manager approval and conversion preserve quote/source ownership and do not create duplicate orders.
- Returns, changed quantities/cash and changed terms invalidate an unapproved calculation; paid history remains unchanged.
- Percentage and price-difference modes are visibly distinct and cannot silently stack.

No deployment or broad test run was performed for this recommendation-only review.
