# Event contact V1

Public `/meet` is a reusable contact card for tea shows and partner meetings. `/meet/qr` provides a printable A5 card and downloads for the static website QR. The homepage footer and staff update log link to it.

Reuses the public site's Vietnamese/English locale provider, brand tokens/typefaces, existing Zalo and phone (0903 333 841), office/warehouse address, catalogue and sample-request paths. Contact downloads use UTF-8 vCard with phone, website and office address. No fictional event name, booth, date, certification, gift or promise is shown.

The optional form is a **local message composer**, not a lead submission. Visitors review the message, copy it, open Zalo, paste it and press Send themselves. Failed clipboard permission retains the editable message for manual copying. No customer data goes into a URL, QR or database; there is no automatic Zalo send, acknowledgement or Pipeline entry. Real sample requests continue through the existing sample form and its qualification/confirmation flow.

QR payload: `https://www.hoanglongtra.com/meet?utm_source=teashow&utm_medium=qr&utm_campaign=event_contact_v1`. Links to catalogue and samples forward only approved source/medium values and the fixed campaign, stripping arbitrary query data. QR scans, Zalo opens and copied messages are not reported as submitted leads or orders.

Static QR SVG/PNG are generated locally using ReportLab's QR encoder, with black modules and a four-module quiet zone; no third-party QR image service or additional production dependency. The QR opens the website contact page, not a Zalo login QR or a native personal profile QR.

No schema change or migration. Social/OA automation, inbound Zalo message synchronization and event-specific lead capture/analytics are deferred. The native Zalo account QR can replace/add a direct-contact code later if supplied by the owner.

Manual check: open `/meet` on desktop and phone; switch VI/EN; draft, edit, copy and paste a message into Zalo; download/import the vCard; open `/meet/qr`, print or download, and scan the website QR on a phone. Sending an actual message is the visitor's action, not part of automated QA.
