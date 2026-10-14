# Mức hoa hồng mẫu và giá chào xuất khẩu

Owner-authorized update, 14 October 2026.

The owner confirmed **commission on profit after all confirmed order costs, before commission itself**. The independent four-price update was released in PR42. Public partner registration remains closed; access is by private invitation and admin approval.

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

All new presets use the profit basis. These are editable starting values, not an automatic new rate or a persisted organisation/security role. A new or unpriced partner still receives no commission default until a manager explicitly selects/enters and saves the terms. Choosing negotiated terms clears the rates; an actual percentage must be separately agreed and reviewed before reconciliation.

The manager card uses the existing approval/update RPC, reason requirement and audit. The same presets fill an unsigned agreement in `/admin/documents`; that action never changes the ledger. Increasing the offer by 5,000 VND/kg does not establish the actual profit available for every commission.

## Calculation and existing agreements

Net eligible collected revenue excludes VAT, customer-billed shipping, refunds and cancellations. Profit basis is `max(0, net eligible collected revenue - confirmed all costs before commission)`. Do not include commission in those costs or deduct the same cost twice. The manager confirms production, packaging, logistics, samples, allocated operating costs and risks as a total; V1 does not claim to calculate the factory's actual costs automatically.

For 100 million VND eligible collected revenue and 85 million VND confirmed costs, the commission base is 15 million: 3% yields 450,000 VND and 5% yields 750,000 VND. Unknown costs remain unknown and block approval/payment. A zero or negative profit yields zero commission. The existing minimum retained-profit guard and explicit admin exception remain in force.

Migration `0087_partner_profit_commissions.sql` preserves existing agreements as revenue-based. A manager must explicitly choose a new basis with a reason. Unpaid reviews affected by a basis change must be reconciled again. Paid basis, rate and recorded payout remain immutable; later cost/payment/refund changes surface a review/recovery warning rather than rewriting history. No automatic payouts.

## Selective private statements and evidence

Each commission card has a private statement panel. A manager previews the current calculation, enters a summary, optionally uploads **one PDF/JPEG/PNG up to 5 MiB**, reviews its contents, then explicitly releases it for that order's approved partner. Uploading/reconciling alone shares nothing. Files are in the private `partner-cost-statements` bucket; metadata and order references stay in the database. No new environment variable is needed; the existing server-only Supabase storage credentials are reused.

Partners can read only their own current published statements through authenticated RPC/API checks. Unpublished internal costs, other partners, storage paths and actor IDs are excluded. Changed calculations make published statements unavailable until reconciliation and a new explicit release. Managers can withdraw a release. Download links expire after 60 seconds; withdrawal cannot erase a copy already downloaded or immediately revoke a link already issued.

## Deliberate boundaries

No retroactive update of approved partners, paid commissions or signed conditions. No public registration launch. No automatic performance tiers, quarterly bonuses, six-month expiry, flat-fee/per-kg settlement engine or account-management retainer is claimed. Current repeat entitlement is count-based; negotiated exceptions continue through existing order review with a recorded reason. V1 accepts a manager-confirmed order cost total, not a cost-line accounting engine or automatic invoice extraction. Actual payouts and signed agreements remain separate.

## QA

Check all four new VND prices and both dated PDFs. Use isolated fixtures for basis changes, unknown costs, losses, refund changes, paid history and cross-partner evidence denial. On live, inspect presets and document drafts without saving test terms, uploading real invoices or publishing financial statements. Manually check the phone layout, including 390 px, before the partner pilot.
