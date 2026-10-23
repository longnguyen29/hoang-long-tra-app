# Company profile and tea catalogue PDFs

Public downloads:

- `public/downloads/hoang-long-profile-catalog-vi.pdf`
- `public/downloads/hoang-long-profile-catalog-en.pdf`

Both are ten-page A4 documents in the 23 October 2026 edition (17 current public teas). They use the public company profile, the current public trade-tea catalogue and the two existing local photographs at `public/landing/1.jpg` and `public/landing/3.jpg`. Noto Sans and Noto Serif are embedded for Vietnamese accents. The files contain links to the online catalogue, each tea, quotation form, phone and Zalo; the QR points to `/company`. English website links preserve `?lang=en`.

## Regenerate

Export a JSON payload from `lib/company-profile.js`, `lib/trade-product-details.js` and the currently public trade teas. The builder accepts this shape:

```js
{
  profiles: COMPANY_PROFILE,
  contact: PROFILE_CONTACT,
  director: EXPORT_DEVELOPMENT_CONTACT,
  legal: PROFILE_LEGAL,
  pdf: PROFILE_PDF,
  revision: PROFILE_REVISION, // ISO date; displayed as the PDF edition date
  groups: TRADE_GROUPS,
  products: publicTeaProducts.map(product => ({
    id: product.id,
    photo_url: product.photo_url,
    vi: tradeProductFacts(product, "vi"),
    en: tradeProductFacts(product, "en"),
  })),
}
```

Only export public product and contact fields. Keep snapshots and rendered QA pages outside the repository. The builder paginates the current product list and active groups. This edition has 17 eligible public teas and six active groups; new or unknown tea types retain their existing classification rather than acquiring an inferred specification.

With the Codex bundled runtime:

```sh
/Users/longnguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/build-company-catalog-pdf.py --input /private/tmp/hl-company-pdf-data.json
```

The script uses ReportLab and Pillow. An alternative runtime can be used with those libraries installed; pass `--font-dir` containing `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSerif-Regular.ttf` and `NotoSerif-Bold.ttf`. `--output-dir` overrides the default public download directory.

## Check before publishing

Render both PDFs with Poppler and inspect all pages for wrapping, overlapping content, accents, margins and contact links. Check that all current public tea names, their listed pack formats, brewing instructions and any actual product notes appear. Blank product facts are labelled for confirmation rather than filled with inferred tasting notes or specifications.

The edition date makes the catalogue a dated reference. Production capacity is explicitly for supply planning; current volumes, pricing, packing and delivery timing require confirmation. The Sóc Sơn address is labelled as an office and warehouse.

## Export and large-bulk packing

The owner-confirmed B2B fact is maintained in `lib/b2b-packing.js`: PP/PE sacks of 20 / 30 / 35 kg, adjustable to the tea's form or the buyer's intended use and confirmed per order. `COMPANY_PROFILE[locale].packing` carries this fact into the JSON payload. Page 5 in this edition displays it separately from the product's listed packs; catalogue pages point back to that section.

Retail pack sizes and cake/piece units remain the public product's original data. The B2B packing statement does not change the product unit, imply a minimum order or convert pieces to kilograms. Both B2B sales-kit editions read the same shared fact.

## Institutional edition · 23 October 2026

The profile adds cooperation areas, a first-meeting brief and document-review topics. Anh Long is presented as Giám đốc Phát triển Xuất khẩu / Director of Export Development, with the owner-approved phone; the supplied legal entity and tax ID appear in the contact/footer. These fields do not imply contract-signing authority or Partner Network access. No certificates or past export markets are asserted without evidence.

The two concise B2B sales-kit PDFs remain three pages. Their document edition is 23 October 2026; the unchanged indicative EXW price list is dated 14 October 2026. Both use the same receiving export contact and preserve 20/30/35 kg PP/PE packing.
