# Retail benefits and Dashboard quick entry

## Buyer flow

`/shop` and each `/shop/[id]` use the same published catalogue, package prices, real stock and shared cart. A product marked `limited` displays a limited-release label. Recorded stock of 1–5 sale units displays a low-stock badge for the selected format. Unknown stock never becomes an invented countdown. Staff can change the limited flag, stock and tea-specific brewing copy in `/admin/house`.

Tea details contain three expandable assurances based on the existing policies: transparent price/delivery confirmation; support for wrong, missing or faulty goods; direct contact with Hoàng Long. No certification or unconditional refund promise was added. Recorded brewing guidance is preserved alongside optional suitable methods: short10–30second tasting infusions, around8minutes for a hot beverage base, and16–24hours for refrigerator brewing with drinking water and clean covered equipment. Refrigerator brewing is distinct from leaving tea at room temperature; see [Iowa State Extension](https://blogs.extension.iastate.edu/answerline/2018/06/25/celebrating-iced-tea/).

## Trial retail volume policy

| Confirmed tea mass | Benefit |
|---|---|
| At least5kg | Free standard delivery within Vietnam; address/service confirmed before dispatch |
| At least20kg | 3% discount on eligible tea |
| At least50kg | 5% discount on eligible tea |
| At least100kg | 7% discount on eligible tea |

Only the highest discount tier applies; it may combine with the5kg delivery benefit. Goods, samples and tea packs without an unambiguous net mass do not count towards weight or discounted merchandise. International delivery is quoted separately. Existing B2B quotes and already confirmed orders keep their terms. No estimated freight amount is invented below the free-delivery threshold.

Mass comes from actual kg sale units or explicit pack labels such as500g,1cake(357g),1piece(8g) or20×8g. A label such as20pieces or100g/500g stays unknown. Policy constants/version live in `lib/retail-volume-policy.js`; changing the trial policy currently requires a reviewed code/database change. Cart limits rise to1000 sale units so a100kg loose-tea order can reach the final tier, while real stock still limits purchases.

Checkout recalculates benefits server-side. New service-only `submit_retail_volume_order` rechecks locked catalogue identity, sale units, prices and stock, stores net unit prices and an initial `orders.retail_pricing` snapshot, then reuses the established retail-order transaction. Snapshot includes initial mass, gross subtotal, eligible tea subtotal, discount, payable and delivery eligibility. It is an initial checkout record; manual order edits still require staff to confirm the changed terms. Snapshot does not add a freight charge or imply payment.

Legacy TeaConsole and staff/manual retail-order RPC remain unchanged, including promo-code and negotiated-price behavior; the new policy applies to the current `/shop` checkout. No secrets reach browser code, no new environment variable, dependency or billing service. Existing server Supabase credentials are required.

## Dashboard

Tapping an empty priority slot, its title or edit button opens an immediate native dialog with focused text entry. It supports Escape/cancel, focus restoration, body-scroll lock and the visible mobile keyboard viewport. Priority text limit is1000characters. Calendar task title limit is500characters and notes6000; Knowledge Centre task creation uses the same limits without silent truncation. Existing ownership, three daily slots and unfinished-task carryover remain.

## Database and verification

Apply0089 then0090 once after0088. No historic order or task is rewritten by migration.0090 adds only the optional initial pricing snapshot and private checkout helpers/transaction.

Validation:35 retail JavaScript tests,10 calendar tests,22 isolated Dashboard PostgreSQL assertions and49 isolated retail PostgreSQL assertions passed. Production build passed; the legacy standalone lint command remains unsupported (`next lint` removed). Live visual checks and a physical phone keyboard check are distinct from these automated results.

Manual QA: open a marked tea, change formats and inspect stock; expand all three assurances; switch brewing methods and language; add known-weight tea around5/20/50/100kg and inspect highest-only discounts; verify goods/unknown piece labels do not earn benefits; cancel the cart without placing a test order. On Dashboard open/type/cancel a priority from a scrolled phone page, then save/reopen an actual intended task. Do not create synthetic customer orders or send notifications for production QA.

## Next partner work

No blocking gap was found in the existing personal-page→referral→order journey. The next feature is a scoped partner quotation proposal with manager-approved price floor and explicit markup remuneration. See `partner-quote-next-step.md`; no editable global product price or implicit stacked commission was introduced here.
