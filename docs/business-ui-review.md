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


## Checkpoint 2 — 7 September 2026, local design review

Implemented across the isolated website and factory branches:
- Public home: café-first message, authentic archive photograph, retail route retained, catalogue retry state and campaign attribution preserved.
- Café page: four labeled AI drink concepts, live catalogue tea-only cost, shareable choice, print notes, direct handoff to sample pack selection without repeating the drink question. Free pack remains the default; qualification remains required.
- Staff: compact shared navigation, actionable queues, compact local toolbars, customer next-action context, order amount/due summary, keyboard focus handling for order and opportunity drawers. Missing costs no longer imply a confirmed 100% margin.
- Failed full loads in orders, pipeline, operations, work, house, recipes, control and growth now show a retry state rather than confirmed zero activity.
- Factory: serialized saves per collection, retained failed values and retry, visible unsaved state, guarded purchase entry, success feedback that respects pending saves.

Verification: 71 website tests and 6 factory tests pass; both production builds pass; diff whitespace checks pass. Local production builds return 404 for both development review routes and send protected routes to login. Browser checks cover home and café mobile visuals, selected drink sharing, direct sample handoff with free-pack qualification retained, order failure view, factory failed save and successful retry. Home, café and factory dashboard have no root horizontal overflow at measured CSS widths 320/375/414/768. Staff screen-switch smoke checks were also run, but are not a full settled-state visual audit of every form.

Release checks still open: authenticated staff role workflows and real backend write/read persistence in a separate test dataset; all nested forms/dialogs at mobile widths; print-dialog rendering; full public route navigation/locale regression; factory multi-collection operations under partial failure and multi-user edits. The per-key queue is not a database transaction or cross-user conflict-resolution system. Factory development review shows a React debugging warning about eval under the current CSP; production security policy was preserved.

This checkpoint is ready for design review, not a claim that every acceptance box is complete. No publication or customer contact occurred.
