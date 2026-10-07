# Business metrics

Entry point: **Báo cáo & thiết lập → Chỉ số kinh doanh** (`/admin/control?tab=metrics`).

Monthly management figures combine explicitly entered inputs with calculated
results. They do not replace bookkeeping, tax reporting or bank reconciliation.
Money is entered in VND for the selected calendar month. A blank input means
unknown; enter `0` only when the amount is known to be zero. A result remains
unavailable until every input needed by its formula is provided.

## Inputs and calculations

| Input | Meaning |
| --- | --- |
| Net revenue | Sales recognized for this month after returns and discounts, excluding VAT collected for the government. It is not the same as money received. |
| Cost of goods sold | Cost of tea and other direct costs attributable to goods sold this month. Exclude depreciation/amortization entered separately below. Unsold inventory purchases are not automatically cost of goods sold. |
| Operating expenses | Period operating expenses such as administration, sales, rent and salaries, excluding costs already in cost of goods sold, depreciation/amortization, interest and income tax. |
| Other income | Other income recognized in the period (including any interest income classified here). Enter zero if none. This adjustment is included in the management EBITDA measure shown here. |
| Other expenses | Other expenses recognized in the period, excluding interest, income tax and depreciation/amortization. Enter zero if none. This adjustment is included in the management EBITDA measure shown here. |
| Depreciation and amortization | Period depreciation/amortization charged for assets and intangible assets. Do not also include it in cost of goods sold or operating expenses. |
| Interest expense | Financing interest for the month, excluding principal repayments. |
| Income tax | Income tax expense for the period. Do not include VAT or personal withdrawals. |

| Result | Formula |
| --- | --- |
| Gross profit before depreciation/amortization | Net revenue − cost of goods sold |
| Gross margin before depreciation/amortization | Gross profit ÷ net revenue × 100 |
| EBITDA | Gross profit − operating expenses + other income − other expenses |
| EBITDA margin | EBITDA ÷ net revenue × 100 |
| EBIT | EBITDA − depreciation and amortization |
| Profit before tax | EBIT − interest expense |
| Net profit | Profit before tax − income tax |

The formulas reconcile as `EBITDA = net income + interest expense + income tax + depreciation/amortization`. Definition reference: [SEC non-GAAP guidance, question 103.01](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures). Gross profit/margin are explicitly labeled **before depreciation/amortization** because this input model keeps all D&A separate.

Margins are unavailable when revenue is zero. Negative calculated profit is a
valid loss; the eight input amounts themselves are nonnegative. EBITDA is an
estimate of performance before financing, tax and depreciation, not cash flow.
The other-income/expense adjustments must be classified consistently between
months; the app does not claim a statutory or standardized EBITDA definition.

Capital investments, loan principal, owner withdrawals and inventory purchases
for goods not yet sold must not be entered as period operating expenses merely
because money left the account. When an adjustment needs a negative entry,
record the corrected nonnegative period totals and explain the adjustment in
notes rather than hiding it in another category.

## App data remains context

Order creation dates and `estimated_total` are sales estimates. Completion of an
order does not prove receipt of payment or determine the accounting recognition
date. Any order totals shown alongside the financial inputs are context only;
they do not silently populate revenue or turn missing costs into zero.

The app already has receivables, collections, order costs, budget spending and an
expense inbox. Their coverage and accounting classification are not guaranteed.
An order cost may link to an inbox entry that later becomes budget spending:
adding those totals together would double count the same expense. Automatic
accounting imports and reconciliation are deferred until those classifications
and source coverage are reliable.

## Storage and access

Migration `0073_business_metric_periods.sql` creates one shared record per month
in `public.business_metric_periods`. `period` is the first day of the month.
`inputs` contains exactly the eight named nullable numeric fields, each between
zero and 1,000,000,000,000,000 VND. Notes are limited to 3,000 characters. The
record retains its creator, latest updater, timestamps and incrementing version.
Calculated values are derived from the current inputs instead of being stored
as a second source of truth.

The new tab is under `/admin/control` → **Chỉ số kinh doanh**. `/admin/control?tab=metrics` opens it directly. The form calculates as you type, keeps unknown values distinct from zero, saves partial months, exports CSV and lists the 12 latest saved months. The older report now labels order estimates and payment-method selections accurately, without claiming those amounts have been collected.

Only authenticated administrators and managers may read these records. Row
level security uses the existing `is_staff_manager()` helper. No anonymous or
ordinary employee financial access is added. Authenticated callers receive
SELECT permission only; direct insert/update/delete is revoked.

`save_business_metric_period(period, inputs, notes, expected_version)` performs
server-side role and input validation. A null expected version means that the
month is expected to be absent; an existing version must match exactly before
an update is allowed. A concurrent creation or stale edit raises
`metric_conflict`, so the UI can preserve the draft and request a reload rather
than overwrite another saved record. Creation starts at version 1; each update
increments it. The RPC derives audit user IDs from `auth.uid()` rather than
trusting client-provided identities. No service credentials belong in the
browser.

## Validation and deployment status

At creation of this document, migration 0073 has **not been applied** to the live
database and production deployment is not yet verified. Apply only the new
migration; do not replay previously applied migrations.

Completed local checks: **9 focused calculation/order-indicator tests passed**; production build passed; `git diff --check` passed. Calculator cases cover unknown/zero inputs, losses, incomplete inputs, other income/expenses, limits, Vietnam month boundaries and raw/mapped order fields. Unsaved drafts persist in sessionStorage scoped by authenticated email and month; saved figures remain database records, and stale draft versions are rejected by the RPC. Drafts are not a backup across browsers/devices.

Remaining deployment checks (not yet verified):

- Managers can save/reload a month; ordinary employees and anonymous callers
  cannot read or save it. Direct authenticated writes are denied.
- Unknown/missing keys, numeric strings, negative/oversized values, an invalid
  month and oversized notes are rejected by the server.
- Two callers saving the same expected version produce one success and one
  conflict; the losing draft is not silently discarded.
- The financial form remains usable on desktop and at 390 px.

The remaining checks are planned, not claims that live permissions or database behavior
have already been tested. Update this status after actual validation/deployment.
