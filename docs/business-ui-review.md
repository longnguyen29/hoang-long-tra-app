# Business UI improvement review

Branch: codex/business-ui-review. Production is the control. Do not publish or contact customers without owner approval.

## Full acceptance checklist
- [ ] Shared navigation, labeled mobile navigation, active location, keyboard focus and consistent controls across staff pages.
- [ ] Daily workspace prioritizes actionable work; secondary forms reveal on demand; existing data and actions retained.
- [ ] Customer and order details show next action, history, sample/recipe/quote context and payment/delivery state.
- [ ] Factory branch: readable tables, explicit units, practical mobile entry, coherent navigation and save feedback.
- [ ] Public branch: concise mobile opening, authentic imagery, consistent audience paths, opt-in kiosk artwork.
- [ ] Café selector: visual response, compact mobile result, simpler sample handoff and useful save/share result.
- [ ] Consistent loading/error/empty/save feedback; failed reads never imply zero business activity.
- [ ] Desktop, mobile, keyboard and relevant regression checks; no customer writes during verification.
- [ ] Review artifacts, changed-file summary and publication approval.

## Evidence and constraints
- Website has working customer journey and daily work queues. Extend them; do not create duplicate CRM records.
- Separate CRM repository contains README/SPEC only.
- Factory data integration is not verified. A navigation link must not imply synced inventory.
- No invented café testimonials, margins, recipe validation or guaranteed conversion lift.
- Original repositories and working production routes remain untouched until approved publication.

## Checkpoint 1 — implemented, not published
- Shared admin layout with labeled desktop/mobile navigation, active route, skip link, focus styling and logout.
- Replaced the two duplicate navigation rails; retained route-level authorization.
- Staff order queue appears before totals; customer next actions appear before counts.
- Daily priorities edit only on request. Failed/partial daily reads have a retry state and do not show zero totals as confirmed facts.
- Kiosk artwork now requires explicit device opt-in.
- Development-only `/ui-review` uses in-memory illustrative data. Production returns notFound; no auth bypass was added.
- Website production build passes. Eight customer-journey/order-flow regression tests pass.
- Browser: desktop/mobile shared navigation, opening priority editor and simulated failed read verified using fixtures.
- Factory clone at ../hoang-long-factory-ui: readable tables, one content column, labeled navigation state, mobile controls and link to sales desk.
- Factory reads now validate the complete snapshot before seed initialization; failed/malformed reads show a retry screen. Three read-validation tests and factory production build pass.

Still required: review all other staff pages inside the shell, remaining form/save/error feedback, factory browser checks, customer/order detail refinement, public/café visual and handoff improvements, comprehensive acceptance review and publication approval. Checklist remains open until those requirements have direct evidence.
