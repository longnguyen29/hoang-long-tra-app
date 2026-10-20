# Retail bundles

`/shop#tea-bundles` is a Vietnamese/English guide with three main sets, a specialist set, a separate replenishment group and four planned small-pack ideas. A link near the shop introduction jumps to the section. Product details show up to three matching combinations with a link to all sets. Definitions and placements live in `lib/retail-bundles.js`; live catalogue products, variants, packaging, availability, prices and stock remain authoritative. Public bundle IDs are editorial identifiers, not new catalogue SKUs.

## Ready bundles and cart

The ready definitions are `home-and-work`, `weekend`, `first-tea`, `office`, `lotus-and-leaf`, `lotus-and-white`, `special-gift` and `lotus-comparison`.

- Featured: `first-tea` (Lục & Bạch), `weekend` (Một buổi thong thả, now one Pu-erh piece), and `lotus-and-white` (Sen & Bạch).
- `special-gift` is an `upgradeFor` choice inside Sen & Bạch. The displayed prices, stock and submitted bundle ID always belong to the selected exact choice. A budget filter can match either choice; product-detail choices must contain the product being viewed.
- Specialist: `lotus-comparison`. It compares two products without attributing every difference solely to scenting rounds when base tea and lots have not been controlled.
- Replenishment: `home-and-work` and `office`. Home/work compares two exact 500g packs against the independently resolved exact 1kg pack; it does not claim a saving. The office set is positioned for a group already needing Magnolia.
- Related: `lotus-and-leaf` appears only in matching product details, rather than as another prominent lotus set on the main guide.

Existing cart quantities and past orders are not rewritten when a composition or its presentation changes. All choices remain ordinary item lines, not a second order model.

Ready bundles resolve every component to one exact existing product and sale unit. Missing, ambiguous, unavailable or changed components disable adding the whole bundle. The page does not substitute another tea, variant or pack. Adding a bundle is an all-or-nothing cart operation: if any resulting line exceeds recorded stock or the normal cart limit, no component is added. Existing items are included when checking the resulting quantities.

Displayed totals are calculated from the resolved current retail options. Bundle definitions contain no price override, discount or invented saving. Suggested gifts contain the listed tea packs only; a gift box, wrapping or accessories are not included unless separately confirmed. The existing retail volume policy and server checkout remain responsible for any applicable pricing benefit and the final payable total.

Known stock is counted in sale units; zero disables ordering and a recorded positive balance caps the resulting cart quantity. A null/unknown balance is not a stock count, countdown or reservation: it follows the same existing retail checkout rules, and availability is checked again at checkout. Adding a bundle creates ordinary retail cart lines and does not place an order, reserve stock or change the checkout, payment or fulfilment flows.

## Planned pack interest

Four active ideas have `placement: planned`: `find-your-taste` (Mộc/Mật/Ngọc Lan, 20g each), `lotus-discovery` (Sen 3 Lần 10g + Bạch 20g), `honey-and-smoke` (Mật/Khói, 30g each), and `personal-office` (Mộc/Mật/Ngọc Lan, 50g each). These are proposed loose-leaf packs, not single-use teabags or confirmed serving counts. Prices, final packing and launch availability require confirmation. They have no invented price or cart action. The interest form requires a name, a phone number or email, explicit save/respond consent, and an optional note of at most 300 characters.

The three previous plans (`travel`, `cafe-trial`, `familiar-and-new`) retain their definitions with `placement: archived` and are not promoted. Intake still accepts those known IDs from already-open pages. Their existing private records are retained. Café trial enquiries now link separately into the existing wholesale sample flow.

`POST /api/retail-bundle-enquiries` accepts only `{requestId,bundleId,name,contact,note,consent:true}`. It rejects unknown IDs, ready bundle IDs and additional fields such as browser prices, components, status or attribution. The server resolves the bundle's approved name and builds the private context; customer notes are clearly identified as customer notes.

The route composes the existing `/api/event-enquiries` handler and `submit_event_enquiry` transaction from migration 0077. The database campaign column remains `event_contact_v1` and internal intent is `quote`, because those are existing schema constraints. The saved note carries `[Retail bundle: …]`, the authoritative bundle name, `Bản phối: 2026-10-20`, `retail_bundles_v1` and an explicit future-pack/interest-only/not-an-order statement. This is an interest request; it does not confirm a quote, sale, pack specification or launch date.

The same allowed-origin check runs before reading the body. Existing 8 KiB JSON limits, name/contact validation, server-only credentials, trusted IP hashes, contact/IP throttles, private permanent enquiry record and transactional Pipeline create/link rules are reused. Matching is based on the customer's contact. Ambiguous matches stay unlinked for staff review. No migration, new environment variable, external message, order or payment is created by this feature.

Success returns the existing public `{ok:true,reference,requestId}` receipt only after a confirmed database result: 201 for a new request and 200 for an exact retry. The form retains its UUID after a timeout/error and starts a new request when a field changes. Database conflicts, throttling and backend failures return bounded public error codes; private IDs, contacts and internal errors are not exposed. Names, contacts and notes are sent in the private request body and never added to share links, analytics or persistent cart storage.

Managers use the existing contact inbox/history in `/admin/pipeline` to read interest requests and follow up manually. The existing consent record and privacy boundary apply; the route sends no email, SMS, Telegram or Zalo message.

## Verification

Run `node --test tests/retail-bundle-enquiry-route.test.mjs` alongside the bundle/cart tests and the production build. Intake tests replace only the database client and verify known planned IDs, server metadata, closed fields, consent/contact validation, body limits, origins, trusted throttle headers, retry receipts and safe backend errors. They make no production submission or customer contact. A real authorized interest request can later be checked through its receipt in the staff inbox.

The full guide filters by need, current tea subtotal and occasion. Three ready families appear initially; specialist and replenishment sets have separate collapsible groups that open when filters are applied. The Sen selector remains within one card, including when only the higher-priced choice matches the filter. Planned sets have a separate collapsed section with the first small-pack proposal prominent in its summary, no assumed price and no checkout action. Current budget filtering does not pretend that an unpriced planned pack has a known price. No launch date, gift-box stock, automatic repeat purchase or small-pack manufacturing readiness is inferred.

Before selling a small pack: confirm exact tea IDs/lots, trial the teas, approve materials and packing labor/wastage costs, agree labels and actual net mass, create explicit retail variants/prices/stock, and verify fulfilment. None of these physical decisions is inferred from an interest registration. No database migration or new environment variable is needed for the refinement.

Initial release checks, 20 October 2026 (before this refinement): 55 targeted bundle/intake/cart/catalog/checkout/volume tests and the production build passed. The earlier browser checks covered the then-current eight totals, filters, five planned ideas, form validation and 390px layout. Those checks describe the original compositions; the weekend set then contained two Pu-erh pieces. They do not verify the refined layout or compositions below.

Refinement checks, 20 October 2026: 51 distinct targeted bundle/intake/cart/checkout/volume/product-detail/guidance/characteristic tests and the production build passed. Family-selection tests cover the exact Sen 7 choice under a high-budget filter, matching Sen 7 product-detail suggestions, and retaining an unavailable selected choice without silently substituting another tea. A read-only probe against the current public catalogue verified the current totals and exact Sen choices. No real interest registration, customer communication or database mutation was made as a test; route tests mock the database client.

The browser tool timed out twice during this refinement, so current desktop/390px visual and click-through checks remain manual QA items. Earlier screenshots are not evidence for this version. The existing lint command is unsupported by Next 16; no lint success is claimed. No database migration, dependency or new deployment environment variable is needed.
