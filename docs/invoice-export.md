# Invoice export

In `/admin/orders`, open an order and expand **Xuất hóa đơn** below its recorded total. **Hiện giá gốc** adds an optional original-price column; it defaults off. **In / lưu PDF** opens a separate printable document and the browser print dialog. The legacy order list and payment confirmation use the same exporter, in the current locale.

Original price means the customer-facing pre-discount `lines[].listPrice` snapshot saved with the order. It is never a production cost or private partner price floor. A missing snapshot displays `—`; the current catalogue and discount percentages are not used to reconstruct historical original prices.

Unit prices come from `lines[].price`. Line amounts use current quantity × current unit price, since staff price changes can leave older per-line total metadata stale. `estimatedTotal` remains the recorded order total; no tier, promo, VAT or delivery rule is reapplied. Any difference from the line subtotal is labelled generically as an adjustment to the recorded total, without inventing a tax or discount breakdown. Unquoted totals stay unquoted; zero amounts remain visible.

Only explicit order/customer/line fields enter the document, with HTML escaping. Costs, margins, commission statements and other private order fields are not copied. Export is local to the browser and creates no database write, message or payment. Unsaved order edits disable export in the staff drawer. No migration, dependency or environment change is needed.

Verification, 23 October 2026: all 9 focused renderer tests and the production build passed. Tests cover opt-in original prices, missing snapshots, stale line totals, zero values, saved bulk totals, HTML escaping, mixed units and locales, private-field exclusion and immutable input. A browser check on the development-only sample order confirmed the export disclosure opens, the original-price checkbox defaults off and can be checked, and the print action is available. No real customer order was changed. The actual OS print/save dialog was not exercised.

Manual QA: export with the checkbox on/off, an older order without `listPrice`, a retail discounted order, a bulk order and an order whose prices were edited. If pop-ups are blocked, allow them for this website and retry. The printout is a preliminary invoice; it does not replace an electronic tax invoice.
