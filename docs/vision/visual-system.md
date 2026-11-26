# HL-001 — Signature visual system, round 2

**DRAFT v0.2 · 26 October 2026 · Not approved. No application styling changed.**

> **REJECTED / HISTORICAL — NOT IMPLEMENTATION AUTHORITY.** Concepts A/B/C are
> NOT APPROVED; Working Tea Atlas is retired. Recommendations and review requests
> below describe the rejected round, not the current plan. Await the Creative
> Director's replacement reference; see the [current decision](decisions/hl-001-awaiting-creative-reference.md).

R4 response. Read the [visual plates](concepts/round-2/README.md) and
[composition specification](homepage-storyboard.md). The recommendation is B,
Working Tea Atlas; A/C are alternatives, not extra themes to mix indiscriminately.

## A recognisable system without relying on the logo

The system is the relationship between real tea material and the buyer's field
sheet. The three devices below must work as a composition, not ornamental icons.
Do not claim global originality; the goal is a specific, recognizable Hoàng Long
expression that cannot be reproduced by swapping a generic supplier's headline.

### 1. The four-material register

A continuous strip of four **actual catalog photographs**, cropped to dry-leaf
texture, with real names attached to each image edge: Mật / Khói / Mộc / Ngọc Lan.
It first appears as the opening's lower boundary, then expands into the four-tea
selector. This visual refrain belongs to these four tea lines, rather than a row
of interchangeable feature cards. No duplicate invented leaf textures or rendered
liquor colours. Do not call the crop a microscope image or an export-grade sample.

Desktop opening: four contiguous 360px-wide segments, each 114px high including
the name edge. Product chapter: 338×164 photo segments plus 32px name controls;
selected photograph expands to 536×408. Mobile opening: four 97.5×70 segments;
product chapter switches to four 44px controls and one 346×282 actual photograph.
The small opening strip is navigation/material context; it does **not** replace
large product photography further down. See [product plate](concepts/round-2/b-four-teas-1440.png).

### 2. The material seam

Change scale from tree → handled leaf → four dry teas through an aligned physical
image edge. The craft photograph meets a narrow oxidised-copper margin and an
offset serif passage; the selected product plate meets a lighter material margin
before the buyer fields. The device is a spatial cut, not a fake historic motif,
an illustrated dragon or a decorative tracing line on a production photo.

The layout can interrupt a conventional grid. In the opening a full-width title leads a three-scale photo spread and the buyer
sheet crosses its last frame's foot; in craft, the photo reaches the left edge; in
products, the horizontal register opens into a larger detail. These transitions
can be entirely static. No animation pretending that a pictured leaf became the
specific offered lot, and no pinned scroll sequence. See [craft plate](concepts/round-2/b-craft-1440.png).

### 3. The buyer field sheet

An attached information plane uses the same rhythm everywhere: **identity → basis
→ qualification → next action**. In the hero it names PP/PE, EXW and the contact;
in product selection it attaches notes/trial purpose, bulk formats and a direct
sample link; in manufacturing it distinguishes declared total capacity from
order-confirmed availability. These are functional evidence distinctions, not
certification badges or fake live-system statuses.

Use plain language: “Năng lực công bố,” “Xác nhận theo mẫu / đơn hàng,” “Điều kiện
chào hàng.” No green checkmark suggesting an audit, invented lot number, stock
counter, origin map coordinates or illustrated laboratory chart. EXW refers to
the relevant export offer; domestic terms and retail shipping remain their own
existing flows. See [industrial plate](concepts/round-2/b-industrial-1440.png).

## Proposed home-only palette

| Token candidate | Static comp value | Meaning |
| --- | --- | --- |
| `--home-mineral` | `#172D38` | Mineral-blue industrial reading plane and ink. A purposeful departure from the old jade field. |
| `--home-chalk` | `#EFF2EA` | Neutral light product/reading field; distinct from the old warm cream. |
| `--home-leaf` | `#DBE7A5` | Restrained high-contrast sample action/material edge. Do not turn the site into neon-green tech UI. |
| `--home-seam` | `#A34B36` | Oxidised-copper craft margin and review marks; not default small text on dark. |
| `--home-muted` | `#B9CCC7` | Supporting light text on mineral. |
| `--home-pale` | `#D8E1DD` | Unselected product-control surface on chalk. |

The material register, spatial cuts and buyer fields must still distinguish the
page in greyscale. Palette alone is insufficient. Dark/light text contrast is
measured for static candidates in the artifact verification report; full runtime,
image crop, hover/focus and zoom accessibility remain later checks. Rust numeric
pins/annotation strips are review markup outside or on the static plate, not
proposed interactive controls.

