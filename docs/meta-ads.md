# Meta ads setup

Ad account: `569279908663703`. Existing pixel: `299447179710901` (SHOPEE).
The app is deployed on Vercel; Wix manages DNS. Pixel setup does not require a DNS change.

## Website events

`MetaPixel` loads on approved public routes on `hoanglongtra.com` and
`www.hoanglongtra.com` only after the visitor chooses Allow. It sends PageView
on entry and client-side route changes. Successful sample requests and wholesale
enquiries, including `/hong-tra-ban-si`, send Lead, with only the form type as a
custom parameter. Failed forms send no lead. Confirmed server receipts suppress
duplicate success callbacks in browser memory; the receipt is not sent to Meta.
No Purchase event is sent for an unpaid enquiry or order.

Admin, ops, partner accounts, private order links, previews and localhost are
excluded. Unknown query parameters and private URL fragments are excluded. Only
known public enquiry anchors and canonical cafe drink/Menu Lab selection values
are allowed alongside UTMs, `fbclid`, and the Vietnamese/English locale. Pixel settings
disable automatic configuration; form contents are not included in event payloads.
Cookie preferences allow declining and withdrawing consent. A stored decline
prevents loading Meta's script on subsequent visits. Browser storage failures
fail closed for lead tracking. The bilingual privacy notice describes Meta tracking.

Cafe-to-Menu-Lab links preserve a bounded, valid `fbclid` unchanged alongside UTM
labels; they never copy arbitrary contact/query fields. The sample request's
existing private CRM note retains sanitized UTM campaign/ad-variant labels, but
not click IDs. This lets staff compare qualified enquiries by campaign/content
without adding customer fields to Meta events. No CAPI or cross-channel event
deduplication is configured by this change.

## Verify before production

- Run `node --test lib/meta-pixel.test.mjs lib/public-attribution.test.mjs`.
- Run the Vercel preview build. The production-host guard deliberately prevents
  sending events from the preview.
- On production, a fresh browser must not load `connect.facebook.net` before Allow.
- After Allow, verify one PageView per navigation in Events Manager > Test events.
- Verify declined consent, withdrawal, private routes and failed forms send no events.
- Verify a campaign URL to `/hong-tra-ban-si` still allows tracking after jumping
  to its public `#mau-bao-gia` form; unknown/private fragments remain blocked.
- Verify cafe drink selection carries `fbclid` and UTMs into Menu Lab and that a
  repeated success callback for the same receipt does not send another Lead.
- With approval to create a real test enquiry, verify one Lead after each successful
  sample/wholesale submission. Do not submit fake customer records without agreement.

## API and campaign status

This website change is the browser Pixel integration, not a Marketing API or
Conversions API connection. Marketing API requires a developer app and separately
authorized `ads_read` / `ads_management` access. Keep access tokens server-side,
outside Git and browser bundles. Conversions API is a separate server integration;
use matching event IDs when adding it alongside browser events to avoid duplicates.

The Marketing API app is `Hoang Long Ads Manager` (ID `3426010064246807`).
Ad-management token authorization is a separate step. Campaign objective, budget,
duration and geography must be agreed before launch. Review existing enabled
campaigns before changing funding or publishing ads.

## Growth dashboard: read-only ad insights

The manager-only section of `/admin/growth` can read a seven-day report for the
selected Hoàng Long campaign through the server-side Meta Marketing API. It shows
spend, impressions, link clicks and Meta-attributed Pixel leads per ad. Meta's
attribution and consent rules mean these leads can differ from actual enquiries
in the website CRM; a lead is not an order. A missing number is shown as `—`.

The deployment administrator must securely configure `META_ADS_ACCESS_TOKEN`
in the production hosting environment with read access to the selected ad account
and `ads_read`. Add `META_APP_SECRET` there as well only when the Meta app requires
app-secret proof. Never put either value in Git, a browser bundle, or a chat. A
server restart/redeploy may be necessary for new environment variables. Until a
working authorization is configured, the panel says it is not connected; no live
Meta data or successful integration is implied. Only managers and admins can call
the server endpoint. Requests stay scoped to the selected campaign, and incomplete
or failed Meta responses are not displayed as complete reports.

Run `node --test lib/meta-insights.test.mjs`; after configuration, verify the
production panel with an authorized manager and compare each ad's figures and date
range against Ads Manager. Do not log tokens or include customer information in
test evidence.
