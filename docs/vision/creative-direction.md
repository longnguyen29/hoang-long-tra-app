# HL-001 — Creative direction

**DRAFT v0.1 · 26 October 2026 · Not approved by the Creative Director.**

Prepared for ChatGPT's creative review. This is a proposal, not an implementation
instruction or a claim that the current website meets these standards.

Read with the [audit](current-state-audit.md), [storyboard](homepage-storyboard.md),
[visual system](visual-system.md) and [acceptance criteria](../qa/visual-acceptance.md).

## Recommended idea: A Vietnamese tea house, at manufacturing scale

The homepage should make an unfamiliar buyer feel two things at once: there are
real people and a real place behind this tea; there is a practical way to source
it for a business. Heritage gives the tea identity. Product, manufacturing and
commercial detail give a buyer a reason to continue.

The creative spine is **source → hands → leaf character → supply relationship**.
Show a leaf before a claim, an actual operation before a capability statement,
and an explicit commercial next step before a sales slogan. The visual ambition
is an international editorial tea brand; the content remains Hoàng Long's own
scale and evidence. “World-class” describes the quality bar for this project,
not proposed homepage copy.

## Audience and commercial hierarchy

| Priority | Reader's first questions | What the home must make easy |
| --- | --- | --- |
| Primary | Importer, distributor, F&B procurement: what tea, what difference, what supply basis, who handles my brief? | Discover four core teas; see credible supply facts; request samples/quotation. |
| Supporting | Trade-promotion body or senior commercial contact: who is this company and how can a meeting become a concrete programme? | Open company profile and dated documents; contact the export-development lead. No government-endorsement implication. |
| Secondary | Specialist tea drinker, gift buyer, existing retail customer | Recognize the heritage collection and enter the familiar retail shop without being forced through a B2B form. |

Do not turn the homepage into the company PDF, a retail product grid, an affiliate
recruitment page or a narrated tour of internal software. Keep operational depth
in the app and due-diligence detail in the company/product pages.

## The experience to pursue

**Presence:** one decisive photographic opening, a large well-set Vietnamese
headline and a plainly visible B2B action. No introductory animation or loading
gate. The first screen must identify Vietnamese tea supply without making the
reader decipher a poetic metaphor.

**Texture:** tree bark, leaf, human handling and actual processing equipment.
Use the physical material itself; do not add generic paper noise, gold foil,
floating leaves, dragon illustrations or mock certificate seals to manufacture
heritage. Preserve the existing wordmark/seal rather than inventing another logo.

**Rhythm:** open landscape feeling → close human/process detail → product
selection → measured industrial information → trade steps → quiet retail
invitation. At least four visibly different compositions, with recurring type,
caption and rule systems making them one website. Large images do not excuse
an endless page or repeated copy.

**Confidence:** specific nouns, actual units, restrained qualifications. A data
ledger can be more persuasive than an inflated metric wall. State total declared
capacity with its order-specific limitation next to the number. Do not put a
disclaimer several screens away from the claim it qualifies.

**Interaction:** a precise product selector, understandable navigation and an
elegant transition from editorial material to a real brief. Native scrolling,
ordinary links and a touch-first fallback are essential parts of the design.

## Story and copy direction

Vietnamese is the first editorial language; English should read as professionally
written trade communication, not a literal word-by-word translation. Use visible
HTML copy and the existing locale mechanism. Product names keep their identity.

Proposed first-screen copy, for review:

> SẢN XUẤT TẠI HÀ GIANG · CUNG ỨNG TRÀ B2B
>
> Nguồn trà Việt. Dấu ấn Hoàng Long.
>
> Từ nền tảng gia đình làm trà từ năm 1995, Hoàng Long phát triển bốn dòng trà
> chủ lực cho nhà nhập khẩu, nhà phân phối và doanh nghiệp đồ uống.
>
> **Trao đổi mẫu & báo giá** · Xem danh mục cung ứng

English draft: “Vietnamese origins. Hoàng Long character.” Supporting copy:
“Built on family tea-making experience since 1995, Hoàng Long offers four core
tea selections for importers, distributors and beverage businesses.”

The headline is brand language, not proof of a unique cultivar or exclusive origin.
The supporting sentence supplies the business meaning. No “leading supplier,”
“world's finest,” “internationally certified,” “government-level partner,”
“thực chất,” or appeals to a customer's supposedly superior status.

Each later section owns a different message:

- **Origin:** family experience and Hà Giang; no imaginary founder journey.
- **Craft:** what the actual photographs show; do not infer a full manufacturing
  method, machine origin or a production step for every SKU from an image.
