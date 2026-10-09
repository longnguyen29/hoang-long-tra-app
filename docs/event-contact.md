# Event contact and database enquiries

Public `/meet` is the reusable contact page for tea shows and partner meetings. `/meet/qr` supplies the unchanged printable A5 website QR and PNG/SVG assets. Reuses Vietnamese/English locale, brand tokens/typefaces, existing Zalo 0903 333 841, phone, office/warehouse address, catalogue, qualified sample flow and company vCard.

## Compact event catalogue

`/meet/catalog` is the mobile-friendly event catalogue. It reads the same available trade teas and actual product photos as `/catalog`; it does not duplicate products or invent prices. Visitors can select up to three teas and continue to `/meet` for samples or a quote. Only bounded product IDs, intent and approved attribution travel in the URL. The contact page resolves those IDs against available catalogue rows before showing or including product names in the enquiry/Zalo note. Typed requirements stay separate and are not silently overwritten or truncated. Loading failures provide retry and a way to continue without a selection.

The original booth QR continues to open `/meet`, which links to this compact catalogue. Existing printed QR cards remain usable.

## Direct enquiry

The main action sends name, contact, optional business/notes and sample/pricing/partnership intent to `/api/event-enquiries` after explicit save/respond consent. Success and a reference appear only after the server confirms a committed save. Fields and the request UUID remain after a timeout/API error; retries use the same UUID and cannot duplicate a saved enquiry or note. Editing fields starts an intentional new request. The form has a honeypot, server validation, bounded JSON body, origin checks and database-backed throttling; no raw form data or credentials are logged or placed into URLs.

`event_enquiries` (migration 0077) is the private permanent record of submitted content, attribution, received/consent time and consent wording version. It retains every distinct request even if a staff edit later changes Pipeline notes. Existing managers/admins may read the log; anonymous users cannot read or write the table, and only the server service role can call the save RPC. Daily keyed IP hashes support rate limits; original IP addresses are not saved in the enquiry record. No additional environment variable or dependency.

The RPC atomically creates a new `trade_opportunities` row in the existing `lead` stage or links a single matching existing customer, including legacy phone/email formats. It appends a note once, preserving stage, owner, commercial details, next action and prospect suppression. Ambiguous contacts are stored unlinked for staff review instead of guessing or creating another customer. Failed writes roll back the enquiry and opportunity changes together. Three enquiries/contact and thirty/IP bucket per thirty minutes are allowed; exact same-ID retries are checked before those limits.

Staff sees a collapsible read-only section in `/admin/pipeline` with the latest thirty requests, source, timestamp, content, consent and a button to open the customer. The customer drawer includes its filtered enquiry history. Log errors remain local to that section; the rest of Pipeline continues to work. Existing leads/sample/order data is not duplicated or migrated.

## Optional Zalo

Visitors can instead use the existing Zalo link or prepare/copy a local message without database consent. Preparing/copying a draft alone does not save it. After a database save, Zalo is an optional follow-up. They paste and press Send themselves; there is no automatic message or false claim that Zalo has received it. Clipboard failure retains the draft for manual copying.

QR payload remains `https://www.hoanglongtra.com/meet?utm_source=teashow&utm_medium=qr&utm_campaign=event_contact_v1`; no reprinting is needed. Persist only approved source/medium values and a fixed campaign; direct/footer visits default to website/owned. QR scans, Zalo opens and copied messages are not reported as submitted leads or orders.

## Release and manual check

Apply migration 0077 before publishing code. Do not replay previously applied migrations. Validate the real database with a rollback-only fixture (new enquiry, same-ID retry, repeat contact, legacy match, ambiguous match, commercial preservation and public privileges), then deploy and verify actual `/meet` and authenticated `/admin/pipeline`. Do not send real customer messages during QA.

Manual checks: send a test enquiry; confirm the reference and staff log; test double submit/retry, invalid contact and consent; prepare Zalo without consent; VI/EN; desktop/mobile390; download/import vCard and scan printed QR. Physical phone scan and vCard import remain manual. Inbound Zalo/OA synchronization, automatic messaging and event-specific analytics remain deferred.
