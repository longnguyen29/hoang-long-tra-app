# HL-001 — Visual and functional acceptance

**DRAFT v0.1 · 26 October 2026 · Not approved.**

This defines proposed checks for a later implementation. **No redesigned
homepage exists yet and none of the implementation checks below is marked passed.**
The current deliverable is a draft documentation PR with baseline images.

## 1. Evidence required for creative review of these drafts

The review packet consists of root `AGENTS.md`, the current-state audit,
creative direction, storyboard, visual system and this document. Baseline source
commit and limits must be stated. Every proposed design choice must be labelled
DRAFT; public business facts must remain distinguishable from suggestions.

The Creative Director should return:

- Verdict: **revise / approved for implementation**; approval is not deployment permission.
- Exact document revision/commit reviewed and material amendments by section.
- Accepted storyboard sequence, hero/copy direction and product interaction.
- Explicit decision about replacements for legacy `design.md` constraints.
- Required real photographs and acceptable fallbacks.
- Any unresolved factual issue, with owner confirmation needed separately.

Do not infer approval from silence, a green build, a draft PR or an assistant's
self-rating. The present approval record is **pending**.

## 2. Future implementation acceptance matrix

All rows start **NOT RUN** until implementation is authorized and completed.
“Not applicable” requires a reason. A compilation result cannot satisfy visual,
truthfulness, navigation or accessibility rows.

| ID | Acceptance criterion | Evidence / failure condition |
| --- | --- | --- |
| V01 | First screen identifies Vietnamese tea production/supply and an obvious B2B next step. | 390×844, 768×1024, 1440×1000 screenshots, VI/EN. Buyer must not scroll through a manifesto to find a sample/quote action. |
| V02 | The page is recognizably Hoàng Long, with real place/material and four actual tea identities. | Compare to approved storyboard; swapping logo/text should not make it any generic supplier. No invented proof. |
| V03 | Distinct section rhythm: opening, close craft detail, product presentation, industrial ledger, process/contact, retail. | Full-page desktop/mobile captures; fail if the whole page is repeated equal cards or identical splits. |
| V04 | Typography has purposeful scale and readable VI diacritics/EN wrapping. | Actual font-loaded screenshots; no clipped marks, accidental single-letter lines or image-baked copy. |
| V05 | Photographs retain true subject and appropriate resolution; captions identify context accurately. | Asset/provenance review. No generated factory, fake founder portrait, synthetic estate or third-party branded customer proof. |
| V06 | B2B remains dominant; retail accessible without hunting. | Primary hero action + nav + quiet retail entry; no retail pack/wholesale unit confusion. |
| V07 | No repeated capacity/product paragraphs or theatrical empty sections. | Editorial read-through at each viewport; each chapter answers its own question. |
| V08 | Motion supports reading and works without hover, animation or JS-dependent reveal. | Real interaction check, reduced-motion capture, no scroll lock/snap; no hidden essential content. |
| F01 | Existing public destinations and relevant company anchors still resolve. | Link/anchor inventory and browser navigation; no renamed/missing routes or PDF paths. |
| F02 | Product selection retains exact SKU and sample/quote intent. | Test each of four teas via existing helper; no OP1↔Mật or steamed-green↔Mộc aliasing. |
| F03 | VI/EN switching and supported campaign parameters survive relevant navigation. | Visit with five safe UTM fields and lang; assert the existing sanitization/duplicate policy. Check no arbitrary PII enters URLs/events. |
| F04 | Navigation retains keyboard/touch behavior and focus return. | Desktop dropdown + mobile menu; Escape, outside click, active state and repeat open/close. |
| F05 | Existing Supabase home-media read/fallback and `home_view` contract remain intact. | Source diff and relevant regression; no new public write path or client secret. Failure leaves usable content/links. |
| F06 | Retail and partner workflows remain independent of the redesign. | Existing retail tests; smoke-test catalog/detail/cart without placing an order. Preserve referral consent and no auto-enrollment. |
| F07 | Global consent, protected operations and financial code are unchanged. | Changed-file and API/schema diff; no broadened pixel allowlist, migrations, admin/order/payment/SMS changes. |
| F08 | SEO/canonical, existing redirects, opt-in kiosk and policies remain usable. | Home metadata review, known redirects/links, policy access; ordinary visitors never see unsolicited kiosk takeover. |
| A01 | Text/UI contrast meets applicable WCAG 2.2 AA thresholds. | Measured contrast plus actual image-overlay inspection at each crop. 4.5:1 normal text; 3:1 large text/applicable UI boundaries. |
| A02 | Semantics and names convey the same information as appearance. | One h1, coherent headings, landmarks, useful alt, labelled controls, decorative images hidden appropriately. |
| A03 | Keyboard focus is visible and selection predictable. | Complete keyboard pass; selector and menu usable without pointer; no focus loss/trap outside a correctly implemented dialog. |
| A04 | Narrow widths, zoom and long text do not conceal content or actions. | 390/768/1440 required; targeted 320px/200% zoom checks. No horizontal overflow, clipped button or overlay covering CTA/policies. |
| A05 | Touch and reduced motion are first-class. | ≥44px project target, no hover-only content; reduced motion keeps all meaning and usable controls. |
| P01 | Hero assets/layout are stable and responsive. | Image dimensions, no avoidable CLS; correct priority, mobile transfer check, no accidental eager load of entire archive. |
| P02 | Performance does not materially regress against the same baseline conditions. | Production build/local page measurement, stated device/network; real field metrics remain unverified until collected. |

