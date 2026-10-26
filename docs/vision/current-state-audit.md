# HL-001 — Current website audit

**DRAFT · 26 October 2026 · Not approved.**

Baseline: `8d9f2dd1e975efbea035b5a48147d68d24c7eb98` on `origin/main`.
The working tree was clean. GitHub's open-PR query returned no open PRs at audit
time; older remote branches and the local tea-characteristics research branch
remain intact. The new working branch is `codex/website-reinvention`.

This is a repository-wide route, content and integration audit, with a local
browser inspection of the homepage at three widths. It is **not** an authenticated
end-to-end test of every page, a security audit or independent factory verification.
No customer form, order, payment or production record was submitted or changed.

## Findings that change the design brief

| Priority | Observed condition | Consequence / proposal |
| --- | --- | --- |
| High | Home repeats four-tea and capacity prose across hero, supply, origin and trade panels. | Give each chapter a distinct question and evidence; remove repeated paragraphs in the future design. |
| High | The first screen identifies export tea but gives little sense of craft or a distinctive company story. Product photos become small index thumbnails. | Propose a photographic opening, an actual craft chapter and a larger four-tea presentation; keep the B2B CTA immediately visible. |
| High | `HouseHome` reads producer fields, but its current origin image falls back to featured media. `HouseStory` can label `/landing/2.jpg` with a producer's name. That photo shows a hand holding leaves, not a portrait. | Never pair this fallback with a named-person portrait claim. Use a true portrait only when supplied; otherwise use a literal process caption. No fix applied here. |
| High | Core export profiles and the older Taiwan/partner offer use different product identities. | Preserve both; do not copy OP1/steamed-green prices onto Mật/Mộc or silently rewrite a partner's offer. |
| Medium | B2B is first in the shared header, but the lower home split places retail before trade with equal emphasis. | Make the wholesale path dominant throughout; retain a clearly named retail collection entry. |
| Medium | Existing imagery includes a portrait tea-tree image and a two-photo equipment collage, not a landscape film or factory panorama. | Design for available framing first. Commission real landscape, process and people images before attempting a documentary film treatment. |
| Medium | `HouseHome.module.css` has successive appended overrides and stale visual-pass comments. | Future homepage CSS should be a coherent scoped composition. Static comments are not QA evidence. |
| Medium | Shared header and homepage retain campaign tags on corporate/trade links; the homepage's `/shop` link only carries language. | Preserve current contracts and make any attribution improvement explicit and tested; do not claim complete existing attribution coverage. |
| Medium | Meta tracking has deliberate consent, host, path and query restrictions. | Do not broaden tracking eligibility to make new editorial interactions appear measurable. |
| Low | Older company documentation lists a seven-page annex; the current trade pack lists six. | Use current pack definitions and actual file checks when showing downloads. Do not copy page counts from stale documents. |

The current page is already editorial and asymmetric; it is not accurately
described as a centered SaaS template. The issue is narrative depth, image scale
and section rhythm, rather than an absence of serif typography or a need for more
decorative widgets. Conversion impact is unmeasured; these findings are design
and source observations, not evidence of lost sales.

## Route and journey map

