# Familiar tea guide (B2C)

`/shop` has a collapsible “Bạn thường uống trà gì?” section. Current product details show only the relevant familiar category, after the brewing/business section. Vietnamese and English follow the existing locale control.

The guide maps explicit existing SKU IDs to familiar categories: Thái Nguyên green tea, breakfast black tea/tea bags, smoky black tea, jasmine/lotus, and oolong. It introduces tasting alternatives; no blind tasting, equivalent quality, organ benefit, competitor price/rating, or superior-value result is claimed. Shan suggestions are distinguished from Thái Nguyên origin. English Breakfast context links to a primary brand reference.

Recommendations reuse current retail names, photos, flavors, prices, stock availability and pack units. Groups without an orderable product are hidden. No new product entity, database, third-party tracking or dependency is introduced. No per-cup/100g competitor-price calculation without verified weights and dated SKU data.

## Review

- Open the guide on `/shop`, choose each available category and follow a tea detail link.
- A detail page shows its own relevant category and marks the current tea; no unrelated green-tea advice on a black tea.
- Switch VI/EN; keyboard focus and category selection remain usable.
- Check 390px layout: wrapping choices, stacked comparison, readable price/unit and normal cart behavior.
- Unavailable tea, sold-out priced packs, goods, samples and unclassified product names do not receive fabricated recommendations.

Broader direct competitor comparisons require a named SKU, market, date, consistent weight/unit and firsthand tasting notes. Add those only when available.