## Typography — deliberate change, scoped to home

**Be Vietnam Pro** (regular/bold) provides the confident Vietnamese display and
usable commercial copy; **Noto Serif** gives craft passages a different cadence.
This is an intentional alternative to keeping Newsreader/Inter Tight and merely
increasing their size. Preserve the actual House wordmark/seal as brand artwork;
the typographic brand labels in these static studies are not a replacement logo.

Official font sources: [Be Vietnam Pro](https://github.com/google/fonts/tree/main/ofl/bevietnampro),
[Noto Serif](https://github.com/google/fonts/tree/main/ofl/notoserif). Static SVGs
outline text for faithful review without installing fonts; no font is added to
production or the project's dependency set in this phase.

| Role | 1440 static setting | 390 static setting | 768 proposal |
| --- | --- | --- | --- |
| Atlas opening | Be Vietnam Pro bold 77px; EN 83px, independent two-line setting | Producer phrase 44px; market phrase 35px / EN39px | 52–64px with deliberate reflow |
| Craft title | Noto Serif 62px | 32px | 40–48px |
| Product title | Be Vietnam Pro bold 56px chapter / 40px product | 33px chapter / 25px product | 38–46px chapter |
| Opening support | 18px | 16px | 17–18px |
| Primary action | 16px bold, 58px target | 16px bold, 52px target | ≥48px target |
| Caption / evidence label | 11–14px | 10–13px; supporting facts larger | 12–14px |

Some archive/review captions are small in the static plate; final accessibility
review may require increasing them. Never shrink text to preserve a screenshot's
fold. The headline's diacritics must remain intact. Do not force English into
Vietnamese line breaks or replace functional labels with cryptic abbreviations.

## Product selector appearance and behavior

[Default, changed and mobile states](concepts/round-2/selector-states.png).

- Default: Mật active. Ink-filled name edge/control, contrasting text and a
  selected dot/name. Other controls use pale fill; all four names stay visible.
- Changed: Khói active. Photo, full name, confirmed notes, trial purpose and exact
  sample destination update together. No automatic cycling or hover-only change.
- Mobile-selected: Ngọc Lan active in a two-row control group, then one large
  photograph and the same buyer fields. No horizontally hidden fourth tea.
- Keyboard focus is **separate** from selection: proposed visible double outline
  or outline with offset. Use buttons with an explicit selected state or a fully
  implemented accessible tabs pattern; the static board does not prove behavior.
- Future no-JS fallback retains ordinary product/profile/sample links. No new form,
  CRM entity, catalog mapping or unapproved change to attribution.

## Exact precedence after a later approval

1. Current user authorization and the dated phase record determine what may be
   built or published. This concept phase still authorizes neither.
2. After a Creative Director approves an exact revision/comp set, its **home-scoped**
   layout, typography, palette and interaction decisions supersede corresponding
   legacy design.md constraints **for that authorized homepage scope only**.
3. Record explicitly that the approved home may replace Split Studio's family,
   Newsreader/Inter Tight page typography, jade/paper sequencing and the ≤8px reveal
   cap where the approved design specifies a different treatment. An old style
   stamp must not silently veto that approved direction.
4. Implement later via a home root class/data attribute and `--home-*` variables;
   CSS module selectors stay within that root. Do not globally redefine `:root`,
   body, h1, shared form/button classes or operations semantics.
5. A header visual variant, if approved, must be opt-in for home and preserve its
   default appearance/behavior elsewhere. Keep actual brand artwork and all
   destinations, locale, focus and campaign/referral contracts.
6. Unrelated public pages, retail/partner tasks and staff operations retain their
   existing system until separately authorized. Do not “fix” protected business
   workflows as part of an art-direction rollout.

## Motion, access and cost

The signatures work without movement. A later optional hero settle must not hide
initial copy or block the CTA. A selected product may crossfade over 180–240ms;
reduced motion changes immediately. Any displacement, including a proposed 8–12px
chapter arrival, needs approval and can be removed without losing meaning.
No scroll-jacking, autoplay selector, forced pinning, fake smooth-scroll layer,
ambient sound, cursor gimmick, animated certificate or synthetic factory film.

Use ordinary React/CSS and responsive real images after authorization; no new
animation dependency is assumed. Budget and measure font/image payload rather
than claiming performance from static PNGs. Future acceptance still requires
WCAG 2.2 AA applicable contrast/semantics, visible focus, touch targets, native
zoom, reduced motion and source/route regressions. Static designs cannot establish
LCP, CLS, INP, keyboard behavior or working enquiry submission.
