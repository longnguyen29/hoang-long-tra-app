# Partner Network B2B sales kit

13 October 2026. Vietnamese buyer brief at `/export/taiwan`, reused from the initial Taiwan connector request. The owner confirmed that the connector and buyer communicate in Vietnamese, so the page and kit builder have no language selector. There is no home navigation/sitemap addition; noindex supports sharing a sales brief without changing the retail catalog or opening Partner Network registration. Noindex is not private access control.

## Commercial source and boundaries

Owner-supplied EXW prices, in VND/kg: Trà Xanh Hấp 75,000; Hồng Trà Khói 85,000; Hồng Trà OP1 80,000; Trà Xanh Hoa Ngọc Lan 100,000. Prices include standard packaging. Named EXW place: **Nhà máy Trà Hoàng Long - Tân Lập, Hà Giang**. The latest direct owner confirmation is used for this brief, rather than older address seeds. Capacity is 50–100 tonnes/month; readiness is 2–6 weeks, depending on quantity and confirmed requirements. Readiness is not arrival time or an inventory guarantee.

Custom packaging/labels, applicable taxes, MOQ, payment terms, laboratory scope/costs and shipment schedule are agreed in a formal quotation. The buyer arranges loading, freight and export/import formalities under EXW; any additional seller assistance must be agreed. Office/warehouse in Hanoi is distinguished from the factory. No connector name/contact appears on the buyer page. Existing company-profile photographs and EN/VI company PDFs are reused; certificates, laboratory results and import clearance are not invented. These offers do not change retail price agreements or map display IDs to catalog SKUs without verification.

## Kit builder and PDF

`/admin/partner-network` has a fourth **Bộ chào hàng** tab. A manager can generate a generic brief or select an approved partner from the existing authenticated snapshot. Approved partners have their own kit tab in `/partners/network`; pending/rejected/disabled profiles gain no referral privileges. Select 1–4 teas and VND/TWD/USD/CNY. `lib/export-sales-kit.js` validates the selection and creates a stable share URL. Malformed/repeated selections return 404 instead of silently showing another assortment. The public ledger, calculator and enquiry tea choices all follow the same selection.

Only the full public partner code (`HL-P-` plus 32 UUID hex characters) is carried as bounded `utm_content`. Names, contacts and internal margins never enter the URL. This is a provenance hint for review, not authenticated referral ownership or commission entitlement. A kit is a generated link, not a new persistent assignment record or CRM.

The actual download `/downloads/hoang-long-b2b-sales-kit-vi.pdf` is a polished three-page Vietnamese overview of **all four teas**, with dated VND prices, confirmed EXW place/packing, real photographs, workflow, buyer brief, contacts and a QR to the web page. The UI labels its full scope. For a selected assortment/current displayed currency, the web page provides browser **In / lưu PDF**. No server-generated personalized PDF or automatic connector dispatch is claimed.

Rebuild the static overview with `python3 scripts/build-b2b-sales-kit.py`. The authoring script requires Node, ReportLab, Pillow and four Vietnamese-capable Noto Sans/Serif font files (use `--font-dir` outside the bundled runtime). It reads prices/revision and public contacts directly from the repository; no network, credentials or new app dependencies. Re-render and visually review all three pages after changing approved facts/prices. Static PDF currency rates are intentionally absent; the QR opens current conversions.

## Pricing

`lib/export-teas.js` is the source for the four reference offers. `GET /api/export-prices` uses a fixed, keyless ExchangeRate-API VND feed with a one-hour server cache and six-second timeout. It returns product conversions only, not a raw exchange-rate feed. Provider attribution and update time are shown. Source data updates daily, not tick-level realtime. Older-than-48-hour foreign estimates are disabled. An unavailable feed retains VND source prices and never uses fabricated fallback rates. The calculator is indicative goods value; a formal quotation specifies currency and EXW place. Existing financial quote/order ledgers remain VND.

## Existing commercial flow

`POST /api/export-enquiries` validates buyer details, then reuses the service-only contact intake handler and existing `submit_event_enquiry` RPC. This retains origin/body/contact validation, IP/contact throttles, honeypot, private records, idempotency and transactional create/link to `trade_opportunities`. No migration or new credentials are required. The shared receipt remains `HL-E-…` and the campaign column remains `event_contact_v1`; actual bounded UTMs and `[Taiwan export / EXW]` details are retained in the saved note in Pipeline's shared contact inbox.

The buyer supplies company/contact, tea selection and authorized-contact consent. Kg/date/channel/specification fields are optional and collapsed. The public form explicitly distinguishes buyer and connector. Customer company/name/contact always remain the buyer identity for Pipeline matching. Connector mode requires a separate responsible person name and valid email/phone, stored only in private intake notes with customer authorization. Switching roles resets consent; omitted server roles preserve the legacy note for in-flight retries. The brochure never prints an individual connector’s contact details. A sample/quote/visit request is not an order or appointment confirmation. CTAs prefill tea, intent, kg and currency. Currency follows the display until the buyer explicitly selects a different quotation currency. Existing sample, quotation, order, procedure and reorder workflows remain downstream of the same Pipeline. Public Partner Network registration stays false.

## Validation / internal review

23 focused Node tests passed for the connector-role update: distinct buyer/connector identities, required responsible contact, bounded roles/private responses, the note budget, selection/link validation, full-code provenance, shared transaction boundaries, idempotency, origin/contact/body guards, throttling, FX arithmetic/staleness and upstream failures. Build and deployed desktop/390px checks are recorded in the task handoff. Local server binding was denied by the execution sandbox, so UI checks use the branch deployment. No valid synthetic enquiry is submitted to the production database.

Manually check the kit tab, product selection, copy/open link, currency changes, estimator-to-quote prefill, visit/sample CTAs, optional contact methods, consent, actual PDF download and browser print. Verify the first real authorized buyer's saved reference in Pipeline when an actual request arrives. No customer message, order, visit booking or commission is automatically created from this brief.

References: [Taiwan currency](https://www.law.cbc.gov.tw/ELaw/ShowAll?LawDataType=1&LawID=LA05001000), [FX provider](https://www.exchangerate-api.com/docs/free), [ICC EXW / FCA](https://academy.iccwbo.org/incoterms/article/incoterms-2020-exw-or-fca/).

## Connector/customer clarification and photographs

The owner clarified that the connector is a friend or assigned liaison and the customer is a separate buyer. The page and PDF now show three roles throughout the process: supplier, connector and buyer. The connector gathers consented needs, coordinates samples/meetings, transfers feedback and tracks the next action. The buyer confirms samples/orders/payment and EXW transport/import duties; final supplier terms are confirmed by Hoàng Long. The manager kit builder explicitly prepares a document for the connector to show customers. A generic brief works without selecting a registered partner.

Two unmodified dry-tea photographs from the live public catalog are bundled under `public/export/`; provenance is documented there. Captions retain their real catalog names (Hồng Trà Shan Khói and Lục Trà Hoa Ngọc Lan). They are editorial catalog images, not a verified grade/lot mapping for OP1, steamed green or any quoted shipment. Both web and PDF use the real photographs; approved samples/specifications remain the reference.
