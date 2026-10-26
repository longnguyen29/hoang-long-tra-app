# HL-001 — Visual and functional acceptance

**DRAFT v0.2 · 26 October 2026 · Round 2 proposal; not approved.**

This defines proposed checks for a later implementation. **No redesigned
homepage exists yet and none of the implementation checks below is marked passed.**
The current deliverable is a concept-phase revision with static design
compositions. It is not application code or a finished-site preview. The
[Creative Director's round 1 review](https://github.com/longnguyen29/hoang-long-tra-app/pull/48#issuecomment-6409274323)
returned **REVISE** for commit `f7a19b959b8890e6df2351418f02178f993320c1`;
it did not authorize implementation, merge or deployment.

## 1. Concept approval gate — before implementation

The review packet consists of root `AGENTS.md`, the dated authorization/decision
record, current-state audit, creative direction, storyboard, visual system,
static visual evidence and this document. State the reviewed source commit and
artifact revision. Every proposed design choice remains DRAFT; owner-supplied
facts, observed image content and unverified proposals must remain distinguishable.

Written section descriptions are not sufficient for visual approval. Before
requesting permission to implement, supply and inspect all of the following:

| ID | Required static evidence | Acceptance condition |
| --- | --- | --- |
| C01 | Side-by-side comparison of 2–3 genuinely different art directions | Differences are visible in composition, material treatment, emotional effect and procurement hierarchy, not merely a colour/font swap. Name the selected direction and explain its tradeoff. |
| C02 | At least two responsive opening concepts, each at 1440px and 390px | One is the proposed primary hero; one is a meaningful alternative. Both include real image treatment, final-sized type, VI/EN copy direction, buyer-facing reason to continue and sample/quote action. |
| C03 | Chosen direction's opening, craft, four-tea selection and industrial evidence at 1440px **and** 390px | Actual high-fidelity static compositions using the permitted real assets. Show the text/image proportions, colour planes, captions, focal points, next-chapter edge and exact click targets. No wireframe-only approval. |
| C04 | Annotated mobile fold test at 390×844px | Mark the 844px fold in the composition and identify header, sourcing/heritage sentence, business meaning and primary action. The intended CTA must fit within that fold with normal type and touch size; do not shrink copy to game it. This is a design measurement, not a claim of browser validation. |
| C05 | 768px recomposition notes and selector states | Explain the change from desktop to tablet to mobile. Show default, another selected tea and mobile selection: all four names discoverable, active choice apparent, exact product-aware sample/profile actions. No hover-only discovery. |
| C06 | Photographic readiness and truthfulness review | Separate Release A assets from Release B commissioned needs; mark unsupported claims and missing photos. No synthetic manufacturing evidence, false portraits, client logos without permission or stock claims inferred from capacity. |

Store the review compositions under `docs/vision/concepts/round-2/` and identify
each board's source, width, language, state and DRAFT status. Annotated boards
are **design evidence**, not screenshots of a running app. The old files under
`docs/qa/evidence/hl-001-baseline/` remain **before** evidence only.

Static-artifact QA means inspecting exported boards for clipped text, Vietnamese
diacritics, illegible captions, false image crops and inconsistent destinations.
It cannot establish keyboard behavior, real responsive reflow, screen-reader
semantics, runtime contrast over all dynamic states, performance or functional
regression results. Those checks belong to the implementation gate below.

The Creative Director should return:

- Verdict: **revise / approved for implementation**; approval is not deployment permission.
- Exact document revision/commit reviewed and material amendments by section.
- Accepted concept IDs, desktop/mobile composition revisions, storyboard
  sequence, independently reviewed VI/EN opening copy and selector states.
- Explicit decision about replacements for legacy `design.md` constraints.
- Required real photographs and acceptable fallbacks.
- Any unresolved factual issue, with owner confirmation needed separately.

Do not infer approval from silence, a green build, a draft PR or an assistant's
self-rating. A new reviewer response must identify the **exact reviewed commit**
and visual artifact revision. The current approval record is **pending**.

### Qualitative rejection conditions

Reject the concept even if it is technically feasible when any of these remain:

- The current split layout has only been enlarged/reordered, with no identifiable
  Hoàng Long material, composition or trade-evidence signature.
- Replacing the logo and names would make it an interchangeable supplier/SaaS
  page; luxury ornament or extra animation is used in place of a proposition.
- Tea photographs remain tiny thumbnails, or the four teas cannot be visually
  distinguished and reached through product-aware profile/sample actions.
- Equal card strips, identical section splits or repeated prose flatten the page
  into a template. Heritage retail competes equally with the primary B2B journey.
- The sample/quote action is weak, hidden below a manifesto, lost over a photo,
  or displaced by several equally dominant actions.
- The buyer cannot find packing/trade basis, enquiry responsibility or an obvious
  path from a named tea to a real commercial next step on the first visit.
- A false portrait, generated factory, invented output/specification, unsupported
  client logo or claimed stock substitutes for genuine evidence.
- Desktop looks considered while mobile is a compressed desktop screenshot,
  has clipped type, requires a swipe to discover a flagship tea, or loses the CTA.

## 2. Buyer-decision scenarios — concept and later runtime checks

These are proposed acceptance scenarios, not completed user research or measured
conversion results. Static boards must make the intended paths visible; after
implementation, verify the same paths in the browser without submitting an enquiry.

| Visitor | First-visit question and required visible information | Intended path / success evidence |
| --- | --- | --- |
| Importer | Which teas can I evaluate, what packing/trade basis applies, and who handles the enquiry? | From the opening/proof panel, recognize the four flagship names, 20/30/35kg PP/PE options, EXW factory basis and responsible export-development contact; choose a tea and reach its existing profile and product-aware sample action. No implication that EXW includes freight or that capacity is stock. |
| Manufacturer / beverage chain | Which tea may suit my product/application, and how can I test it? | Find the owner-confirmed sensory distinctions and clearly qualified application guidance. Select Mật/Khói/Mộc/Ngọc Lan, inspect its actual profile, then reach `tradeEnquiryHref(actualCatalogId, 'sample', search, locale)`. Performance/yield is for sample evaluation, not a guaranteed technical result. |
| Distributor | Can I discuss a repeat supply programme and its commercial format? | See the actual range, adjustable bulk packing, order-specific supply confirmation and sample → specification → quotation sequence; reach the existing quote brief and contact without creating an account. No invented MOQ, exclusive territory, wholesale price or commission entitlement. |
| Mobile visitor at 390px | What is this company and what can I do next without hunting? | Understand Vietnamese tea/B2B supply, a concise source/heritage sentence and the primary sample/quote action in the annotated 844px opening. All four product names and their direct profile/sample paths are reachable without hover or a forced horizontal swipe. Retail remains available through named navigation. |

Across all scenarios, the at-a-glance proof panel or visible product-to-RFQ route
must cover **tea identity, applicable use, packing/trade basis, next step and
responsible contact**. It uses existing content and links, never a new homepage
form, an account gate or decorative operational checkmarks. Preserve the actual
catalog IDs and the separation from older OP1/steamed-green export offers.

## 3. Implementation gate — after separate authorization

All rows start **NOT RUN** until implementation is authorized and completed.
“Not applicable” requires a reason. A compilation result cannot satisfy visual,
truthfulness, navigation or accessibility rows.

| ID | Acceptance criterion | Evidence / failure condition |
| --- | --- | --- |
| V01 | First screen identifies Vietnamese tea production/supply and an obvious B2B next step. | 390×844, 768×1024, 1440×1000 screenshots, VI/EN. Buyer must not scroll through a manifesto to find a sample/quote action. |
| V02 | The page is recognizably Hoàng Long, with real place/material, the approved signature devices and four actual tea identities. | Compare with exact approved composition revisions; apply the qualitative rejection conditions above. No invented proof. |
| V03 | Distinct section rhythm: opening, close craft detail, product presentation, industrial ledger, process/contact, retail. | Full-page desktop/mobile captures; fail if the whole page is repeated equal cards or identical splits. |
| V04 | Typography has purposeful scale and readable VI diacritics/EN wrapping. | Actual font-loaded screenshots; no clipped marks, accidental single-letter lines or image-baked copy. |
| V05 | Photographs retain true subject and appropriate resolution; captions identify context accurately. | Asset/provenance review. No generated factory, fake founder portrait, synthetic estate or third-party branded customer proof. |
| V06 | B2B remains dominant; retail accessible without hunting. | Primary hero action + nav + quiet retail entry; no retail pack/wholesale unit confusion. |
| V07 | No repeated capacity/product paragraphs or theatrical empty sections; buyer-decision utility survives the narrative. | Editorial read-through plus all four visitor scenarios; no requirement to finish a long story before a product-aware RFQ route. |
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

## 4. Proposed creative scoring rubric

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

## 5. Future check commands and scope

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

## 6. Future screenshot and navigation evidence

Capture production-mode local screenshots after images/fonts and relevant
lazy-loaded content are ready. Required widths: **390, 768, 1440 CSS pixels**.
Record browser, viewport height, locale, URL, source commit and content state.
Include the opening and **real full page in both VI and EN**, all four selected
product states, default/unselected controls, mobile navigation and a reduced-motion
state. Add actual 320px and 200% zoom checks. Review each language's line breaks
independently; do not call a static board or dev screenshot a production acceptance
result. A production build is required evidence of compilation, not a visual pass.

Suggested later paths: `docs/qa/evidence/hl-001-after/home-{width}-{locale}.png`.
Keep before/after evidence distinct. Capture actual pages, not composited browser
mockups; no customer/private records. Record known image or backend failures
instead of cropping them out. Reset temporary browser viewport settings afterward.

Minimum navigation matrix: home → each core profile → sample/quote; home → catalog;
home → retail/detail; home → company documents/contact; header VI/EN and mobile
menus; footer policies/phone/map; incoming safe campaign tags and partner share
links remain within their existing contracts. No checkout or commission mutation.

## 7. Current concept-phase evidence and limits

| Check | Current status |
| --- | --- |
| Source/route/asset and business-contract audit | Completed with scope/limits in `docs/vision/current-state-audit.md`. |
| Round 1 before screenshots at requested widths | Captured locally; initial viewport only, unchanged UI at the baseline commit. Not design comps. |
| Round 2 static design evidence | 14 annotated compositions exported as PNG + outlined SVG and visually inspected. Two responsive opening directions, four main chapters at both widths, EN opening, comparison and selector states are supplied. A text contrast, selected marker, EN labels and B opening composition were revised after inspection. No runtime pass implied. |
| Redesigned application UI, motion, after screenshots | Not implemented; intentionally not run. |
| Application build/regression/automated accessibility | Not run for this documentation-only phase. No application behavior changed. |
| Document references and changed-file scope | Ten Markdown documents and 99 local references checked; 14 board dimensions, embedded original-photo integrity, static palette contrast and artifact hashes verified. `git diff --check` passed. Application/protected source and prior deployment guard unchanged from f7a19b9. See artifact-verification.json in the visual evidence folder. |
| Production database, merge, deployment | Not authorized. Exact-branch Vercel exclusion prevents automatic preview publishing. |
| Creative Director approval | Round 1 verdict REVISE; round 2 approval pending. Draft PR and static compositions are the review handoff, not approval. |

## 8. Review and release separation

This PR is for reviewing the brief. After approval, implementation is a separate
authorized step with code, check results and visual evidence. Merge and deployment
remain separate decisions. A public preview must not be created in the current
no-deploy phase. Before any future branch publishing, inspect automatic deployment
behavior; do not assume a draft PR suppresses Vercel builds. Preserve the current
exact-branch Vercel exclusion through this concept phase. Its later cleanup or
replacement belongs to a dated decision record: do not remove it automatically,
disable other branches, or silently prevent an explicitly authorized future
preview. Local-only QA remains available without a public deployment.

Review outcome template:

```text
HL-001 / reviewed commit:
Verdict: REVISE or APPROVED FOR IMPLEMENTATION
Creative Director:
Approved documents/revisions:
Approved concept/board IDs and revisions:
1440px/390px compositions reviewed:
768px recomposition decision:
Required changes by section:
Required real assets / accepted fallbacks:
Factual issues needing owner evidence:
Implementation scope authorized:
Merge/deployment authorization: NONE in this review
```
