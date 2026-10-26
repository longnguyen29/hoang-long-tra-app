# HL-001 — Visual system proposal

**DRAFT v0.1 · 26 October 2026 · Not approved. No tokens or UI changed.**

This proposes a more expressive public website, starting with home. It is allowed
to challenge the old `design.md` composition; it does not apply a new theme to the
staff console, checkout or partner operations. See the [storyboard](homepage-storyboard.md).

## Visual thesis

**A photographic tea monograph with the precision of a manufacturer's dossier.**
The tree, leaf, hand and equipment create presence. Typography carries the story;
captions and measured data establish a commercial footing. Distinction comes
from scale, framing and sequence, not from adding more components.

Use three recurring visual devices: a small place/process caption; an oversized
editorial title; a fine ruled ledger for concrete information. They may recur,
but adjacent chapters must not share the same layout. Avoid a uniform card grid,
decorative badges, glass panels, pill-heavy labels and template icon rows.

## Proposed palette and scope

Keep a recognizable connection to the House's paper/jade identity. Move the
opening and manufacturing chapter toward a deeper photographic ink; alternate
with spacious warm paper for products and reading. A small oxidised-brass accent
can mark a current selection or a marginal number, not every border and heading.

| Proposed semantic role | Draft value / source | Intended use |
| --- | --- | --- |
| Home paper | Existing `--color-paper` (`oklch(96% 0.012 82)`) | Reading/product canvas. |
| Home ink | `oklch(20% 0.020 155)` | Deep opening/industrial plane and dark text. |
| Home paper secondary | Existing `--color-paper-2` | Quiet transition/retail plane. |
| Home brass | Existing `--color-accent` (`oklch(52% 0.115 72)`) | Nonessential selection accent; not assumed accessible for small text. |
| Home text muted | Existing ink-2 on paper; paper-2 on ink | Supporting information, subject to measured contrast. |
| Focus | Existing `--color-focus` | Clearly visible keyboard indication on both light/dark backgrounds; adjust home-specific treatment if contrast fails. |

Values are candidates, not a passed contrast audit. In implementation, declare
home-scoped variables consuming shared tokens where possible. Do not redefine
`:root` or change staff semantic danger/success colours for a marketing effect.
Provide solid backing for text over photographs; do not trust one gradient to
work across every crop. Colour never substitutes for selected/error state labels.

## Typography: change the scale and composition before changing the brand

Recommend **Newsreader** as the editorial face and **Inter Tight** for functional
copy initially: both already load and support the site's Vietnamese/English
content. The familiar faces can behave very differently at editorial scale.
Do not introduce a new Latin-only luxury font or a third display family solely
to signal an upgrade. Preserve the existing seal/brand typography in its remit.

| Role | 1440px proposal | 768px proposal | 390px proposal |
| --- | --- | --- | --- |
| Hero display | 96–120px; 0.98–1.08 line height | 64–80px; avoid narrow split column | 42–48px, about 3 lines when copy permits |
| Chapter title | 56–72px | 44–56px | 32–40px |
| Reading text | 18–20px, 1.55–1.65 line height | 18px | 16–18px, 1.55–1.65 |
| Labels/captions | 12–14px, enough contrast | 12–14px | 12–14px; facts/qualifiers can use body size |
| Actions/navigation | 14–16px with usable hit area | 14–16px | 16px with ≥44px target |

These are ranges to test, not fixed inline values. Let Vietnamese diacritics
breathe; display leading must not clip marks or descenders. Use restrained
tracking, no forced all-caps paragraphs or letter-by-letter animation. Roman
headlines, legible weight, and meaningful line breaks carry emphasis. Body text
stays near 55–65 characters per line. Functional numbers keep units beside them.

## Layout and spacing

At 1440px, use a flexible 12-column editorial grid with about 48–72px outer
gutters; text and pictures can occupy unequal spans and offset vertically.
Do not align every section to an identical 50/50 split. A wide image can interrupt
the grid, followed by a compact ledger. Content is allowed to be asymmetrical,
not accidentally unbalanced.

At 768px, recompose deliberately: avoid shrinking a large desktop spread until
its text becomes a tall narrow column. At 390px use 20–24px reading gutters,
occasional edge-to-edge images, and 56–80px chapter breathing room where it serves
the story. Preserve source order, reading order and meaningful captions.

Use the existing named spacing scale for common gaps. Add home-scoped semantic
sizes if needed after approval. Never hide horizontal overflow to conceal an
oversized button, image or heading. Long labels wrap naturally; interactive
targets retain enough vertical room. No fixed height that crops content at 200% zoom.

## Photography and art direction