| Surface | Existing responsibility | Keep / future presentation implication |
| --- | --- | --- |
| `/` | Corporate entry, four core products, origin and retail/trade paths | HL-001 implementation target after approval. |
| `/company` | Bilingual product profiles, supply, specifications, legal identity, PDFs and contact | Primary due-diligence destination; retain section and product anchors. |
| `/catalog` | Available public `catalog_products`, B2B selection, sample/quote handoff | Procurement catalog, not a second retail checkout. |
| `/wholesale` | Product-aware sample/quote brief, consent, `leads` insertion, conversion events | Existing commercial intake; homepage links here instead of creating another form. |
| `/hong-tra-ban-si` | Brand-only domestic black-tea wholesale campaign page | Preserve focused ad journey, its two real catalog SKUs and intake API. Do not insert a personal export contact here. |
| `/cho-quan` | Café-specific selection and campaign entry | Keep separate from importer/distributor narrative. |
| `/sample`, `/sample/menu-lab` | Sample-pack control and recipe-led experiment, existing submission RPC | Keep both routes and experiment attribution; no silent redirect. |
| `/mau-thu-doanh-nghiep` | Older sample landing | Preserve route; audit old free-sample/technology/ancient-tea claims separately before reuse. |
| `/shop`, `/shop/[id]` | Retail selection, detail, stock, packages, characteristics, trust details, brewing, cart and order | Keep prices, units, stock badges, comparisons, benefits and server validation. Homepage retail entry remains accessible. |
| `/shop#tea-bundles`, `/goods` | Tea bundles and regional goods | Keep product identity, bundle enquiry and commerce separation. Not the B2B homepage hero. |
| `/story`, `/gallery` | Origin narrative, public producers/vendors, journal/wiki material | Useful deeper story; media and public publication status need appropriate curation. |
| `/hanh-trinh-la-tra`, `/chon-tra-theo-vi` | Existing controlled journey/taste experiments | Preserve direct links and analytics placements; do not promote experiments accidentally. |
| `/sessions` | Tea-session booking and consent | Optional footer destination, not the factory-visit booking mechanism. |
| `/meet`, `/meet/catalog`, `/meet/qr` | Event contact capture, simplified catalog and QR | Preserve database capture and optional Zalo continuation. |
| `/export/taiwan`, `/doi-tac/[slug]` | Existing EXW offers, currency references, attributed partner sales page and enquiries | Keep offered IDs, prices, contact remit, referral ownership and access rules unchanged. |
| `/partners`, `/partners/network`, `/partners/account`, auth callbacks | Invite/registration policy, partner desk and wholesale account access | Preserve private pilot and approvals; a homepage redesign must not open enrollment or expose internal commissions. |
| `/gioi-thieu/[slug]` | Referral share entry | Preserve validated referral and customer consent. Do not substitute UTM for partner identity. |
| `/don-hang/[token]`, `/batches/[code]` | Customer order journey and batch passport | Token/public visibility contracts remain unchanged. No real order evidence in review screenshots. |
| `/privacy`, `/terms`, `/shipping`, `/returns` | Published policy details | Retain accessible links and consent behavior; no policy rewrite in HL-001. |
| `/admin/**`, operations console, `/api/staff/**` | CRM, pipeline, orders, procedures, evidence, stock, knowledge, pricing, costs, commissions, reminders | Protected operations. Source boundaries inspected; no authenticated operational actions or redesign authorized. |
| `/ui-review/**`, `/discovery-review` | Existing internal/parallel previews | Preserve their purpose; not a new homepage or public sitemap destination. |

Commercial continuity:

`Home → company/catalog → product-aware wholesale brief → existing CRM → sample/quote → order → procedure/delivery → reorder`

Retail continuity:

`Home → shop → actual package/quantity → existing cart/consent → retail-order API → existing order flow`

These are existing architecture relationships, not proof that every production
transition has been executed during this audit.

## Contracts and source ownership

| Contract | Source / boundary |
| --- | --- |
| Home content/media | `components/public/HouseHome.jsx`; read-only `settings_home` fields `featured_photos, producer_name, producer_photo, producer_role, producer_quote`; row 1. |
| Navigation | `PublicSiteHeader.jsx` and CSS; current destinations, active states, 64rem desktop breakpoint, Escape focus return and outside-click closure. |
| Locales | `components/i18n/LocaleProvider.jsx`; vi/en query and public preference handling; homepage uses existing localized editorial values. |
| Attribution | `lib/public-attribution.js`; five sanitized UTM keys, `home_view`, consent-safe metadata. No personal information in events. |
| Four core teas | `lib/export-product-profile.js`; company `#product-{id}` anchors; genuine catalog IDs. |
| Trade handoff | `lib/trade-catalog.js`, `TradeDesk.jsx`; `tradeEnquiryHref(id,intent,search,locale)` preserves sample/quote intent and SKU. |
| Retail | `RetailCartProvider.jsx`, `TeaShop.jsx`, `RetailProductDetail.jsx`, `lib/retail-*`, `/api/retail-order`; no price, eligibility or unit change. |
| Partner ownership | `lib/partner-sales-page-server.js`, `lib/retail-partner.js`, partner RPCs and server routes; no authentication/commission changes. |
| Global shell | `app/layout.js`, `app/globals.css`, `tokens.css`; locale, cart and Meta providers shared with other pages. Avoid blanket changes. |
| Operations | `lib/staff-api-auth.js`, `lib/ops-auth.js`, staff/order/procedure/SMS APIs and Supabase migrations. No migration or operational call required. |
| Discoverability | `app/page.js` metadata, `app/sitemap.js`, `app/robots.js`, `next.config.mjs` redirects; preserve canonicals and legacy routes. |
| Display mode | `components/IdleScreen.jsx`, opt-in kiosk on home only; no automatic takeover for ordinary buyers. |

## Factual and asset register

Owner-supplied, already public facts may support draft copy, with appropriate
qualifiers: family tea-making since 1995; factory/EXW Tân Lập, Hà Giang; overall
declared planning capacity 50–100 tonnes/month; bulk PP/PE sacks 20/30/35 kg,
adjustable; indicative 2–8 week transaction window including transit, excluding
unforeseen delay. The window is not EXW freight inclusion or guaranteed dispatch.
The legal name is Công ty TNHH Thương Mại Trà Hoàng Long, tax ID 0110818609.
The Hà Nội office/warehouse is distinct from the factory. Anh Long's public remit
is Director of Export Development; a full name or legal signing power is not supplied.

