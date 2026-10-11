# Partner Network — internal QA and pilot

Internal release checklist, 12 October 2026. Review before any public deployment or customer invitation.

## Automated and layout checks

- 344 existing/new unit and route tests passed, including 18 focused Partner Network checks. The old payment-reversal SQL test initially lacked its optional PGlite dependency; rerunning with the existing isolated PGlite installation resolved that setup issue and the complete suite passed.
- New SQL migration and assertions execute in a disposable PostgreSQL-compatible PGlite database with fabricated auth identities, staff roles and representative existing schemas. 66 SQL assertions passed; the result log is recorded in the handoff. No live Supabase database writes were made.
- Production build is run with the feature enabled so all new code compiles. Next's build type-generation/check step runs, but this JavaScript project has no separately configured TypeScript/check-JS script.
- `npm run lint` could not run: the existing script invokes `next lint`, which is unavailable in the installed Next version. No ESLint configuration/runtime dependency was added just for this feature.
- Desktop and 390px checks cover the real landing/registration and login screens plus read-only management cards using the actual components and simulated records. Verify no horizontal overflow, labelled inputs, expandable sections and disabled save actions in the fixture.
- The production-mode read-only fixture must remain 404. Turning the feature off must return 404 for the partner network/callback while preserving the original wholesale portal.

Reproduce code checks:

```sh
npm run test:partners
PARTNER_NETWORK_ENABLED=true npm run build
```

Optional isolated SQL checks (module is outside the repository):

```sh
npm install --prefix /private/tmp/hl-partner-db --no-save @electric-sql/pglite
PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js npm run test:partners:db
PGLITE_MODULE=/private/tmp/hl-partner-db/node_modules/@electric-sql/pglite/dist/index.js node --test lib/*.test.mjs tests/*.test.mjs
```

## Internal QA before release

Use an isolated Supabase project/copy, two partner emails, one manager and one admin. Record the results; do not use real customer contacts or send invitations for this test.

1. Feature off: `/partners` remains the original buyer portal. Network/admin programme route and callback are closed; no new sidebar entry or partner-table query is triggered.
2. Feature on: public landing at 390px/desktop, keyboard navigation, error labels and explicit consent. Existing signed-in wholesale buyer and `/partners/account` still show their normal prices/orders. Test a NEW buyer with no wholesale-account row, whose email link must return to buyer registration, and an old `/partners?code=…` link sent before this release.
3. Request an email link on the test device, open it there, continue the draft (including a new-tab callback) and submit. A different verified account must not see that draft; expiry/success/signout clears it. Confirm that email verification alone does not approve an application. Expired/wrong-browser links explain how to retry; external redirect inputs cannot leave the approved partner destinations.
4. Pending/rejected/disabled partners cannot submit leads. Approval creates a code once; disabling and reapproval preserve it. Test contact edits, first/repeat terms and blank rates without creating default commission assumptions.
5. Partner A cannot read partner B's leads, commissions or membership through the view or direct table/API requests. Neither can read costs, CRM private notes or manager duplicate candidates. Staff without manager/admin permission cannot approve, attribute, reconcile or record payouts.
6. Submit an authorized lead, retry the same request, and confirm only one intake. Changed payload on an existing request is rejected. Unknown monthly volume remains unknown. Check the daily limit.
7. Submit the same phone in `0` and `+84` formats, duplicate email, existing buyer and matching business/location. Resolve with an explicit reason and existing Pipeline ID where appropriate. Do not create another disconnected customer record. Rejected duplicates remain documented.
8. Run two simultaneous manager accept operations from separate sessions in real PostgreSQL. Confirm a single accepted attribution/opportunity and useful conflict handling. PGlite's serialized test execution is not evidence of real multi-session race behaviour.
9. From the accepted referral, use the existing sample → quotation → order flow. Open the same customer and order in their existing screens; check the referral badge/link. Existing SMS/order notifications and tea units remain unchanged. Historical orders must not auto-link; explicit historical links require a reason. Delete an unreconciled mistaken order and verify the attribution audit remains; reviewed financial orders retain their history.
10. Record cash using the existing receivable workflow. Reconcile VAT, billed shipping, refunds and actual internally borne costs without duplication. Partial cash must use the conservative basis; no cash/void/cancelled order must not earn commission. Unknown costs cannot be approved.
11. Test a mixed-product/discounted order with a real cost sheet. Review first/repeat eligibility, repeat expiry, distributor exceptions, positive/negative adjustments and profit cap. A manager cannot override the cap; admin exception needs a meaningful reason and audit. Policy-position changes require reconciliation; unchanged rate snapshots remain stable.
12. Change cash/refund/cancellation after approval. Payment must be stale-blocked until reviewed again. A partial customer payment cannot close the one-time commission settlement. After full customer collection, record exactly the approved/current commission with transfer date/reference; double/partial/excess payment attempts must fail. No money is transferred by clicking.
13. Review a refund after commission was paid. Paid history and reference must remain unchanged, with an overpayment flag for recovery/offset follow-up. Do not erase the payout to hide a discrepancy.
14. Use long real-format IDs/names at 390px, several records, tab filters, referral deep links and pagination. Sign out/switch users and confirm old data is cleared. Simulate a failed load; the app must show unavailable data rather than reassuring zeros/success.

## Phase 2 pilot for 5–10 real partners

Do these steps only after internal review and explicit release approval.

1. Choose 5–10 known contacts with real beverage-sector relationships. Include a few introducers and assisted-sale partners; distinguish distributors who purchase/resell. Assign one internal owner for approvals, customer duplicate disputes and weekly reconciliation.
2. Lock real cost inputs for the three proposed tea groups before promising rates. Document factory/management/sample/risk allocations once. Agree per-partner role, eligible products, first/repeat terms, end limits, profit budget and the treatment of discounts; do not publish the illustrative 1%/3%/5% values as universal rates.
3. Agree lead ownership/existing-customer rules and contact-sharing permission. Define how unavailable contacts, ambiguous duplicates, cancellations, returns and manual historical exceptions are handled. Confirm payment reference/date and recovery process.
4. Validate email delivery, login callbacks, staff permissions and tenant isolation in staging. Keep the production flag off until the reviewed migration/rollback plan and app commit are approved. Check existing buyer, catalog, sample, quotation, checkout and SMS routes after release.
5. Invite only the selected partners, explain application vs approval and show a short demo. Review each application; activate explicitly. The app does not send invitations or announce the programme automatically.
6. Pilot with a small number of authorized leads per partner. Resolve every duplicate and record the reason. Follow the normal sales workflow; do not change tea prices automatically to pay commission.
7. Reconcile weekly using actual payments and reviewed costs. Settle only when the customer has paid the order fully; record proof/reference. Track refunds and exceptions separately and keep partner visibility limited to their own figures.
8. Measure accepted/duplicate leads, sample-to-order conversion, time to first paid order, collected eligible revenue, retained profit after commission, repeat purchases, acquisition/sample cost, owner workload and unresolved disputes. Enter measured numbers; do not invent targets from sample data.
9. Review after the first 4 weeks or sufficient paid orders. Keep, adjust or stop terms by partner/product group based on profitability and workload. Disable access without erasing history if needed.
10. Expand only after repeat results and reconciliation are reliable. Prioritize SKU economics/versioned costs, quotation discount guardrails, attribution windows, partial payout/recovery ledger and real Postgres concurrency/server pagination as needed. No automated payout is a pilot requirement.
