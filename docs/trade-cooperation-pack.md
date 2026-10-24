# Trade cooperation pack — 24 October 2026

## Purpose

A three-layer bilingual public discussion pack for Hoàng Long's meetings with importers, distributors, associations and trade-promotion bodies. It is a company-authored framework, not a government-endorsed programme, an addressed official submission or proof of certifications. The company can use it to introduce a concrete cooperation proposition and develop a specific meeting brief.

The presentation has been rebuilt around what Hoàng Long contributes, the coordination sought from a counterpart and the intended commercial next step. Actual certificates, destination requirements and performance evidence cannot be supplied by copywriting. Their public claims remain bounded by verified document scope and owner-approved disclosure.

## Documents

| Layer | Pages per language | Published files |
| --- | --- | --- |
| Cooperation framework | 2 | `/downloads/hoang-long-cooperation-brief-vi.pdf`, `-en.pdf` |
| Corporate profile | 8 | `/downloads/hoang-long-corporate-profile-vi.pdf`, `-en.pdf` |
| Product & technical annex | 7 | `/downloads/hoang-long-product-annex-vi.pdf`, `-en.pdf` |

The first two read `lib/institutional-pack.js`, shared with the website. `PACK_DOCUMENTS[locale]` exposes `brief`, `profile` and `appendix`. The annex reuses the existing catalogue renderer and a refreshed public-only payload; it contains a technical page, range guide, four balanced catalogue pages covering 17 current teas, and implementation/contact. The original 14-page profile/catalogue and three-page sales kits remain available at their existing paths for compatibility; they are not the primary corporate downloads.

Website entry: `/company`. Anchors: `#overview`, `#capability`, `#portfolio`, `#operating-model`, `#quality`, `#cooperation`, `#documents`, `#contact`. Existing campaign/language handling, B2C store, samples, quotations, enquiries, partner ownership and commissions stay in their existing workflows. No migration or environment change is needed.

## Photographs and missing evidence

`lib/company-media.js` is the single public photo manifest. Web and PDF read the same sources and captions. A null `src` produces a visibly labelled real-photo space. It is never filled with AI imagery presented as actual production evidence.

| Slot | Current state | Suggested file |
| --- | --- | --- |
| `factorypanorama` | Photo to be added | `public/company-media/factory-panorama.jpg` |
| `process` | Existing `/landing/3.jpg` | Optional replacement: `public/company-media/processing-line.jpg` |
| `qc` | Photo to be added | `public/company-media/product-quality.jpg` |
| `bulkload` | Photo to be added | `public/company-media/bulk-packing-handover.jpg` |

Use real owner-authorised images. For each replacement, confirm the actual place, depicted operation and capture date; redact unauthorised customer/driver/financial information. Choose horizontal photographs, ideally at least 1600px on the long edge. Add the file, set the manifest entry's `src` to its public path, and update bilingual captions/alt text. Do not set `src` before the file exists. Rebuild the PDFs and website together. Screens and files remain useful while missing images are explicitly marked.

Origin photo `/landing/1.jpg` and process photo `/landing/3.jpg` are existing brand-profile assets. Their inclusion does not imply independent audit verification or that every traded tea is grown/manufactured in Hà Giang.

## Public facts and commercial limits

Owner-supplied legal name and tax ID, family experience since1995, production planning capacity50–100t/month, factory/EXW TânLập HàGiang, PP/PE20/30/35kg, indicative2–8week transaction window and AnhLong's contact/remit remain the basis. They do not introduce new export achievements, acreage, government connections or certifications. Capacity is scheduled per order; transit in a time estimate does not mean freight is included in EXW pricing. Selected traded teas retain product-specific origin information.

Meeting counterpart, destination market, measurable pilot targets, funding and agreed institutional roles are not yet supplied. The framework therefore proposes buyer connections, sample assessment and commercial follow-through without inventing commitments. Before an addressed submission, add the actual recipient, market, agenda and agreed next steps. Legal signing authority is distinct from the public export-development title.

## Regeneration

Use the bundled Python runtime with ReportLab/Pillow/PyMuPDF and the existing embedded Noto fonts. `scripts/build-institutional-pack.py` reads only public source modules; the catalogue input must contain public products and contact fields only. Never supply secrets, private customer records or internal cost data.

```sh
python3 scripts/build-institutional-pack.py --catalog-input /tmp/hl-institutional-company-data.json
```

The build emits the six new documents. Set the edition in `PACK_REVISION` and update the web edition label together. The public catalogue payload is refreshed separately from currently available eligible tea rows using the public catalogue selection already documented in `docs/company-profile-catalog-pdf.md`.

For a particular meeting, the builder also accepts `--recipient`, `--market` and `--meeting-date YYYY-MM-DD`. Use a separate `--output-dir`, such as `/tmp/hoang-long-meeting-pack`, so a counterpart-specific version does not overwrite the generic public documents. The fields identify the meeting; they do not rewrite the substantive proposal. Confirm the actual agenda, objectives and authorised disclosure before sharing a tailored edition.

Render every changed PDF page. Check margins, wrapped Vietnamese accents, placeholder labelling, correct contact/QR links, current page counts, all product names, and clear separation of retail pack formats from bulk/export formats. Web checks should cover desktop and390px, both languages, document links and the contact/meeting pathways. Do not submit real test enquiries or send customer messages for a content release.

## Release verification

Final production build passed. The 16 existing export-sales-kit, trade-catalogue and export-enquiry tests passed; no mirrored content tests were added. Browser review covered desktop company/document hierarchy, Vietnamese/English at390px, expandable QC/handover photo spaces and the six download references without horizontal overflow. No real enquiry was submitted. The existing unsupported Next16 `next lint` script is not reported as passed.

All six new PDFs were rendered:34pages total. Measured-text overflow guards, edition date, legal identity, AnhLong/phone,90links and all17currenttea names per annex were checked. The custom-meeting options were tested into a private temporary directory; the public documents contain the generic framework only. No missing certificate, exporter history, government affiliation or audited production result has been invented to fill an evidence gap.
