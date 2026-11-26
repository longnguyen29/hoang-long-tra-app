# HL-001 — Visual storyboard, round 2

**DRAFT v0.2 · 26 October 2026 · Static proposals; not implemented or approved.**

> **REJECTED / HISTORICAL — NOT IMPLEMENTATION AUTHORITY.** Concepts A/B/C are
> NOT APPROVED; Working Tea Atlas is retired. Recommendations and review requests
> below describe the rejected round, not the current plan. Await the Creative
> Director's replacement reference; see the [current decision](decisions/hl-001-awaiting-creative-reference.md).

Responds to R3/R6. [Review board index](concepts/round-2/README.md) and
[three-concept comparison](concepts/round-2/concept-comparison.png).
Numbers in rust circles and the white strips outside each viewport are review
annotations, not proposed website UI. Do not mistake these for runtime screenshots.

## Selected recommendation: B — Working Tea Atlas

The opening is a producer/market-partner proposition; the material register then
connects tree/craft to actual product and its buying information. The sequence is:
**opening + buyer field → craft → four-tea selection → industrial evidence →
sample-to-order steps/contact → supporting retail collection → House footer**.
The four large compositions below govern this proposal, rather than a generic
written instruction to “make it cinematic.”

## 1. Opening — material and utility in the same first view

[VI 1440](concepts/round-2/b-opening-1440.png) · [VI 390](concepts/round-2/b-opening-390.png) ·
[EN 1440](concepts/round-2/b-opening-en-1440.png) · [EN 390](concepts/round-2/b-opening-en-390.png).

**1440×930 UI area:** a typographic cover above a three-scale photographic spread,
rather than the old left-copy/right-tree split. Mineral-blue plane; bold headline
baselines y210/298 across the available width. Support at x56/y340, primary sample
CTA x1018/y324/w370/h58. Three **distinct archive frames** occupy y418–758: tree
x52/w400, leaf handling x452/w386, dry Mật leaf x838/w550. The contact/supply field
crosses the last photograph's foot at x972/y644/w416/h114. This is an editorial
juxtaposition, not a claim that the pictures document the same lot or operation.

Each frame has a truthful archive/catalog caption. The processing-location label
is company context, not a new tree geolocation. The four-tea register at y816–930
connects the opening to the range. Photographs plus register occupy about 46% of
the UI canvas before caption/contact overlays. The buyer field names PP/PE
20/30/35kg, EXW Tân Lập and the current export-development contact; no claimed
stock, total capacity or certificate is inserted into the hero.

**390×844 UI area:** navigation 0–64; tree at x214/y64/w176/h256. The producer
phrase sits beside it; the market phrase is recomposed below at y364/405, not a
scaled desktop column. Support begins y466. The primary trade action is x22/y542/
w346/h52; secondary range entry at y626; supply basis at y675; contact at y707/733;
four-material register at y774–844. The first view includes an actual photograph,
a usable trade action, supply basis, contact and all four abbreviated tea names.
Archive caption stays on a solid background; text is not laid across tree detail.

**Explicit static fold check:** CTA bottom 594 < 844; contact baseline 733 < 844;
register bottom 844 = fold. There is a 250px margin between CTA bottom and fold.
This is geometry in a static 390×844 composition, not proof of browser zoom,
font reflow or smaller phones. At 320px/200% zoom, later implementation must allow
content to grow and scroll; it must not shrink text to force this fold result.

**768 recomposition:** headline 52–64px above a two-frame tree/handling spread;
move the selected dry-tea photograph into the material register if the third
frame would become small. Buyer field becomes a full-width row below the
photographic spread, and the sample action stays beside or just below the support.
Do not shrink the 1440 spread into three tiny pictures. On smaller tablets use
the mobile tree/producer composition followed by the market phrase. This is a
recomposition specification, not a claim that a 768px runtime was tested.

**Clicks:** hero action → existing wholesale brief with locale/campaign;
range entry → the same-page four-tea chapter; material names → exact product
profile or the selected product surface, as approved. Shared navigation retains
Company/B2B/Shop grouping, destinations, keyboard handling and mobile menu. The
compact labels drawn in the static header are an IA study, not permission to
remove existing submenu destinations or change tracking.

## 2. Craft — the material seam, not another hero split

[1440](concepts/round-2/b-craft-1440.png) · [390](concepts/round-2/b-craft-390.png).

**1440×850:** the real leaf-handling photograph runs flush left x0/y0/w640/h734.
A 70px oxidised-copper seam marks the boundary to an offset serif passage. Heading
at x774/y203, body around y423/544. This is a close material view against the
opening's tree-scale view; it changes scale and pace, not just background colour.
A literal photograph caption closes the plate. Family experience since 1995 is
separate text, never a timestamp or named identity inferred from the image.

**390×950:** heading precedes a 300×453 close crop; the remaining 90px carries a
quiet “Lá trà / Ảnh tư liệu” margin. Caption and short passage follow. The photograph
occupies ~37% of the chapter area. A real named-maker photograph is not available;
this is not used as a portrait. The next chapter transitions from handled leaf
to the four dry-leaf images through the same material edge.

**768:** a full-width handling image with a narrow caption margin, followed by a
reading block; no squeezed 50/50 reading column. Crop preserves hand and material,
not just anonymous green texture. **Click:** existing `/story` with supported
locale/campaign handling; company overview remains available from the header.

## 3. Four teas — material register and a buyer field sheet

[1440](concepts/round-2/b-four-teas-1440.png) · [390](concepts/round-2/b-four-teas-390.png) ·
[default/changed/mobile states](concepts/round-2/selector-states.png).

