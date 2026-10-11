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
