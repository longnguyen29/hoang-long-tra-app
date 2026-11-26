# HL-001 replacement creative reference — 2026-11-06

**Status:** New owner-directed creative direction and Work handoff. Replaces the rejected Round 2 aesthetic only; does not approve merge, production deploy, data modifications, or bypass the exact-branch Vercel exclusion.

The owner reviewed `hoanglongtra.com` copy and requested: “Follow your suggestion. Forward to work. The image you gave for the suggestion is nice, use it if can.”

## Reference files and visual authority
The originating ChatGPT conversation contains the bundled file `hoanglong_work_handoff_2026-11-06.zip` with:
- `index.html`: responsive bilingual concept for the new opening and first sections, language toggle.
- `desktop-1440.png` (**1440 × 900**), `mobile-390.png` (**390 × 844**): viewable render targets.
- `assets/hero-concept.jpg`: original AI-generated misty tea highlands artwork; `README.md`: complete editorial and implementation brief.

Work must receive this zip as an attachment from the originating chat before implementing the exact visual. **No existing web-search photo should be reused without proven licence.** The artwork is atmospheric illustration, not evidence of a specific farm, factory, village or tea origin. If used on a production page, clearly label it as illustrative, or replace with a rights-cleared authentic Hoàng Long Shan Tuyết photo matching the composition. Do not generate a fake factory/producer photo.

## The opening
- Editorial Vietnamese tea identity with B2B practicality; calm, confident and human, not an export dossier or luxury gift catalogue.
- Ivory `#F7F3EA`, forest `#1C2B24`, antique gold `#B08D57`; expressive legible serif heading and clean functional sans; preserve Vietnamese glyphs and English line breaks.
- An expansive single landscape photograph/illustration ABOVE the copy on desktop and mobile; cream copy plane beneath; clean navigation; ONE dominant trade CTA, secondary text link.
- Vietnamese kicker: **Trà Việt Nam · Nền tảng gia đình từ 1995**
- VI H1: **Từ Hà Giang, đưa trà Việt vào sản phẩm của bạn.**
- VI intro: Dựa trên kinh nghiệm làm trà của gia đình từ năm 1995, Hoàng Long kết nối nguồn trà, chế biến và cung ứng cho nhà nhập khẩu, nhà phân phối và thương hiệu đồ uống.
- Primary CTA: **Yêu cầu mẫu & báo giá** to existing `/wholesale` with language, product-aware state and UTM attribution.
- Secondary text link: **Khám phá dòng trà** to four tea products.
- EN kicker: **Vietnamese tea · Family roots since 1995**
- EN H1: **From Hà Giang, to your next tea product.**
- EN intro: Building on family tea-making experience since 1995, Hoàng Long connects Vietnamese tea origins and processing with the needs of importers, distributors and beverage brands.
- EN CTA: **Request samples & quotation** / **Explore the teas**.
- Below-opening proof points: family tea-making since 1995; processing at Tân Lập, Hà Giang; samples/packing tailored by enquiry. Don't assert merchant company owns the factory until entity relationships verified.

## Below the opening
1. Four product identities, with existing catalogue IDs and actual product images: Hồng Trà Mật / Honey-Note Black Tea; Hồng Trà Khói / Smoky Black Tea; Xanh Mộc / Shan Green Tea — Mộc; Trà Xanh Hoa Ngọc Lan / Magnolia-Scented Green Tea. Section: **“Bốn dòng trà. Nhiều hướng phát triển sản phẩm.”** / **“Four teas. Different possibilities for your range.”**
2. Family story: **“Một gia đình làm trà từ 1995. Tiếp nối nghề bằng cách làm mới.”** / **“A family tea-making tradition since 1995. A new way to carry it forward.”** Genuine family and factory photos only.
3. Supply and evidence below hero: declared 50–100 tonnes/month capacity (not available inventory), PP/PE 20/30/35kg, quotation-dependent grade, test scope, availability and dates, EXW Tân Lập. Clarify the legal trading versus manufacturing entities before factual claims.
4. Close with short trade enquiry and unambiguous quote/sample CTA. Retail remains a secondary route.

## Implementation responsibilities for Work
- Examine live main, draft PR #48, current repository `longnguyen29/hoang-long-tra-app`, existing responsive and localization systems.
- Build one bounded, reviewable integrated implementation; **do not continue retired Round 2 concept**. Follow the reference screenshots instead of producing another large concept pack.
- Primary locations include `components/public/HouseHome.jsx`, its CSS, `lib/export-product-profile.js`, and editorial `/company` /`/story` copy where verified. Preserve product IDs, product-aware sample requests, locale, attribution, consent, retail, catalogue, payments/orders, private staff/prospect systems and all protected deployment settings.
- Use real `public/export/core-*.jpeg` for the existing teas (verify rights and quality). Missing verified family/factory images remain clearly flagged rather than filled with pretend evidence.
- Test at 1440×900, 390×844 and 768px, VI/EN, meaningful keyboard access, responsive fold, line breaks, metadata, CTA route, product links and relevant existing tests.
- Deliver a reviewable draft PR/diff, side-by-side screenshot comparison to the exact approved reference, and list of remaining image/fact confirmations. **No merge, publish or production deployment without new explicit approval.**

This creative reference is intentionally narrower than the rejected Round 2 board pack.