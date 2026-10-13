# Retail and B2B product pages — recommended next step

Inspection of current code, 12 October 2026. This is a proposal; these product-page changes are not part of the Partner Network release and have not been deployed.

## What exists

| Route | Current role |
|---|---|
| `/shop` | `TeaShop`: retail products/pack variants, quantities, local cart drawer and existing checkout. |
| `/catalog` | `TradeCatalog`: B2B tea groups/search, factual product information, brewing details and tea-specific sample/quote links. |
| `/wholesale` | `TradeDesk`: selected tea and sample/quote intent into the existing enquiry flow. |
| `/cho-quan` | Café/menu guidance, brewing/cost estimates and sample handoff. |

These use the same `catalog_products`; retail also uses `catalog_variants`. `TeaDetailModal` exists in the legacy console but is not the current `/shop` product detail. It contains reusable facts but is coupled to legacy controls.

## Proposed information structure

Use one product source with two buying contexts, not duplicate catalogue data or another checkout:

| Context | What the customer needs | Primary action |
|---|---|---|
| Retail | Flavor, how to brew, actual package/unit, price for that variant, availability, delivery details. | Add the selected package to the existing cart. |
| B2B | Beverage/menu fit, consistent product facts, commercial packing, required volume, sample testing and agreed supply terms. | Request a sample or a tea-specific quotation. |
| Referral partner | A shareable factual product page/catalogue and the normal B2B conversation. | Use the approved partner portal to register the lead; sharing a product URL does not automatically claim a customer. |

Add `/shop/[id]` as the smallest useful next implementation. Reuse actual product IDs, product-facts blocks and current selling-unit/variant logic. Give the page an obvious “Dùng tại nhà” retail purchase section and “Dùng cho kinh doanh” link to `/catalog#<id>` or the existing `/wholesale` preselection. Keep `/catalog` as the B2B index and `/cho-quan` as its café-specific entry point initially.

Before adding navigable product pages, extract/share the existing cart state: it currently belongs to `TeaShop`. A detail page must not create a second cart or lose items when navigating back. Preserve Phổ Nhĩ pieces/cakes and the correct retail package units; never convert them to kg without a known weight.

A good first page has: genuine photo → product name and factual tasting information → context selector → package/quantity/retail price OR sample/quotation action → brewing guidance → packing/delivery/return details → related teas. Show a fact as unknown when the catalogue has not supplied it; do not invent grade, MOQ, certificate, shelf life or a wholesale price from the retail price.

Keep homepage navigation understandable: “Mua trà” → retail, “Trà cho kinh doanh” → B2B catalogue/menu guidance, “Hồ sơ Hoàng Long” → company, and the referral programme only after its separate review. Use existing product data and preserve consent, attribution, samples, quotations and order flow.

Later, add indexable product metadata, stock-aware variants and richer B2B comparison only when the underlying data is reliable. This improves product sharing and buyer decisions; traffic still requires useful content/distribution and measured conversion.
