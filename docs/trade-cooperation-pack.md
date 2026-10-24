# Export product & company pack — 24 October 2026

## Current direction

The public website and primary PDFs now lead with the owner's four core export products: **Hồng Trà Mật, Hồng Trà Khói, Xanh Mộc and Trà Xanh Hoa Ngọc Lan**. Product identity, sensory distinctions, actual photographs, supply format and order-specific specifications take priority over general cooperation prose. Brewing instructions remain in the retail experience, outside this export pack.

The same core editorial source, `lib/export-product-profile.js`, is reused by the home page, B2B catalogue, trade enquiry page, company/product profile and PDF renderer. `lib/institutional-pack.js` supplies company facts and the export sales brief. All four profiles reference existing catalogue IDs; no new products, grades or order entities were created.

## Documents

| Document | Pages per language | Public path |
| --- | --- | --- |
| Export product portfolio | 6 | `/downloads/hoang-long-product-annex-vi.pdf`, `-en.pdf` |
| Corporate profile | 8 | `/downloads/hoang-long-corporate-profile-vi.pdf`, `-en.pdf` |
| Export sales brief | 2 | `/downloads/hoang-long-cooperation-brief-vi.pdf`, `-en.pdf` |

The product document contains an overview, one page per tea, and one common specification/commercial/contact page. These six primary PDFs comprise 32 pages. Their existing public filenames are retained for compatibility. Earlier 14-page catalogues and three-page sales kits are preserved at their existing URLs but are not the primary product downloads.

Website: `/company?lang=vi` or `?lang=en`. Product anchors: `#product-hong-tra-shan-mat`, `#product-hong-tra-shan-khoi`, `#product-luc-tra-shan-moc`, `#product-luc-tra-ngoc-lan`. Overview aliases `#products`, `#core-export-products` and `#portfolio` remain usable. Company facts, specifications, supply terms, downloads and contact are separate sections.

## Product facts and limits

The owner confirmed these sensory descriptions on 24 October 2026:

| Existing SKU | Product identity | Confirmed distinction |
| --- | --- | --- |
| `hong-tra-shan-mat` | Hồng Trà Mật | Honey and caramel aromatic notes; mellow palate; pronounced aroma suitable for beverage applications |
| `hong-tra-shan-khoi` | Hồng Trà Khói | Smoke, black bean and wood notes; full-flavoured |
| `luc-tra-shan-moc` | Xanh Mộc | Refreshing, smooth, without harsh astringency |
| `luc-tra-ngoc-lan` | Trà Xanh Hoa Ngọc Lan | Real dried magnolia flowers |

Honey/caramel describe aroma, not added ingredients. No pine smoking method, roasted-bean ingredient, RTD capability, yield guarantee, health claim or certification is inferred. No measured moisture, leaf grade, liquor colour, origin acreage, shelf life or laboratory result has been invented. Detailed specifications and acceptance criteria must be agreed against the actual offered sample and lot.

**Do not map prices from Hồng Trà OP1 or Trà Xanh Hấp onto Mật or Xanh Mộc.** The legacy `EXPORT_TEAS` offer IDs and prices are separate. This release does not change those prices, the Taiwan sales route, partner ownership, commissions, authentication, order flow or B2C products.

Owner-supplied company facts remain: legal name/MST, family tea-making experience since 1995, overall production planning capacity 50–100 tonnes/month, EXW collection at Tân Lập, Hà Giang, PP/PE sacks 20/30/35 kg adjustable per product, indicative 2–8 week transaction window including transit but excluding unforeseen delay, and Anh Long's export-development contact. EXW freight/loading/formalities are allocated in the offer/contract. Capacity is confirmed per order and product mix.

## Photographs

Four unmodified public catalogue photos are saved in `public/export/core-*.jpeg`; provenance is in `public/export/README.md`. They identify the tea lines, not a guaranteed export grade or shipment lot. Website detail photos and PDF product pages retain the complete photograph; the overview may crop for layout.

Factory/QC/packing photo spaces remain managed by `lib/company-media.js`. Null sources produce labelled spaces, not fabricated factory imagery. The actual existing processing photograph remains available. Replace spaces only with owner-authorised real photographs and accurate captions. Factory location and Hà Nội office/warehouse remain distinct.

## Editorial research

Reference structures, not copied claims or prose:

- Hälssen & Lyon: https://www.haelssen-lyon.com/product-variety/teas/black-green-tea/ — category and product identity.
- Finlays: https://www.finlays.net/our-products/tea/black-tea/ — product form and commercial application.
- Vicony: https://www.viconyteas.com/black-tea-catalogue.pdf — photographed product references and procurement fields.
- Martin Bauer: https://www.martin-bauer.com/wp-content/uploads/2022/05/MB_Superfine_powders.pdf — concise product-family and specification presentation.

Do not reuse these companies' certifications, plantations, customer results or manufacturing capabilities as Hoàng Long claims.

## Regeneration & checks

Run `scripts/build-institutional-pack.py` with the bundled Python runtime (ReportLab/Pillow and embedded Vietnamese Noto fonts). The renderer reads public editorial modules only; no `.env`, private customer records, secrets or internal costs are consumed. `--catalog-input` is optional and, if provided, validates the exact four public catalogue IDs. `--qa-dir` exports text-region bounds. Render PDFs with Poppler for visual review.

Use `--recipient`, `--market`, `--meeting-date YYYY-MM-DD` and a separate `--output-dir` to prepare a meeting-specific copy. These identify a meeting, not an endorsement or agreed programme. Confirm the actual recipient and disclosure scope before sharing.

Release checks: the 16 existing export-sales-kit, trade-catalogue and export-enquiry tests; production build; desktop/390px VI/EN product pages; exact SKU on sample/quote links; six PDF downloads and page counts; PDF accents, wrapping and page bounds. Do not submit real enquiries or send customer messages for this content release. The repository's unsupported `next lint` script is not a passed lint check. No migration or environment change is required.