- **Products:** Mật, Khói, Mộc, Ngọc Lan; owner-confirmed distinctions, not invented
  cupping scores, organ benefits or laboratory specifications.
- **Supply:** location, overall declared capacity, bulk packing and EXW basis.
- **Trade:** outputs of sample evaluation, specification and quotation discussions.
- **People:** actual roles and available contact details; a named portrait is conditional.
- **Retail:** an intentional small invitation to tea for home and gifting, with
  separate packs and prices.

## Real images determine the first version

The best long-term opening is commissioned documentary photography: a landscape
wide enough to retain context, a worker doing a specific identifiable task, and
one real operating factory view. These are an art-direction brief, not available
assets or permission to simulate them.

For the first implementation, design an effective still-image edition using
existing authorized archive photos. The portrait tree photo may occupy a large
off-centre image plane within a dark, wide canvas; do not stretch it or fake a
landscape beyond its edges. A leaf-handling close-up can connect tree to product.
The equipment collage belongs in the manufacturing chapter, clearly presented as
archival plates. No generated workers, factory films, containers or estates.

If a desired chapter lacks evidence, use concise truthful text and available
material, or omit the claim. Do not publish empty stock-style placeholders on a
finished homepage; an internal storyboard can mark exactly what is missing.

## Navigation and conversion proposal

Retain the existing route tree and the shared header's accessible grouping.
Propose a stronger B2B action on home; do not add another nested menu level.
The first view offers one dominant sample/quote action and one catalog link.
Company profile remains easy to find in navigation and a later evidence chapter.
Retail remains a named top-level menu and its own visual invitation lower down.

Product selections use canonical catalog IDs and existing company anchors.
Sample/quote actions use the existing helper and form. No account creation is
required just to understand the company or send a normal trade enquiry.

Preserve campaign/referral handling, privacy choices and existing tracking
constraints. An editorial link must never transfer a commission relationship or
silently opt someone into marketing. There is no new homepage database schema.

## Primary-source study and limits

Reviewed 26 October 2026. These observations come from official page content and
information architecture. They are not a pixel, animation or performance audit.
The proposed cinematic layout is our recommendation, not a claim that these
sites use the same interaction or composition.

| Reference | Observed useful pattern | Adaptation for Hoàng Long / boundary |
| --- | --- | --- |
| [Dilmah](https://www.dilmahtea.com/) | Gives family/brand story a prominent role, then separates tea, hospitality, experience and corporate/business information. | Give Hoàng Long one narrative spine and clear commercial worlds. Do not import Dilmah's philanthropy, years, training or impact claims. |
| [JING](https://jingtea.com/) | Product entries pair named origins with concise, distinct sensory notes. | Give each core tea a recognizable profile and actual photo. Do not copy estates, tasting notes, hospitality logos or reviews. Its retail-led home is not our commercial hierarchy. |
| [Marukyu Koyamaen](https://www.marukyu-koyamaen.co.jp/english/) | Distinguishes history, company information, quality assurance, catalog, experiences and contact. | Separate heritage from due diligence and business access. Do not invent an established factory-tour programme, awards or matching quality credentials. |
| [China Tea](https://www.teachina.com/headquarter) | Organizes products by tea category and production/export team; explains business remit and supply context. | Connect tea families with a responsible trade contact. Do not imply state ownership, subsidiaries, global market coverage or national representation. |

Study the job of each element, not its wording. No external brand assets,
photographs, achievements or layouts are copied into Hoàng Long.

## Why this direction, and what it trades off

Recommend the **documentary stills + product precision** direction over a
video-dependent launch. It is achievable with the real materials already present,
can load well on mobile, and leaves room for better photography later. It sacrifices
some cinematic motion until genuine footage exists, while avoiding synthetic
manufacturing evidence and unnecessary infrastructure.

Do not choose a type-only luxury manifesto: it would under-explain tea and supply.
Do not choose a capacity-led industrial dashboard: it would lose the human and
Vietnamese character. The proposed page gives atmosphere a practical commercial
destination in each relevant chapter.

## Review decisions requested from the Creative Director

1. Is the source → craft → product → supply narrative distinctive and credible?
2. Refine the Vietnamese/English headline and section copy; approve exact wording
   rather than approving a vague “premium” adjective.
3. Approve the seven-part storyboard and product-selector behavior, or give exact
   changes to order, composition and information priority.
4. Approve the proposed visual scales, image treatment and motion limits; list
   which old `design.md` constraints the approved home may replace.
5. Decide which missing photographs are launch blockers and which have an honest
   still-image fallback. Confirm the facts remain separate from creative approval.

Approval record: **not yet provided**. No redesign implementation, merge or
deployment follows from this draft alone.
