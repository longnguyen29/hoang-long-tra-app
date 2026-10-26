# HL-001 — Homepage storyboard

**DRAFT v0.1 · 26 October 2026 · Not approved.**

An implementation-ready proposal for creative review, not a rendered mockup.
Read with the [creative direction](creative-direction.md) and
[visual system](visual-system.md). All proposed copy below remains DRAFT.

## Page rhythm

```text
00  Existing navigation — producer identity / clear B2B route / retail access
01  THE OPENING          large image plane + decisive type + trade action
02  SOURCE & CRAFT       human-scale close-up + short editorial passage
03  FOUR TEAS            product plate + selectable named index
04  MANUFACTURING       archival equipment plates + precise supply ledger
05  WORK WITH US         sample-to-order sequence + responsible trade contact
06  HERITAGE COLLECTION quiet retail invitation
07  THE HOUSE           legal identity / factory vs office / policies
```

This is one sequence with changing visual scales. It is not eight identical
rectangles with a title and cards. Keep the journey skimmable; target roughly
7–10 mobile screen lengths as a design budget, not a forced fixed page height.
No artificial full-screen spacers, scroll locks or mandatory chapter completion.

## 00 — Navigation

**Reader's question:** Am I at a producer, and where do I go for business?

Keep House of Hoàng Long wordmark/seal, vi/en switch and existing Company / B2B /
Shop destinations. Desktop may use a home-only dark treatment over the opening,
but text and focus states must retain contrast. Mobile uses a solid surface and
the existing button/menu behavior. Retail must remain directly discoverable.

An optional home header CTA “Mẫu & báo giá” uses the existing wholesale destination;
if it crowds 768px, keep the CTA in the hero instead. Do not change menu logic or
duplicate a form. Header scoping must not restyle checkout, partner or staff UI.

## 01 — The opening: a place, a producer, a next step

**Question:** Why should I spend another minute here?

- Eyebrow: “Sản xuất tại Hà Giang · Cung ứng trà B2B”.
- H1: “Nguồn trà Việt. Dấu ấn Hoàng Long.”
- Supporting copy: use the short draft in creative direction, not another product list.
- Primary: “Trao đổi mẫu & báo giá” → existing `/wholesale` with locale/campaign.
- Secondary: “Xem danh mục cung ứng” → existing `/catalog` with locale/campaign.

**1440px:** a wide, dark opening with a dominant off-centre tree image and large
type on its own readable plane. The portrait source keeps its real proportions;
its edge is an intentional part of the composition. A narrow location caption
grounds the frame. Avoid a generic equal text/image split or centre-aligned poster.

**768px:** image occupies the upper/right visual field; copy and actions have a
stable opaque backing. Do not squeeze the desktop title into a narrow left column.

**390px:** headline, business descriptor and primary action appear in the initial
844px viewport, alongside a meaningful area of the tree photograph. Use a clean
vertical composition if overlay readability fails. No giant title that pushes
both image and action below the fold. Keep all meaningful words as HTML.

**Image:** `/landing/1.jpg`; no age, elevation, plantation ownership or mapped
coordinate claim. No auto-playing video substitute. Initial display is visible
before JavaScript animation. Motion optional, never a prerequisite for reading.

## 02 — Source and craft: from the tree to the leaf

**Question:** What makes this a real tea-making business?

Proposed heading: “Kinh nghiệm làm trà. Tiếp nối từ năm 1995.”
Body draft: “Hoàng Long phát triển từ nền tảng gia đình làm trà. Tại Tân Lập,
Hà Giang, nguồn trà được chế biến và chuẩn bị cho nhu cầu thương mại.”

Pair a deliberately large leaf-handling detail with a short reading column and
one precise caption. This chapter is about the material and the work; it is not
a list of every machine or a fabricated lineage. Show only the actual operations
visible in the photographs. A process description for a particular tea needs a
confirmed source before publishing.

**1440px:** close-up on the left, prose offset lower on the right, generous outer
space and a restrained “1995” marginal marker labelled family experience.
**768px:** wider photo followed by a two-column caption/text arrangement only if
readable. **390px:** photo, caption, short paragraph and one origin/story link.
Keep this chapter shorter than the product chapter.

**Image:** `/landing/2.jpg`. Caption describes leaf handling, not a named maker.
If a real consented producer portrait and biography become available, substitute
an approved person feature; do not invent a quote or use the leaves as a portrait.

**Destination:** `/story` or `/company#overview`, preserving supported locale and
campaign parameters. Confirm one preferred route in creative review.

## 03 — The four core teas: clear distinction, not tiny thumbnails

**Question:** Which tea belongs in my product or supply programme?

Heading draft: “Bốn dòng trà. Bốn dấu ấn hương vị.”

| Choice / canonical ID | Short owner-confirmed distinction | Existing destination |
| --- | --- | --- |
| Hồng Trà Mật / `hong-tra-shan-mat` | Hương mật ong, caramel; vị êm, hương nổi rõ | `/company#product-hong-tra-shan-mat` |
| Hồng Trà Khói / `hong-tra-shan-khoi` | Khói, đậu đen, gỗ; đậm vị | `/company#product-hong-tra-shan-khoi` |
| Xanh Mộc / `luc-tra-shan-moc` | Thanh mát, vị dịu; không chát gắt | `/company#product-luc-tra-shan-moc` |
| Trà Xanh Hoa Ngọc Lan / `luc-tra-ngoc-lan` | Trà xanh với hoa ngọc lan khô thật | `/company#product-luc-tra-ngoc-lan` |

Reuse `CORE_EXPORT_PRODUCTS`, its localized descriptions and four authentic photos.
The table is storyboard content, not a new catalog or authority to change data.
No brewing recipes, treatment claims, unmeasured colour charts or invented grades.

