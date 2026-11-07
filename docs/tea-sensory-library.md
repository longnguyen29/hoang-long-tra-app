# Tea Sensory Library — Bilingual edition 02

## Placement

- Staff navigation: **Sản phẩm & phát triển → Bánh xe cảm quan trà**
- Main route: \`/admin/sensory\` (admin / manager, authenticated)
- Linked from: **Phát triển sản phẩm**, **Vận hành → Lô & chất lượng**
- A4 printable forms: \`/admin/sensory/forms\`

No public marketing or product copy is changed.

## Content and behavior

The library carries **357 actual English–Vietnamese sensory pairs** from the four full-text print references created on 7 November 2026:

| Wheel | Terms | Native-print target |
| --- | ---: | --- |
| Master Aroma | 173 | A0 landscape |
| Taste & Mouthfeel | 86 | A0 landscape |
| Defects & Taints | 40 | A0 landscape |
| Shan Tuyết Reference | 58 | A0 landscape |

The screen uses a native vector SVG, one wedge per term, with **both full EN and VI labels drawn inside the wheel**, without numeric-only lookups or truncation. It also exposes the same complete terms in a searchable bilingual index beside the wheel for readability on desktop and mobile.

Controls: four wheel tabs, category filter, accent-insensitive English/Vietnamese search, zoom/pan, term selection, clipboard copy, \`Print / Save PDF\`. Print clears temporary filters synchronously and includes **all** vocabulary on the poster. Forms supply a single-sample sensory sheet and a three-sample blind comparison, printable on A4. Form fields are locally editable and not saved to the database.

The interactive SVGs are **new vector representations** of the validated terminology, not pixel-identical copies of the original externally generated poster PDFs. The previous PDF ZIP remains a separate export, not a site asset.

## Safeguards

- The routes check the existing Supabase \`staff_roles\` table and require \`admin\` or \`manager\`, matching Product Development and Knowledge access.
- No database tables, RLS rules, migrations, network calls, CRM data, or existing batch review records are changed.
- Terms are prompts for human sensory evaluation and are **not** verified product descriptions or laboratory/ISO certification claims.
- Suspected mould/contamination needs a separate human QC process. Selecting a descriptor does **not** update \`tea_batch_reviews\`, release a batch, or change stock.
- The Shan Tuyết wheel is a reference vocabulary for tea styles, not a statement that any product or batch exhibits every characteristic.

## Tests & review checklist

Run:

\`\`\`sh
node --test tests/tea-sensory-reference.test.mjs
npm run build
\`\`\`

Manual QA, after deployment to an isolated preview:

1. Admin/manager access succeeds; signed-out redirects to login and unauthorized roles see denial.
2. View 173/86/40/58 EN+VI descriptors. Zoom to 200–300% on a phone; inspect the top seam and category boundaries for overlap.
3. Search \`nhai\`, \`cam\`, \`jasmine\`, and \`astringency\`, then print: verify ALL wheel terms return, not only filtered entries.
4. Print the 173-word Aroma poster on A0 landscape and verify every name is complete with accents.
5. Open \`/admin/sensory/forms\`; print each A4 form, checking page boundaries, cell outlines and spacing.
6. From an existing batch quality panel, follow the new sensory reference links, then return without losing the batch draft.
7. Confirm QC history and product development data remain unchanged.

No live browser/device build or printer validation is claimed until it is actually performed.
