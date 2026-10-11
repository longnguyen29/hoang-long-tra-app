# Company profile and trade catalogue

Public `/company` introduces Hoàng Long in Vietnamese and English, with a dated profile/catalogue PDF in each language. `/catalog` continues reading eligible, available tea products from the existing `catalog_products` table. Homepage navigation, trade desk and event catalogue link to the profile.

Public contact details reuse `lib/event-contact.js`. Company copy in `lib/company-profile.js` carries already published history, raw-material regions and declared production capacity, with volume/delivery confirmed per order. The Hanoi address is explicitly an office/warehouse. No registered legal name, tax number, factory address, certification, tested standard or export-market achievement was invented. Requested certificates/test reports are items to confirm, not claims of availability.

`lib/trade-product-details.js` classifies the 14 existing teas from their catalogue names, translates four names missing English, and provides editorial sample-evaluation guidance separately from actual product notes/flavours. Actual brewing and listed packing fields are reused. Listed retail/product packing is not bulk MOQ. Grade, bulk MOQ, lead time and shelf life remain quotation-specific until entered and confirmed. Pu-erh pieces are not converted to kilograms without a unit weight.

No migration is required. Product data remains editable through the existing product tools. The web catalogue refreshes from the public product table. PDFs are dated snapshots, not live stock or binding quotations; they direct buyers to the web catalogue and an enquiry. The document generator accepts only a public bilingual JSON payload; do not supply customer data, internal price sheets or credentials.

Existing sample/quote submissions, consent, Pipeline and notifications are retained. Profile/catalog links preserve a valid language and approved campaign parameters; visitor information is not placed in navigation URLs. No customer communications or social posts are sent by this feature.