| Subject | Desired shot | Available first-edition choice / limitation |
| --- | --- | --- |
| Origin | Contextual landscape with real tea trees, human scale and accurate location | Portrait `/landing/1.jpg`, composed honestly within a wider canvas. Do not synthesize new surroundings. |
| Craft | Hands performing a confirmed operation; texture before machinery abstraction | `/landing/2.jpg`, literal leaf-handling caption. No fabricated worker identity or technique. |
| Manufacturing | Real operating line, medium/wide views and detail with dates/context | `/landing/3.jpg` is an archive collage. Keep that identity and resolution visible. New real photos are desirable. |
| Products | Consistent light, leaf form and a reference scale, still showing the actual tea | Existing four catalog photos, uneven quality; crop/layout consistently without changing leaf colour or form. |
| People | Named maker and export contact at work, with role and publication permission | No newly verified portrait available; typography-led contact and process detail instead. |
| Supply | Actual bulk packing, lot label, loading and evidence context | No suitable photo yet. Use accurate specification typography, not a fake loading scene. |

Each future commissioned asset needs file provenance, permission, subject, place,
date and a truthful caption; remove unnecessary metadata before public delivery.
Use photo-specific focal points at all three widths. Avoid faces hidden behind
navigation, ambiguous machine crops, text baked into images, faux film grain,
dramatic filters that change tea appearance or an unlabelled stock photograph.

Public heritage must emerge from real materials and confirmed history. Do not
add generic ethnic patterns, unverified regional dress or ceremonial imagery as
shortcuts to “Vietnamese.” Do not present AI scenes as documentary evidence.

## Interaction and motion

The default is a fully readable page with native scroll. Sophistication means
well-controlled states and continuity, not an animation library.

| Interaction | Proposed behavior | Touch, keyboard and reduced-motion fallback |
| --- | --- | --- |
| Entry | Optional single 400–600ms image/text settle after content is already visible | No loader. Reduced motion is immediate; no opacity-zero dependency. |
| Chapter arrival | At most one restrained opacity/8–12px reveal per chapter | No replay on every scroll. Static with reduced motion or JS unavailable. |
| Tea selector | 180–240ms opacity transition; name, copy, image and destination update as one selection | Four labelled controls, visible state/focus, no auto-advance, no scroll jump. Reduced motion changes immediately. |
| Image hover | Very subtle crop emphasis on capable pointers only | No information or CTA exists only on hover; no motion required on touch. |
| Header/menu | Preserve existing open/close, outside click and Escape focus behavior | Explicit tap controls and visible focus; no hover-only menus. |
| CTA | Immediate focus/active feedback, restrained underline/colour state | No cursor magnet, follower, bounce, or animated obstacle. |

The 8–12px proposal intentionally relaxes the old system's 8px cap; the Creative
Director must approve it before code. There is no requirement to use the maximum.
No scroll-jacking, fake smooth-scroll layer, forced pinning, full-page snap, audio,
autoplay carousel or WebGL background. A user-controlled real video could be a
later edition after genuine footage, captions and a performance review exist.

## Performance and accessibility budgets to validate later

Start with static responsive images, correct dimensions and priority only for the
actual LCP image. Proposed mobile hero transfer target ≤350KB; initial editorial
image transfer target ≤700KB, excluding later lazy-loaded chapters. These are
implementation budgets, not measured results. No new animation dependency planned;
target no more than 25KB compressed additional homepage JavaScript.

Aim for WCAG 2.2 AA: 4.5:1 ordinary text, 3:1 large text and applicable UI visual
boundaries; visible focus, useful alt text, no colour-only state. Use ≥44px touch
targets as a project usability target. Respect reduced motion and browser zoom.
Measure, do not stamp “pass” into a CSS comment.

Later local performance checks should compare the same device/network conditions
with baseline. LCP ≤2.5s, CLS ≤0.1 and INP ≤200ms are desired field targets; local
audits cannot establish production p75 field performance. Report the conditions
and observed results, and investigate regressions rather than inventing a score.

## Apply across the website in controlled slices

| Later slice | Adapt the visual language | Preserve |
| --- | --- | --- |
| HL-001 home | Largest image/type contrast and narrative rhythm | Existing flows, IDs, navigation and attribution. |
| Company and trade catalog, if separately authorized | Dossier-like readable product/specification layouts and clearer evidence | Four core profiles, broader catalog, PDF paths and commercial distinctions. |
| B2B enquiry/campaign pages, if separately authorized | Calm commercial form hierarchy; shorter story | Focused intake, validation/consent and campaign attribution. |
| Retail, if separately authorized | Material-focused photography and product character at a smaller scale | Package choices, accurate units, prices, stock, benefits and checkout. |
| Staff/partner operations | No theatrical marketing reskin proposed | Task clarity, state semantics, permissions and financial integrity. |

Do not standardize the whole app into one giant cinematic layout. A coherent
brand can support an immersive homepage and a highly practical order screen.