Four core IDs: `hong-tra-shan-mat`, `hong-tra-shan-khoi`, `luc-tra-shan-moc`,
`luc-tra-ngoc-lan`. Owner-confirmed notes: Mật—honey/caramel, mellow, pronounced
aroma; Khói—smoke/black bean/wood, full flavour; Mộc—refreshing/smooth, without
harsh astringency; Ngọc Lan—real dried magnolia flowers. Notes are not added honey,
bean ingredients, quantified sensory tests or a specified smoking method.

| Available asset | Observed / provenance | Appropriate use |
| --- | --- | --- |
| `/landing/1.jpg`, 1200×2133 | Archive tea-tree photo; visible tree and surroundings. Attribution context in `public/landing/README.txt`; not independently geolocated or aged. | Origin chapter / portrait crop. No invented altitude, age or plantation acreage. |
| `/landing/2.jpg`, 1200×2133 | Hand holding leaves on equipment, not a headshot. | Craft close-up with literal caption. No person identification. |
| `/landing/3.jpg`, 1024×1024 | Two-photo equipment collage already used in company media. | Show intact or as clearly labelled archival plates; not a single cinematic panorama or proof of exact machine capability. |
| `/landing/4.jpg` | Drink photo with visible third-party café branding. | Exclude from proprietary brand hero and client/manufacturing evidence. |
| `/export/core-*.jpeg` | Four unmodified public catalog photos; explicit source URLs in `public/export/README.md`. Uneven framing and exposure. | Product identity with honest crops; not a promised grade or actual shipment lot. |
| `/cafe/*` concepts | Existing AI concept imagery, not documentary production evidence. | No origin/factory/people use; excluded from proposed home. |
| `COMPANY_MEDIA` null slots | Factory panorama, QC and bulk-loading photographs not yet supplied. | Do not populate with synthetic proof. Use a composition that works without them. |
| `settings_home` / public vendor photos | Existing managed content; a current usable portrait and permissions were not established in this audit. | Review individually before a named-person feature. |

Do not claim certifications, named export destinations, government relationships,
owned plantations, verified factory ownership, laboratory values, customer logos,
environmental impact, stock on hand or measured conversion improvement without
specific evidence. The design goal “world-class” is an internal quality ambition,
not a new public certification or ranking.

## Baseline evidence and limits

Local, unchanged homepage initial-viewport captures, Vietnamese, dev build:

- [390 × 844 viewport](../qa/evidence/hl-001-baseline/home-390.png).
- [768 × 1024 viewport](../qa/evidence/hl-001-baseline/home-768.png).
- [1440 × 1000 viewport](../qa/evidence/hl-001-baseline/home-1440.png).

These are **before** images, not proposed mockups or completed redesign QA.
Browser screenshots may exclude the desktop scrollbar; viewport sizes above are
the requested CSS dimensions. Homepage overflow measurements were no greater than
viewport width. The dev indicator is not production chrome. Lazy-loaded lower
sections are not validated by these initial-viewport images.

## Execution plan proposed for the later implementation

1. Creative Director reviews the linked drafts, records decisions and approves a
   version. Owner facts/asset approvals remain distinguishable from creative approval.
2. Implement the approved home composition in `HouseHome.jsx` and its CSS module;
   use an additive `lib/homepage-editorial.js` only if it reduces VI/EN duplication.
3. Reuse `PublicSiteHeader`; add an opt-in home visual variant only if approved,
   preserving all behavior and default styling elsewhere.
4. Update home-only metadata in `app/page.js` if approved; preserve `IdleScreen`.
   Optimize authorized images without changing source meaning. No DB or API work.
5. Run the targeted functional and visual checks in the acceptance document;
   attach after screenshots and limitations to an implementation PR.

Expected later files: `components/public/HouseHome.jsx`,
`components/public/HouseHome.module.css`, possibly home-only editorial data and
`app/page.js`; header files only for an approved compatible variant. No deletion
of existing routes. Shared tokens/global styles remain untouched unless a later
scoped migration is separately reviewed.

Current draft PR changes only documentation, baseline captures and the exact-branch
Vercel exclusion. No application build is needed to validate a Markdown proposal.
The exclusion follows [Vercel's documented branch configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled):
`codex/website-reinvention` is false; other branches retain their prior behavior.
Do not rely on a draft PR or a skip-CI commit message to prevent a deployment.