**1440px:** one large product plate with breathing room, beside a four-name
vertical index. All four names are visible. Selecting a name changes the plate,
short description and exact product-profile/sample links. Keep selection stable
until the reader changes it; no auto-cycle. Below, one full-catalog link.

**768px:** index above a wide plate; controls stay large and names wrap naturally.
**390px:** four clearly labelled selection controls in document order, followed
by one photograph, description and profile action. No horizontal swipe needed to
discover the fourth product. Limit photo height to avoid a multi-screen selector.

**Interaction contract:** use buttons with an accessible selected state (or a
complete keyboard-accessible tab pattern), visible focus and touch support.
Do not turn an entire nested card into a link. Nonselected product destinations
remain discoverable as ordinary links in a non-JS fallback. No focus jump or
scroll reset when changing selection. Announce the updated product succinctly.

**Actions:** “Hồ sơ sản phẩm” → exact company anchor; “Trao đổi mẫu” →
`tradeEnquiryHref(actualCatalogId, 'sample', search, locale)`. The same approach
applies to a quote action if included; avoid three competing buttons per product.

## 04 — Manufacturing and supply: evidence with usable numbers

**Question:** Can this company discuss the volume and format I need?

Heading draft: “Chế biến tại Hà Giang. Cung ứng theo yêu cầu.”

**1440px:** an equipment archive spread above/beside a ruled specification ledger.
Use a distinct industrial composition rather than another portrait split.
**768px:** retain photograph context and a two-column ledger if comfortable.
**390px:** intact equipment image, caption, then four readable rows.

Use `/landing/3.jpg` as the existing **two-photo archive collage**; never label it
as a new single-frame factory panorama. If it is insufficient at the planned
size, reduce its display size and preserve detail. Do not upscale it into a
blurred full-bleed background or replace it with a generated factory.

| Ledger field | Draft content / limit |
| --- | --- |
| Nền tảng sản xuất | Nhà máy Trà Hoàng Long · Tân Lập, Hà Giang. Owner-supplied location; not independently verified ownership. |
| Năng lực công bố | 50–100 tấn/tháng, overall planning figure; product mix and available schedule confirmed per order. Put the qualification beside the number. |
| Quy cách lô lớn | Bao PP/PE 20 / 30 / 35 kg, adjustable for leaf form and buyer need. Not retail units or an MOQ guarantee. |
| Điều kiện chào hàng | EXW tại nhà máy. Loading, transport, documentation/testing scope and cost are agreed in quotation/contract. |

The indicative 2–8 week transaction window may appear in an optional compact
detail: transit included in the estimate; unforeseen delays excluded. It is not
a guaranteed dispatch SLA or freight-inclusive EXW price. Never convert capacity
to “stock available,” “annual output” or a per-product guarantee.

**Destination:** `/company#capability`; specifications/quality as a secondary
deep link. No certificate carousel when certificates have not been supplied.

## 05 — Work with Hoàng Long: four decisions and a responsible person

**Question:** What happens if I contact you, and who follows it through?

Heading draft: “Từ mẫu trà đến kế hoạch cung ứng.” Use a compact horizontal
sequence on desktop and a connected vertical list on mobile, with tangible outputs:

1. **Nhu cầu:** product use, destination, planned quantity and timing → a working brief.
2. **Mẫu & đánh giá:** shortlisted teas, reference sample and assessment topics → a selection basis.
3. **Báo giá & xác nhận:** specification, packing, price and responsibilities → quotation/order agreement.
4. **Chuẩn bị & giao nhận:** agreed goods/document/handover milestones → the next supply cycle.

These explain the proposed commercial working process, not completed operational
checkmarks, an existing certification or a promise that every document is available.

An adjoining contact block names Anh Long with the existing approved public
export-development title and 078 229 3579, plus the Hoàng Long office contact.
The block is typography-led until a real portrait is supplied. No invented bio or
change to partner rights. A submitted brief is not an order or confirmed visit.

**Primary destination:** existing wholesale form `#trade-brief`, with product,
intent and tracking preserved when the reader has selected a tea. **Secondary:**
current `/company#documents` downloads / contact details. A factory visit is
arranged through the existing enquiry, not a fictitious calendar.

## 06 — The heritage retail collection

**Question:** Can I buy for myself or as a gift?

Heading draft: “Một phần Hoàng Long, trên bàn trà của bạn.”
One quieter editorial band: real product still, short introduction and
“Khám phá cửa hàng trà” → `/shop` with locale and supported attribution.
No wholesale capacity, EXW price, bulk unit or partner commission in this panel.

**1440px:** smaller off-axis image and an expansive typographic line.
**768/390px:** compact image/line/link. No shopping carousel or second catalog.
Retail remains accessible from navigation without scrolling to this chapter.

## 07 — The House footer

Legal company name/tax ID, factory location distinguished from Hà Nội
office/warehouse, house phone/Zalo, company documents, retail and policy links.
Use existing public sources and map helper; never shorten an address into a
misleading factory pin. Keep contact text/selectable links readable on 390px.
No animated marquee, fake customer logos, additional application or tracking pixel.

## State and fallback requirements

Real image unavailable → intentional text composition with accurate caption or
omit the visual; no broken image or fake factory placeholder on a release.
Managed producer info unavailable → leave out named-person biography/portrait,
retain actual trade contact. Existing Supabase media read fails → local authorized
photo fallback and working links. No new service or blocking request before CTA.

VI and EN get independent line-break review; do not force manual breaks that cut
Vietnamese diacritics or make English labels overflow. Reduced motion keeps the
same information, order and functionality. Final composition must be reviewed
at 390, 768 and 1440px before implementation can be called complete.