**1440×900:** the four original photographs join into an uninterrupted strip
x52/y184/w1352/h164. Full product names at the lower edge are controls, not four
separate cards. Selected Mật gets an ink label; remaining names keep a neutral
surface. Selected photo x52/y385/w536/h408 is large enough to see actual leaf form.
A slim material seam connects it to the buyer field sheet, beginning x684/y432.
Notes → trial application → PP/PE formats → EXW/order qualifier → exact sample link.
The four-image strip plus selected plate occupy ~34% of the chapter canvas.

**390×1060:** four named controls in two rows (44px targets), then a 346×282 selected
photo. Product name, notes and trial purpose follow, then packing/EXW and the
sample CTA. It is a deliberately taller chapter, not an attempt to fit every
product decision into one initial screen. All names remain visible without
swiping. The sample action is never hover-only.

**768:** four names in a 2×2 row group above one large image; buyer fields below.
Do not render four narrow tiny-photo cards or add an auto-advancing carousel.
**State behavior:** selected name/photo/notes/destination change together; one
persistent selected control, separate visible keyboard focus, no scroll reset.
Static plates show Mật default, Khói changed and Ngọc Lan mobile-selected states.
Full implementation behavior and non-JS links still need later verification.

**Applications:** “Đánh giá mẫu cho…” denotes a buyer trial purpose. It is not
measured extraction performance. Owner-confirmed Mật beverage suitability can be
stated; other application fit is assessed against the customer's sample/brief.

| Full name / real catalog ID | Sample destination, before locale/UTM helper | Profile destination |
| --- | --- | --- |
| Hồng Trà Mật / `hong-tra-shan-mat` | `/wholesale?tea=hong-tra-shan-mat&intent=sample#trade-brief` | `/company#product-hong-tra-shan-mat` |
| Hồng Trà Khói / `hong-tra-shan-khoi` | `/wholesale?tea=hong-tra-shan-khoi&intent=sample#trade-brief` | `/company#product-hong-tra-shan-khoi` |
| Xanh Mộc / `luc-tra-shan-moc` | `/wholesale?tea=luc-tra-shan-moc&intent=sample#trade-brief` | `/company#product-luc-tra-shan-moc` |
| Trà Xanh Hoa Ngọc Lan / `luc-tra-ngoc-lan` | `/wholesale?tea=luc-tra-ngoc-lan&intent=sample#trade-brief` | `/company#product-luc-tra-ngoc-lan` |

Implementation must call `tradeEnquiryHref(actualId, 'sample', search, locale)`;
the table is not an alternative hand-built URL/attribution implementation. Quotes
use the same helper with `quote`. Older export-offer IDs/prices remain separate.

## 4. Industrial evidence — an archive view with qualified commercial fields

[1440](concepts/round-2/b-industrial-1440.png) · [390](concepts/round-2/b-industrial-390.png).

**1440×900:** headline/prose on a mineral canvas; the **complete square equipment
collage** occupies x826/y48/w560/h560. No image is stretched into a fabricated
panorama. The lower third is a three-field evidence ledger: declared total
capacity and qualifier; PP/PE sizes and flexibility; EXW location and responsibilities.
Its image area is ~24% of the canvas; the remaining space is intentionally useful
trade information, not decorative factory statistics.

**390×1110:** intact 346×346 collage followed by the same three fields. Capacity
“50–100 tấn/tháng” sits immediately beside/before “Tổng năng lực dự kiến; xác nhận
theo từng đơn.” It is not availability, audited throughput or per-SKU stock.
The EXW field does not include shipping by implication. Contact remains reachable
through the same commercial route. **768:** image and heading stack above a
three-row ledger; never compress to unreadable three-column numbers.

**Clicks:** company capability/technical sections and existing trade brief.
If the optional 2–8 week estimate is shown elsewhere, qualify transit included in
the estimate and unforeseen delay excluded; never turn it into guaranteed dispatch
or freight-inclusive EXW pricing. No certificate or lab badge without evidence.

## Following chapters, kept lean

**Sample → evaluation → quotation/order → preparation/handover** appears as a
compact decision sequence with outputs, not “completed” operational checkmarks.
An adjoining typography-led contact names Anh Long using the current public
export-development remit and number, plus the House office channel. No new access,
signing authority or commission relationship is created. The existing company
PDFs remain deeper resources; no new enquiry form or visit-booking system.

**Heritage retail collection:** one smaller real-product invitation to `/shop`;
no wholesale price, kg packing or partner commission in this panel. Retail stays
accessible from navigation. **Footer:** existing legal identity, factory versus
Hà Nội office/warehouse distinction, contact/map and policy destinations.

These supporting chapters have not received high-fidelity full-page compositions
in this round. They must receive creative detail review before implementation
sign-off if the Creative Director requires a complete page rather than chapter
approval. The four mandated primary chapters and alternative opening are rendered.

## Alternative opening and transition limits

[A desktop](concepts/round-2/a-opening-1440.png) / [A mobile](concepts/round-2/a-opening-390.png)
show a genuinely different book-spread opening. Mobile CTA y710–762 remains inside
844px, but contact/product utility is weaker than B. That is the explicit tradeoff,
not an approved second homepage. C is shown as a comparison study only.

Motion is a later behavior layer, not evidence in a static composition. Preserve
native scrolling; show content immediately; a selected-product transition may
crossfade content, and the material strip may connect chapters without animated
morphing. No scroll-jacking, forced pinning, fake film, synthetic proof or web app
redesign code is included in this revision.
