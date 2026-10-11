# Company profile and tea catalogue PDFs

Public downloads:

- `public/downloads/hoang-long-profile-catalog-vi.pdf`
- `public/downloads/hoang-long-profile-catalog-en.pdf`

Both are seven-page A4 documents. They use the public company profile, the current public trade-tea catalogue and the two existing local photographs at `public/landing/1.jpg` and `public/landing/3.jpg`. Noto Sans and Noto Serif are embedded for Vietnamese accents. The files contain links to the online catalogue, each tea, quotation form, phone and Zalo; the QR points to `/company`. English website links preserve `?lang=en`.

## Regenerate

Export a JSON payload from `lib/company-profile.js`, `lib/trade-product-details.js` and the currently public trade teas. The builder accepts this shape:

```js
{
  profiles: COMPANY_PROFILE,
  contact: PROFILE_CONTACT,
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

Only export public product and contact fields. Keep snapshots and rendered QA pages outside the repository. The October 2026 layout expects 14 teas and six active product groups; update the pagination in the builder if the catalogue size changes.

With the Codex bundled runtime:

```sh
/Users/longnguyen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 scripts/build-company-catalog-pdf.py --input /private/tmp/hl-company-pdf-data.json
```

The script uses ReportLab and Pillow. An alternative runtime can be used with those libraries installed; pass `--font-dir` containing `NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSerif-Regular.ttf` and `NotoSerif-Bold.ttf`. `--output-dir` overrides the default public download directory.

## Check before publishing

Render both PDFs with Poppler and inspect all pages for wrapping, overlapping content, accents, margins and contact links. Check that all 14 public tea names, their listed pack formats, brewing instructions and any actual product notes appear. Blank product facts are labelled for confirmation rather than filled with inferred tasting notes or specifications.

The edition date makes the catalogue a dated reference. Production capacity is explicitly for supply planning; current volumes, pricing, packing and delivery timing require confirmation. The Sóc Sơn address is labelled as an office and warehouse.
