# Correct an entered order line

Admin/manager opens Order book → order → **Xoá sản phẩm nhập nhầm** (jumps to
**Thông tin đã đặt**) → **Xoá dòng**. The confirmation requires a 5–1,000 character
reason. At least one line must remain. The correction is available at every order
stage and does not change its stage or send a new customer message.

The authenticated server calls service-only `remove_order_line`. The function
locks the order then any active receivable, checks the complete displayed line
snapshot, preserves retained line JSON/prices, recalculates order totals, and
writes an audit event in the same transaction. Known, already-applied tier/quote
discounts are retained. An unexplained monetary adjustment requires reconciliation;
unquoted orders remain unquoted. VAT/promo snapshots are unchanged.

An active payment request is adjusted only when its amount and payment ledger
match and its new total is at least the amount already collected. Payment rows
are never removed. Excess active product/variant reservations are released;
fulfilled reservations and batch allocations remain. The existing BOM trigger
updates only planned material estimates; confirmed/paid BOM costs stay intact.
Manual costs, Procedure Run evidence and shipment
history remain accessible. This is an entry correction, not a physical stock return.

Validation: `node --test tests/staff-order-route.test.mjs`; for in-memory PostgreSQL,
set `PGLITE_MODULE` to an installed PGlite entry point and run
`node tests/order-line-db.mjs`. The SQL fixtures use synthetic data and roll back;
delivery schedulers/external messaging are not invoked. Migration 0080 must be
applied before enabling the UI in production.

## Correct the selling unit on an existing order

Admin/manager opens any order, including paid/shipping/completed orders, then
**Sửa đơn vị sản phẩm** → **Thông tin đã đặt** → **Sửa đơn vị** for the line.
Choose the correct unit and save the recorded reason. At least one line may
remain; unlike removal, a single-line order can be corrected.

This is an entry-label correction, not a kg-to-package conversion. Quantity,
agreed price, total, stage, payments, inventory history and Procedure Run are
preserved. Wholesale total_kg is recalculated from actual kg lines. The unit
before/after and actor are recorded atomically. Whole package quantities are
required for viên/bánh/gói. Concurrent edits fail on the full line snapshot.

Apply migration 0081 before publishing the unit editor. The BOM order trigger
skips changes consisting solely of unit labels, so a correction also preserves
recorded planned costs. Product/quantity/price/removal changes retain the existing
BOM synchronization. This migration itself does not modify historical orders.

Validation: 26 staff API tests and production build passed; the focused
correct-order-line-unit.sql in-memory PostgreSQL fixture passed with all 87
tables restored after rollback. Production application and old-data correction
still require a connected session.
