# Domestic B2B black tea landing — 25 October 2026

Public route: `/hong-tra-ban-si`. Audience: Vietnamese distributors and milk-tea/beverage chains. This is a brand-only landing page with an inline form; it does not reuse the personal export contact page.

## Content and privacy

Only `hong-tra-shan-mat` and `hong-tra-shan-khoi`. Existing unmodified public photos are reused from `public/export/`; source records remain in `public/export/README.md`. Owner-confirmed sensory notes only. No stock quantity, internal floor price, discounts, certifications, guaranteed milk performance or promised sample delivery dates.

Header/CTA links stay on this page. Contact options use the existing **Hoàng Long office phone/Zalo**. No individual sales contact, personal image, export profile PDF, `/company` or `/wholesale` link is shown. Server page passes only legal company name/tax ID; no personal contact object reaches the client. Root layout/providers do not add a personal contact overlay.

## Intake

`POST /api/domestic-wholesale-enquiries` maps validated product choices, total planned kg, PP/PE packing, business type, destination and notes into the existing `submit_event_enquiry` transaction through the shared server handler. Enquiries appear in the existing website/event intake and linked Pipeline records. It does not create an order or promise inventory.

Phone is the matching contact; name/company and response consent are required. Product IDs are restricted to the two real SKUs. Quantities may be unspecified, otherwise must be positive decimal kg. Packing options: undecided,20,30,35kg,custom. The displayed quantity is explicitly total demand, not an allocation per tea or a minimum order.

The existing SQL campaign contract remains `website / owned / event_contact_v1`. Actual campaign labels (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) are separately preserved in the private enquiry note with landing path. Values are allowlisted, bounded; duplicate/invalid labels and arbitrary URL parameters are discarded. The form is inline, so anchor CTAs preserve the incoming query. Internal existing conversion events retain campaign attribution with placement `hong-tra-ban-si` and contain no form contact data.

The new route does not enable Meta Pixel or change ad-account settings. A separate advertising implementation may add platform-specific conversion measurement after review. This page does not update, activate or change the budget of any campaign.

## Reliability

Reuse server-only service credentials, JSON body cap, origin checks, honeypot, trusted-IP throttling, existing duplicate-contact handling and atomic idempotent receipts. Client holds a UUID across network retries, prevents double clicks, disables edits in flight and only shows success after matching server receipt. An edited request receives a new UUID. Notes reserve space for structured fields and UTMs inside the existing700-character limit; entered notes are never silently truncated.

No database migration or new environment variables. Production requires the same server Supabase configuration already used by `/api/event-enquiries`; client receives only the public Supabase configuration.

## Checks

10 focused tests pass: mapper, allowed SKU/quantity/consent/contact/packing, UTM parsing, maximum note budget, shared handler integration, idempotent receipts, origin/rate/conflict/error handling. Database clients are substituted in tests; no real enquiry or customer message is created.

Production build passes. Browser checks cover desktop and390px, actual photo loading, CTA intent/tea selection, inline form, native required fields, retained UTM query and no horizontal overflow. Built HTML, metadata, serialized props, visible copy and links are inspected for personal contact leakage. A valid production CRM write is not generated as a test; the server transaction is covered by the handler tests.
