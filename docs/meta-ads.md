# Meta ads setup

Ad account: `569279908663703`. Existing pixel: `299447179710901` (SHOPEE).
The app is deployed on Vercel; Wix manages DNS. Pixel setup does not require a DNS change.

## Website events

`MetaPixel` loads on approved public routes on `hoanglongtra.com` and
`www.hoanglongtra.com` only after the visitor chooses Allow. It sends PageView
on entry and client-side route changes. Successful sample requests and wholesale
enquiries send Lead, with only the form type as a custom parameter. Failed forms
send no lead. No Purchase event is sent for an unpaid enquiry or order.

Admin, ops, partner accounts, private order links, previews and localhost are
excluded. Unknown query parameters and URL fragments are excluded. Pixel settings
disable automatic configuration; form contents are not included in event payloads.
Cookie preferences allow declining and withdrawing consent. A stored decline
prevents loading Meta's script on subsequent visits. Browser storage failures
fail closed for lead tracking. The bilingual privacy notice describes Meta tracking.

## Verify before production

- Run `node --test lib/meta-pixel.test.mjs lib/public-attribution.test.mjs`.
- Run the Vercel preview build. The production-host guard deliberately prevents
  sending events from the preview.
- On production, a fresh browser must not load `connect.facebook.net` before Allow.
- After Allow, verify one PageView per navigation in Events Manager > Test events.
- Verify declined consent, withdrawal, private routes and failed forms send no events.
- With approval to create a real test enquiry, verify one Lead after each successful
  sample/wholesale submission. Do not submit fake customer records without agreement.

## API and campaign status

This website change is the browser Pixel integration, not a Marketing API or
Conversions API connection. Marketing API requires a developer app and separately
authorized `ads_read` / `ads_management` access. Keep access tokens server-side,
outside Git and browser bundles. Conversions API is a separate server integration;
use matching event IDs when adding it alongside browser events to avoid duplicates.

As checked on 7 September 2026, the ad account had zero prepaid funds, enabled
campaigns with payment errors, and 39 items awaiting publication. Funding may
resume enabled campaigns. Review campaign budgets before adding money. Campaign
objective, budget, duration and geography still need to be provided before launch.
