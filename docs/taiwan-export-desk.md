# Taiwan connector / export desk

13 October 2026. Additive buyer brief at `/export/taiwan`; Traditional Chinese defaults, English/Vietnamese available. No home navigation/sitemap addition; noindex supports sharing a specific sales brief without changing the retail catalog or opening Partner Network registration. Noindex is not private access control.

## Commercial source and boundaries

Owner supplied EXW reference prices: steamed green75,000VND/kg, smoked black85,000, OP1 black80,000, magnolia green100,000. The unit is treated as kg based on the wholesale brief; these do not update retail price agreements or invent catalog SKU mappings. Capacity50–100tonnes/month and readiness2–6weeks were supplied by the owner. Readiness is not transport arrival time or an inventory guarantee.

Exact pickup place, packaging specification, applicable taxes, MOQ, payment terms, laboratory scope/costs and actual shipment schedule are agreed in a formal quotation. The owner has not yet supplied a named connector contact or confirmed the pickup/packing detail, so the page uses existing Hoàng Long contact details. Office/warehouse in Hanoi is distinguished from the factory visit. Existing company-profile region/factory photographs and EN/VI PDFs are reused; no certificates, laboratory results or Taiwan-import clearance are invented.

## Pricing

`lib/export-teas.js` is the single source for the4reference offers. `GET /api/export-prices` uses a fixed, keyless ExchangeRate-API VND feed with a one-hour server cache and6secondtimeout. It returns product conversions only, not a redistributed raw exchange-rate feed. TWD/USD/CNY/VND are available, provider attribution/update time shown; source data updates daily, not tick-level realtime. Older-than48-hour foreign estimates are disabled; unavailable feeds show VND source prices, never fabricated fallback rates. The calculator is indicative goods value; a formal quotation specifies currency and EXW place. Existing financial quote/order ledgers remain VND.

## Existing commercial flow

`POST /api/export-enquiries` validates export-specific details, then reuses the service-only contact intake handler and existing `submit_event_enquiry` RPC. This retains origin/body/contact validation, IP/contact throttles, honeypot, private records, idempotency and transactional create/link to `trade_opportunities`. No migration/new credentials are required. The shared receipt remains `HL-E-…` and campaign column remains `event_contact_v1`; actual bounded export UTMs and `[Taiwan export / EXW]` details are in the saved note, visible in Pipeline's shared contact inbox.

Buyer supplies company/contact, tea selection and authorized-contact consent; optional kg/date/channel/LINE/WhatsApp/specification/introducer information is collapsed. Sample/quote/visit is a request, not an order or appointment confirmation. Page CTAs prefill tea, intent, kg and currency. Currency follows the price display until the buyer explicitly selects a different quotation currency. Names/contacts never go into share URLs. Share links preserve only safe campaign content and language/currency.

Approved connectors register real customer referrals in `/partners/network`; a public UTM, unverified introducer field or share link never grants referral ownership/commission. Existing sample/quotation/order/procedure/reorder flows remain downstream of the same Pipeline. Partner public registration flag stays false.

## Validation / internal review

14focused Node tests passed for export brief validation, shared transaction response boundaries, idempotency, origin/contact/body guards, throttling, FX arithmetic/staleness and upstream errors. Production build passed before final UI polish; final build/deployment/browser verification recorded in the task's private handoff. Local server binding was denied by the execution sandbox, so browser checks use the branch deployment. No valid synthetic enquiry is submitted to the production database.

Check desktop/390px; language and currency switches; estimator-to-quote prefill; generic visit/sample CTAs; contact-method requirements; authorized-contact checkbox; unavailable FX; PDF and shared links. Verify a real authorized buyer's saved reference appears in Pipeline when the first actual request arrives. No customer messages, orders or visits are automatically created from the sales brief.

References: [Taiwan currency](https://www.law.cbc.gov.tw/ELaw/ShowAll?LawDataType=1&LawID=LA05001000), [FX provider](https://www.exchangerate-api.com/docs/free), [ICC EXW / FCA](https://academy.iccwbo.org/incoterms/article/incoterms-2020-exw-or-fca/).
