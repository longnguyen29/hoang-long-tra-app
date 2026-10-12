# B2C catalogue upgrade

## Scope

The retail catalogue is the current priority. Partner Network Phase 1 remains on
its own feature branch for later internal review; this change does not enable or
publish the partner programme.

This is an extension of the existing `/shop` and `/goods` shopping experience.
It reuses the public catalogue, product variants, Vietnamese/English content,
existing Supabase order flow and Hoàng Long styling. There is no second product
database, new checkout provider or database migration.

## Screens

- `/shop`: tea catalogue with search, simple product groups, product details and
  the existing cart/checkout.
- `/shop/[id]`: shareable product page showing recorded tasting notes, brewing
  instructions, packaging and the currently available retail options. Missing
  product facts are left absent rather than generated.
- `/goods`: existing goods catalogue and checkout, sharing cart state with the
  shop and product pages.
- Business purchases continue through the existing B2B catalogue and sample/quote
  request flow; retail prices are not presented as a wholesale quotation.

The cart follows the shopper between these pages and survives a refresh. Only
product-option identities and integer quantities are stored locally: no prices,
customer names, phone numbers, addresses or payment information. Local storage
may be unavailable or damaged; the page must still work with an in-memory cart.

The existing dashboard's pending-feature section also keeps a reminder to return
to Partner Network after the B2C catalogue. It is seeded per staff member without
overwriting an existing note or completion. A separate Codex reminder can bring
the review back later; it does not enable the programme or launch it publicly.

## Product and quantity rules

- Catalogue products/variants remain the source of truth for prices and stock.
- A known nonpositive stock count or missing/nonpositive retail price prevents
  adding that option to checkout. Unpriced options offer contact instead.
- Unknown stock remains unknown. It is not displayed as a fabricated zero.
- A selected fixed-weight variant is a saleable package. `500g`/`1kg` variants
  count packages; `1 viên` and `1 bánh` retain their specific units. A package
  of 20 pieces is one package. No package-to-kg conversion is invented.
- A product listing several weights without variant rows does not establish a
  price for every package. If its existing sale unit is kg, show price/kg and
  order whole kg, with recorded packaging details separately. Only actual
  variant rows create selectable package prices; never derive them from price/kg.
- Cart quantities are whole numbers from 1 to 99. Current catalogue reconciliation
  removes unavailable/deleted/unpriced options and reduces quantities exceeding
  known available stock.
- Vietnamese search ignores diacritics and can find both language versions of
  recorded names, notes, flavours and brewing guidance.

## Order submission and remaining risk

The new public checkout route reads the catalogue again on the server and builds
the submitted product lines and amounts from those current records, rather than
trusting prices from the browser. It preserves the established retail order and
notification workflow.

Each selected line also carries the price, sale unit, variant weight and packing
snapshot the shopper reviewed. The server compares every snapshot to the current
catalogue before submitting the order. An unchanged total cannot conceal a
different package/unit or price changes that offset each other across two lines.
Any material difference returns a review-required conflict; client names and
arbitrary order-line values are never trusted as the new order's source.

The older `submit_retail_order` database RPC is still executable by `anon` and
`authenticated`, and accepts client-supplied price/total snapshots. It also has
legacy handling for custom/unlinked lines and is used by the staff order form.
Direct-RPC hardening therefore remains a separate task: a new browser/server
route does not by itself revoke or secure that older entry point. Review its
staff/custom-line/promotion compatibility before changing grants or rewriting
the function. The current order total remains an estimate pending confirmation.

There is no payment processing, delivery-rate calculation or reservation system
added here. Existing order RPC stock checks remain the final transactional stock
guard. Real concurrent purchases should be checked before a larger retail pilot.

## Focused verification

Run `node --test lib/retail-catalog.test.mjs lib/retail-cart.test.mjs` for
package units, price/stock eligibility, multilingual search, safe product URLs,
malformed local storage, quantity bounds and saved-cart reconciliation. The
existing selling-unit tests remain relevant regression coverage. Build and
desktop/mobile checks are performed by the main implementation task and their
actual outcomes should be reported there.

`node --test lib/retail-checkout.test.mjs tests/retail-order-route.test.mjs`
checks consent, fulfilment fields, strict bounded order quantities, current
catalogue prices/units, changed-price review, sample exclusion, safe stock-race
responses, per-line packing/unit/price snapshots and sanitized backend errors.
The route tests replace catalogue and
database access; no real order is created.

No test should place a live order, send a real SMS or clear production stock.

## Internal manual QA

1. At 390px, open `/shop`, search with and without Vietnamese accents, select a
   product group and open a product page. Check text wrapping and tap targets.
2. Add a recorded priced variant, change quantities, return to the catalogue,
   refresh and verify the same cart. Switch language without losing selections.
3. Check Phổ Nhĩ viên/bánh and a fixed-weight tea package: the displayed unit,
   cart quantity and submitted unit must agree.
4. Check a sold-out variant and an option without a price: neither can become a
   zero-value order. Contact links should retain the correct product context.
5. Verify an invalid/deleted detail ID has a clear unavailable/not-found state,
   and empty search can be reset.
6. On isolated data, change price or stock after adding to cart, then submit.
   Confirm the checkout refreshes/reconciles the selection rather than silently
   charging an old amount or duplicating an order.
7. On isolated data only, submit one retail order and check its existing Order
   book record, sale units and internal notification. Do not submit again after
   an ambiguous timeout without first confirming whether an order was created.
8. Close and reopen the cart with keyboard and touch; verify focus, labels,
   consent, validation and clear failure messaging.

## Deferred

SKU-specific SEO editing, reviews not already recorded, recommendations based on
actual customer behaviour, a full payment integration and the separate Partner
Network launch are outside this update. B2B catalogue/sample/quote/order flows
continue to use their existing records and routes.

## Verification result — 12 October 2026

- 27 focused cart/catalogue/checkout/API tests passed, plus 5 existing selling-unit regression tests.
- Production build passed, including Next type generation/checking. The existing standalone lint command uses removed `next lint`; no lint setup or dependencies were added here.
- Desktop and 390px browser checks passed: accented/unaccented search, product navigation, package selection, shared cart, reload persistence, correct viên/gói units and English controls. No horizontal overflow at390px. An invalid product returns404.
- Test cart was cleared; no real order, customer contact or notification was submitted. Full real-order delivery remains a manual check using isolated test data.