## 3. Proposed creative scoring rubric

Score each axis 1–5, with a written reason and screenshot reference:

| Axis | A score of 4 or 5 requires |
| --- | --- |
| Specificity | Actual Vietnamese tea context, materials, products and company facts; no interchangeable brand template. |
| Hierarchy | B2B offer/next action unmistakable while the story and retail path remain understandable. |
| Composition | Deliberate image/type relationships and varied chapter rhythm at all three widths. |
| Craft | Excellent spacing, crops, type, caption, focus and selected states; no unfinished details. |
| Commercial clarity | Buyer understands range, supply basis, next step and contact; no fabricated claim or pricing ambiguity. |
| Restraint | Every interaction/detail earns its place; no busy chrome or repetitive cards. |

Proposed acceptance: all axes ≥4, all critical factual/functional/accessibility
issues closed, and explicit Creative Director review. An average cannot hide a
bad mobile experience or a critical misleading claim. Codex self-review and
independent creative review must be labelled separately.

## 4. Future check commands and scope

From the repository root, after final meaningful code edits:

```sh
npm run build
node --test lib/public-attribution.test.mjs lib/trade-catalog.test.mjs lib/export-sales-kit.test.mjs lib/export-enquiry.test.mjs tests/export-enquiry-route.test.mjs
npm run test:retail
```

These are proposed relevant regressions; expand only when changed code justifies
it. Do not rerun all operational tests for a photo/copy edit. Review any new home
interaction with a small behavior test if it has meaningful logic; do not create
snapshot assertions that merely mirror CSS implementation.

`npm run lint` currently invokes `next lint`, which is unsupported by the installed
Next 16 toolchain. No dedicated typecheck script is present; report build type
validation separately from a standalone typecheck. Do not silently replace tooling
or say lint/typecheck passed. Use an available accessibility scanner if present
and document its scope; manual keyboard, contrast and image review remain required.

Never submit production enquiries or trigger SMS/Telegram/payment actions just
to prove a homepage handoff. Inspect links without submission; use a properly
isolated test environment if a later backend change needs a write test.

## 5. Future screenshot and navigation evidence

Capture production-mode local screenshots after images/fonts and relevant
lazy-loaded content are ready. Required widths: **390, 768, 1440 CSS pixels**.
Record browser, viewport height, locale, URL, source commit and content state.
Include the opening and full page, selected product states, mobile menu and a
reduced-motion state. Review both languages; do not call a dev screenshot a
production acceptance result.

Suggested later paths: `docs/qa/evidence/hl-001-after/home-{width}-{locale}.png`.
Keep before/after evidence distinct. Capture actual pages, not composited browser
mockups; no customer/private records. Record known image or backend failures
instead of cropping them out. Reset temporary browser viewport settings afterward.

Minimum navigation matrix: home → each core profile → sample/quote; home → catalog;
home → retail/detail; home → company documents/contact; header VI/EN and mobile
menus; footer policies/phone/map; incoming safe campaign tags and partner share
links remain within their existing contracts. No checkout or commission mutation.

## 6. Current documentation-phase evidence

| Check | Current status |
| --- | --- |
| Source/route/asset and business-contract audit | Completed with scope/limits in `docs/vision/current-state-audit.md`. |
| Before screenshots at requested widths | Captured locally; initial viewport only, current unchanged UI. |
| Redesigned UI, motion, after screenshots | Not implemented; intentionally not run. |
| Application build/regression/automated accessibility | Not run for this documentation-only phase. No application behavior changed. |
| Document references and changed-file scope | Six Markdown files carry DRAFT headers; 15 local links resolved; `git diff --check` passed. JSON validation confirms the exact-branch exclusion and unchanged prior Vercel settings. |
| Production database, merge, deployment | Not authorized. Exact-branch Vercel exclusion prevents automatic preview publishing. |
| Creative Director approval | Pending; draft PR is the review handoff, not an approval. |

## 7. Review and release separation

This PR is for reviewing the brief. After approval, implementation is a separate
authorized step with code, check results and visual evidence. Merge and deployment
remain separate decisions. A public preview must not be created in the current
no-deploy phase. Before any future branch publishing, inspect automatic deployment
behavior; do not assume a draft PR suppresses Vercel builds.

Review outcome template:

```text
HL-001 / reviewed commit:
Verdict: REVISE or APPROVED FOR IMPLEMENTATION
Creative Director:
Approved documents/revisions:
Required changes by section:
Required real assets / accepted fallbacks:
Factual issues needing owner evidence:
Implementation scope authorized:
Merge/deployment authorization: NONE in this review
```
