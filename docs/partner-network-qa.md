# Partner Network — internal QA and pilot

Internal release checklist, 12 October 2026. **Not deployed at this checkpoint; hosted SMTP/email-link delivery is incomplete.** Complete and record the remaining hosted checks before customer invitations. The feature branch includes the released B2C work and migrations 0084–0086.

## Automated and layout checks

- **23 focused Partner Network unit/route tests passed**, including the actual Next matcher regression: buyer/referral routes refresh sessions while retail/catalog routes keep their original middleware scope.
- **69 authorization/financial SQL assertions and 26 structural-attribution SQL assertions passed against genuine PostgreSQL 17**, using isolated identities and representative existing schemas. Paid first/repeat position changes require manual entitlement review with unknown recovery; ordinary refund recovery and immutable payout history remain covered.
- **12 genuine concurrency cases passed**, using independent PostgreSQL backend connections and observed lock waits. These cover duplicate applications/intake/attribution, financial reviews, duplicate payouts, payment reversal, manual-versus-automatic linking and ordered multi-order association/refresh batches. See `partner-network-postgres-qa.md`; PGlite serialization is not used as concurrency evidence.
- **28 isolated quote-unit SQL assertions passed for migration 0085**, plus **9 trade-line/selling-unit JS tests** and **27 retail tests**. These cover agreed quantity/price preservation, kg versus pieces/packages, fractional-item rejection, stock-unit mismatches and existing retail behavior.
- **Production build with the feature enabled passed**; the build log is `/private/tmp/hl-partner-final-build.log`. Next's build type-generation/check step runs, but this JavaScript project has no separately configured TypeScript/check-JS script. Record any later all-suite/build result against the final release commit rather than reusing an earlier commit's result.
- `npm run lint` could not run: the existing script invokes `next lint`, which is unavailable in the installed Next version. No ESLint configuration/runtime dependency was added just for this feature.
- Previous desktop and 390px review covered the real landing/registration and login screens plus read-only management cards using simulated records. Recheck the final integrated screens, quote units and account switching. Production migrations 0084–0086 and the hosted Auth site URL/five exact redirects have been verified, but actual partner email delivery, callback/application completion and authenticated browser mutation flows have not yet been confirmed; SMTP verification remains a release dependency.
- The production-mode read-only fixture must remain 404. Turning the module off must return 404 for the partner network/callback while preserving the original wholesale portal.

Reproduce code checks:

```sh
npm run test:partners
node --test lib/trade-line-units.test.mjs lib/selling-units.test.mjs
npm run test:retail
PARTNER_NETWORK_ENABLED=true npm run build
```

Optional isolated SQL checks (module is outside the repository):

```sh
npm install --prefix /private/tmp/hl-partner-db --no-save @electric-sql/pglite
PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js npm run test:partners:db
PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js node tests/partner-quote-units-db.mjs
PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js node --test lib/*.test.mjs tests/*.test.mjs
```

For real PostgreSQL authorization/event/concurrency checks, follow the external-runtime setup in `partner-network-postgres-qa.md` and run `tests/partner-network-postgres.mjs`. Neither harness accepts production credentials or sends messages.

## Internal QA before release

Use an isolated Supabase project/copy, two controlled test email addresses, one manager and one admin. Apply only missing migrations in order: 0084 → 0085 → 0086. Record result, test identity, environment and time for each check. Do not use real customer contacts for mutation tests.

