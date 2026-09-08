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


## Checkpoint 3 — direct order API regression coverage

The UI work and subsequent Order Book deletion/type changes were pushed to the original website main branch with owner authorization (through 98d048b). Earlier notes saying unpublished describe earlier checkpoints.

`npm run test:staff-orders` executes the actual PATCH route with a mocked authenticated backend and real domain helpers. Nine tests pass: unauthenticated rejection; preserving lines, units, quantities, amount and customer details on type change; rejecting unsupported types; calculating totals from new line prices; keeping an unquoted total unknown; rejecting duplicate line indices without partial type changes; blocking price edits when receivables exist; failing closed on receivable read errors; and not logging success for a failed update.

Limits: mocked backend tests do not prove live authentication configuration, database transactions under concurrent requests, or production deployment status. Prior 85 library tests remain a separate layer of evidence. Remaining acceptance requirements stay open.


## Checkpoint 4 — order dialog usability

New-order entry now traps Tab within the dialog, handles thrown catalogue reads with a retry control, and explicitly returns focus to the Create order button after close. The development fixture supports in-memory order type/price edits and toggling a receivable. Browser verification: retail→wholesale preserved quantity; editing 2 kg from 500,000 to 450,000 per kg changed the displayed total to 900,000; Tab/Shift+Tab remained in the new-order dialog; closing returned focus to Create order. No live records were changed. Build and all 94 library/API tests passed. Catalogue retry was implemented and build-checked; a live backend failure/recovery test remains unverified. Unsaved-draft persistence and cross-user database races are still open.


## Checkpoint 5 — prevent duplicate creation after failed reload

The new-order form retains a confirmed server order ID and retries only its read when loading fails after creation. Concurrent submits are blocked. A thrown creation request or missing returned retail ID is treated as uncertain and cannot be resubmitted in the same form; staff are told to reconcile in Order Book. Definite backend rejection remains retryable. Six new state-machine tests cover read retry, concurrent submits, ambiguous creation, missing ID, definite rejection and thrown reads. All 100 library/API tests and production build pass. This is form-session protection, not backend idempotency across browser reloads or independent clients. A separate staging dataset is still needed for real persistence/concurrency verification.


## Checkpoint 6 — returned network errors

The installed database client returns some fetch failures as error responses with status 0, rather than throwing. Order submission now treats missing responses, transport errors, HTTP 408 and server/proxy failures as uncertain, preventing another insert in the same form. Only explicit HTTP 4xx rejections other than 408 permit retry. Both retail and wholesale adapters forward response status. Thirteen submission tests and nine actual PATCH-route tests with a mocked backend pass; production build passes. This does not establish backend idempotency or live persistence/concurrency correctness.


## Checkpoint 7 — reverse mistaken payment requests

Order Book now provides a confirmed cancellation action for unpaid open/draft requests. Migration 0056 locks the order and receivable, checks manager authorization and the observed updated_at, rejects any recorded payments, marks the request void and stores the prior record in the order timeline. Reissuing reuses the existing unique receivable row with the current order total; cancelled requests no longer exclude orders from Operations payment-request creation. Customer tracking and price editing already ignore void records. SQL was executed against an isolated PGlite PostgreSQL database: cancel, retry, role rejection, reissue at a revised total, stale cancellation rejection and payment preservation passed. Nine PATCH route tests and production build passed. Real migration application and browser verification remain pending; no real receivable was changed. Run the SQL test with PGLITE_MODULE pointing to an installed @electric-sql/pglite module.
