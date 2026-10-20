# Retail bundles

`/shop#tea-bundles` is a Vietnamese/English guide to eight bundles assembled from current retail sale units and five planned pack ideas. A link near the shop introduction jumps to the section. Relevant product details, including `/shop/tra-gao-sen-3-lan`, show up to three matching combinations with a link to all sets. Definitions live in `lib/retail-bundles.js`; live catalogue products, variants, packaging, availability, prices and stock remain authoritative. Public bundle IDs are editorial identifiers, not new catalogue SKUs.

## Ready bundles and cart

The ready definitions are `home-and-work`, `weekend`, `first-tea`, `office`, `lotus-and-leaf`, `lotus-and-white`, `special-gift` and `lotus-comparison`.

Ready bundles resolve every component to one exact existing product and sale unit. Missing, ambiguous, unavailable or changed components disable adding the whole bundle. The page does not substitute another tea, variant or pack. Adding a bundle is an all-or-nothing cart operation: if any resulting line exceeds recorded stock or the normal cart limit, no component is added. Existing items are included when checking the resulting quantities.

Displayed totals are calculated from the resolved current retail options. Bundle definitions contain no price override, discount or invented saving. Suggested gifts contain the listed tea packs only; a gift box, wrapping or accessories are not included unless separately confirmed. The existing retail volume policy and server checkout remain responsible for any applicable pricing benefit and the final payable total.

Known stock is counted in sale units; zero disables ordering and a recorded positive balance caps the resulting cart quantity. A null/unknown balance is not a stock count, countdown or reservation: it follows the same existing retail checkout rules, and availability is checked again at checkout. Adding a bundle creates ordinary retail cart lines and does not place an order, reserve stock or change the checkout, payment or fulfilment flows.

## Planned pack interest

The five planned ideas are `find-your-taste`, `lotus-discovery`, `travel`, `cafe-trial` and `familiar-and-new`. Their contents, final packing, pricing and launch availability require confirmation. They have no invented price or cart action. The interest form requires a name, a phone number or email, explicit save/respond consent, and an optional note of at most 300 characters.

`POST /api/retail-bundle-enquiries` accepts only `{requestId,bundleId,name,contact,note,consent:true}`. It rejects unknown IDs, ready bundle IDs and additional fields such as browser prices, components, status or attribution. The server resolves the bundle's approved name and builds the private context; customer notes are clearly identified as customer notes.

The route composes the existing `/api/event-enquiries` handler and `submit_event_enquiry` transaction from migration 0077. The database campaign column remains `event_contact_v1` and internal intent is `quote`, because those are existing schema constraints. The saved note carries `[Retail bundle: …]`, the authoritative bundle name, `retail_bundles_v1` and an explicit future-pack/interest-only/not-an-order statement. This is an interest request; it does not confirm a quote, sale, pack specification or launch date.

The same allowed-origin check runs before reading the body. Existing 8 KiB JSON limits, name/contact validation, server-only credentials, trusted IP hashes, contact/IP throttles, private permanent enquiry record and transactional Pipeline create/link rules are reused. Matching is based on the customer's contact. Ambiguous matches stay unlinked for staff review. No migration, new environment variable, external message, order or payment is created by this feature.

Success returns the existing public `{ok:true,reference,requestId}` receipt only after a confirmed database result: 201 for a new request and 200 for an exact retry. The form retains its UUID after a timeout/error and starts a new request when a field changes. Database conflicts, throttling and backend failures return bounded public error codes; private IDs, contacts and internal errors are not exposed. Names, contacts and notes are sent in the private request body and never added to share links, analytics or persistent cart storage.

Managers use the existing contact inbox/history in `/admin/pipeline` to read interest requests and follow up manually. The existing consent record and privacy boundary apply; the route sends no email, SMS, Telegram or Zalo message.

## Verification

Run `node --test tests/retail-bundle-enquiry-route.test.mjs` alongside the bundle/cart tests and the production build. Intake tests replace only the database client and verify known planned IDs, server metadata, closed fields, consent/contact validation, body limits, origins, trusted throttle headers, retry receipts and safe backend errors. They make no production submission or customer contact. A real authorized interest request can later be checked through its receipt in the staff inbox.

The full guide filters by need, current tea subtotal and occasion. Three ready sets appear initially; the other five can be expanded. Planned sets have a separate collapsed section, no assumed price and no checkout action. Current budget filtering does not pretend that an unpriced planned pack has a known price. No launch date, gift-box stock, automatic repeat purchase or small-pack manufacturing readiness is inferred.

Release checks,20 October2026:55 targeted bundle/intake/cart/catalog/checkout/volume tests passed, including18 new bundle/intake tests. Production build passed. Existing lint command remains unsupported by the installed Next16; no lint success is claimed. Local browser checks covered all eight current totals, occasion/budget filters, five planned ideas, an empty interest-form validation and 390px responsive layout without horizontal overflow. Adding first-tea + weekend produced2 white-tea packs,1 green-tea pack and2 Pu-erh pieces, correctly totalling575,000VND; these local cart lines were removed without placing an order. No real interest registration, customer communication or database mutation was made as a test. The existing durable intake is exercised with a mocked database client in route tests.