1. Module off: `/partners` remains the original buyer portal. Network/admin programme route and callback are closed; no new sidebar entry or partner-table query is triggered.
2. Module on/public registration off: ordinary visitors retain the buyer portal, new Auth-account creation/intake stay closed, verified managers can review and account switches drop internal registration permission. Existing partner profiles stay available. Both flags on in isolation: landing at 390px/desktop, keyboard navigation, error labels and explicit consent. Existing signed-in wholesale buyer and `/partners/account` retain their prices/orders. The wholesale-page CTA opens buyer login rather than referral registration. Test expired buyer cookies, a NEW buyer without an account row and an old `/partners?code=…` link.
3. Complete authenticated SMTP configuration and redirect allowlisting, then verify actual email receipt and callback completion on the test device. Continue the registration draft in a new tab and submit. A different verified account cannot see that draft; expiry/success/signout/account changes clear old identity state. Confirm email verification alone does not approve an application. Expired/wrong-browser links explain how to retry; external redirect inputs cannot leave approved destinations. Record failures honestly rather than treating a queued email request as delivery.
4. Pending/rejected/disabled partners cannot submit leads. Approval creates a code once; disabling and reapproval preserve it. Test contact edits, first/repeat terms and blank rates without creating default commission assumptions.
5. Partner A cannot read partner B's leads, commissions or membership through the view or direct table/API requests. Neither can read costs, CRM private notes or manager duplicate candidates. Staff without manager/admin permission cannot approve, attribute, reconcile or record payouts.
6. Submit an authorized lead, retry the same request, and confirm only one intake. Changed payload on an existing request is rejected. Unknown monthly volume remains unknown. Check the daily limit.
7. Submit the same phone in `0` and `+84` formats, duplicate email, existing buyer and matching business/location. Resolve with an explicit reason and existing Pipeline ID where appropriate. Do not create another disconnected customer record. Rejected duplicates remain documented.
8. Review the recorded 12 real PostgreSQL concurrency results for the final migration hashes. Spot-check simultaneous manager accept/payout attempts in the hosted test project; confirm useful conflict handling and exactly one attribution/payout.
9. Follow sample → quotation → order in the existing screens. Test kg, viên, bánh, packages and mixed lines: price/quantity must share the agreed unit, unknown prices cannot become zero, item quantities must be whole, and changing units requires price review. New conversions retain line units/prices and separate mass/item totals; stock-unit mismatch blocks conversion instead of guessing a package weight. Existing orders remain unchanged.
10. Check immediate referral attribution after order creation, quote conversion or account association without first opening the partner desk. Original manual links must survive later automatic events. Historical orders must not auto-link; manual history needs a reason. Delete an unreconciled mistaken order and verify attribution audit retention; financial-reviewed orders retain their history. Existing catalog, checkout, sample, order/SMS and stock workflows must remain functional.
11. Record cash in the existing receivable workflow. Reconcile VAT, billed shipping, refunds, costs and target profit without duplication. No cash/void/cancelled order must not earn commission. Unknown costs cannot be approved. Test mixed/discounted orders, first/repeat limits, distributor agreements, adjustments, profit cap and reasoned admin-only exceptions.
12. Change cash/refund/cancellation after approval: payout must be stale-blocked until review. Partial customer collection cannot close the one-time settlement. After full collection, record exactly the approved/current amount with date/reference; double/partial/excess payments must fail. Clicking records an external payment and does not transfer money.
13. Review a paid-order refund and a late collection on an older order. Paid history/reference/rate remain immutable. Same-position refunds show recovery; changed first/repeat position prominently requires manual entitlement review and shows recovery as unknown, not a verified zero. Do not erase history or promise automatic recovery.
14. Use long IDs/names at 390px, several records, filters, referral deep links and pagination. Switch accounts while a request is pending; old profile/lead/draft data must clear. Simulate a failed load: show unavailable data rather than reassuring zeros/success.

## Phase 2 pilot for 5–10 real partners

Do these steps only after internal review and explicit release approval.

1. Choose 5–10 known contacts with real beverage-sector relationships. Include a few introducers and assisted-sale partners; distinguish distributors who purchase/resell. Assign one internal owner for approvals, customer duplicate disputes and weekly reconciliation.
2. Lock real cost inputs for the three proposed tea groups before promising rates. Document factory/management/sample/risk allocations once. Agree per-partner role, eligible products, first/repeat terms, end limits, profit budget and the treatment of discounts; do not publish the illustrative 1%/3%/5% values as universal rates.
3. Agree lead ownership/existing-customer rules and contact-sharing permission. Define how unavailable contacts, ambiguous duplicates, cancellations, returns and manual historical exceptions are handled. Confirm payment reference/date and recovery process.
4. Close the SMTP/email delivery blocker. Verify receipt, same-device login callbacks, application completion, staff permissions and partner isolation in staging. Keep the public-registration flag off until migrations 0084–0086, their rollback/disable plan and the final commit are reviewed. Confirm the release record before invitations; check existing buyer, B2C catalog/cart, sample, quotation, stock, order and SMS routes after release.
5. Invite only the selected partners, explain application vs approval and show a short demo. Review each application; activate explicitly. The app does not send invitations or announce the programme automatically.
6. Pilot with a small number of authorized leads per partner. Resolve every duplicate and record the reason. Follow the normal sales workflow; do not change tea prices automatically to pay commission.
7. Reconcile weekly using actual payments and reviewed costs. Settle only when the customer has paid the order fully; record proof/reference. Track refunds and exceptions separately and keep partner visibility limited to their own figures.
8. Measure accepted/duplicate leads, sample-to-order conversion, time to first paid order, collected eligible revenue, retained profit after commission, repeat purchases, acquisition/sample cost, owner workload and unresolved disputes. Enter measured numbers; do not invent targets from sample data.
9. Review after the first 4 weeks or sufficient paid orders. Keep, adjust or stop terms by partner/product group based on profitability and workload. Disable access without erasing history if needed.
10. Expand only after repeat results and reconciliation are reliable. Prioritize SKU economics/versioned costs, quotation discount guardrails, attribution windows, partial payout/recovery ledger and server pagination as needed. Real PostgreSQL concurrency is already verified for the current V1 flows. No automated payout is a pilot requirement.

## Final release checkpoint, 12 October 2026

- Complete Node suite: 377 passed, 0 failed/skipped, log `/private/tmp/hl-partner-final-node-tests-2026-10-12.log` (before the three final public-intake gate checks). Final focused suite: 23 passed.
- Production database: 0084–0086 applied atomically; postflight confirms six RLS tables, three private attribution triggers, hardened quote-unit conversion, no anonymous table/intake grants and no authenticated internal-finance grant. Zero partner rows after application; no fabricated production orders or customer messages.
- Public registration will remain false for the internal rollout. SMTP delivery and hosted authenticated registration are pending Wix domain verification and the dedicated email credential; a local/isolated check is not described as a delivered email.
- Final production build with module enabled and public registration disabled passed (`/private/tmp/hl-partner-internal-release-build.log`), including the final intake gates and dashboard pending-note change.
