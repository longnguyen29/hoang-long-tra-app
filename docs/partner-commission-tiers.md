# Mức hoa hồng mẫu và giá chào xuất khẩu

Owner-authorized update, 14 October 2026.

**Status: local draft only, not published.** The owner subsequently asked whether rates should use profit after costs instead of revenue. The calculation basis must be confirmed before these revenue-based presets are released. The independent four-price update is released separately in PR42.

## Four export reference offers

The four public export offers in `lib/export-teas.js` increase by 5,000 VND/kg:

| Tea | Previous VND/kg | New VND/kg |
| --- | ---: | ---: |
| Trà Xanh Hấp | 75,000 | 80,000 |
| Hồng Trà Khói | 85,000 | 90,000 |
| Hồng Trà OP1 | 80,000 | 85,000 |
| Trà Xanh Hoa Ngọc Lan | 100,000 | 105,000 |

EXW factory terms and standard PP/PE packing remain unchanged. The shared source feeds the public page, partner sales-kit picker, currency estimates, quantity estimator and both static sales PDFs. This is not a retail SKU repricing or a rewrite of existing quotations, contracts, orders or partner-specific price agreements. Internal commission budgeting is not displayed on the buyer-facing page.

## Explicit starting presets

| Preset | First order | Repeat orders |
| --- | ---: | --- |
| Giới thiệu khách | 3% | 1%, maximum three following orders |
| Hỗ trợ chốt đơn | 5% | 2%, maximum three following orders |
| Bulk / xuất khẩu · thỏa thuận riêng | Unset | No automatic repeat entitlement |
| Tự nhập / điều kiện hiện có | Preserve | Preserve |

These are editable starting values, not an automatic new rate or a persisted organisation/security role. A new or unpriced partner still receives no commission default until a manager explicitly selects/enters and saves the terms. Choosing negotiated terms clears the rates; an actual percentage must be separately agreed and reviewed before reconciliation.

The manager card uses the existing approval/update RPC, reason requirement and audit. The same presets fill an unsigned agreement in `/admin/documents`; that action never changes the ledger. Existing collected-revenue exclusions, cost/profit checks, admin exception approval and payout recording are preserved. Increasing the offer by 5,000 VND/kg does not establish the actual profit available for every commission.

## Deliberate boundaries

No migration or new environment variable. No retroactive update of approved partners, paid commissions or signed conditions. No public registration launch. No automatic performance tiers, quarterly bonuses, six-month expiry, flat-fee/per-kg settlement engine or account-management retainer is claimed. Current repeat entitlement is count-based; negotiated exceptions continue through existing order review with a recorded reason.

## QA

Check all four new VND prices and the shared API's converted outputs, both dated PDFs, and that B2C remains untouched. In an existing partner's card choose a preset, inspect rates/limit, then edit a rate and choose custom. Do not save test terms into a real partner. Verify the same choices in a document draft and that exports show the chosen rates. Manager approval, real agreement changes and payouts remain separate actions.
