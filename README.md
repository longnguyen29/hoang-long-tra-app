# House of Hoàng Long — web app

Next.js and Supabase power the public tea catalogue, B2B enquiries and retail
orders, the staff console at `/admin` and the partner portal at `/partners`.

## Local development

Use Node.js 22.15+ (CI uses Node 22) and npm.

```bash
npm ci
cp .env.example .env.local  # for a new checkout with no existing .env.local
npm run dev
```

Point the Supabase settings at a development or staging project. Read-only
public pages can render without live integrations, but checkout, staff sign-in
and other database-backed flows need a correctly configured database.

```bash
npm test
npm run lint
npm run build
```

`npm test` includes the existing payment-reversal SQL test on an isolated
PGlite database. See [Partner Network QA](docs/partner-network-qa.md) for the
standalone database checks. Tests use fixtures or local database engines.

## Database and staff access

`supabase/migrations/` is the ordered schema history. The initial three files
only cover the original schema. For a fresh test database, use the current
migration sequence in order and check the project-specific setup for integrations
that need credentials, extensions or schedules. Compare the applied migration
history before changing an existing project.

Staff sign in through Supabase Auth. Provision staff accounts deliberately,
then assign their documented role in `staff_roles`. Test with a staff user and a
partner user. Partner registration is controlled separately by the settings in
`.env.example`. For optional starter data, inspect `scripts/seed.mjs` before
running `npm run seed` against an isolated database.

## Deployment and integrations

Set the public Supabase URL and anon key for the intended project. The service
role key is used by trusted server code and seed tooling. Keep it server-only
and out of Git, along with integration credentials. See `.env.example` for the
environment variables and [Customer Memory setup](docs/customer-memory-live-setup.md)
for its messaging channels and reminders.

### Carrier delivery updates

Run `supabase/migrations/0040_carrier_delivery_updates.sql`, then configure the
carrier partner accounts with these production webhook addresses:

- Viettel Post: `https://www.hoanglongtra.com/api/carriers/viettel-post`
- Vietnam Post: `https://www.hoanglongtra.com/api/carriers/vietnam-post`

For Viettel Post, generate a long random `VIETTEL_POST_WEBHOOK_SECRET`, set it
in Vercel and enter the same value in the Partner webhook configuration. Vietnam
Post requests are checked with the RSA public key published in MyVNP's webhook
documentation; `VIETNAM_POST_WEBHOOK_PUBLIC_KEY` is only needed if Vietnam Post
rotates that key. In the staff order drawer, choose the carrier and save its
tracking code. Authenticated carrier updates are written to the order timeline;
only an explicit delivered code moves the order to **Hoàn tất**.

### Zalo delivery notices

When an authenticated carrier update first moves an order to **Hoàn tất**, the server
queues one Zalo ZBS Template Message to the Vietnamese phone number in the order. If the
order has an open/partial receivable, the `delivered_due` template receives the exact
remaining balance; otherwise the `delivered_paid` template only confirms delivery. This
keeps payment reminders tied to the receivables ledger instead of guessing from the order's
payment method. Invalid or missing phone numbers are skipped, and `(channel, event_key)` is
unique so carrier retries cannot message a customer twice.

Create and approve two ZBS templates with these exact variables:

- `customer_name`, `order_code`, `tracking_code`, `delivered_at`, `tracking_url`
- the due template additionally displays `amount_due`

Set the six `ZALO_*` values documented in `.env.example`, then apply migration `0041`.
The initial refresh token is used once; every replacement refresh/access token is stored in
the service-role-only `zalo_oauth_tokens` table. Delivery attempts and provider message IDs
are recorded in `customer_notifications`.

## Manual smoke checks

- [ ] Place a test wholesale order and a test retail order
- [ ] Sign in at `/admin` and confirm the orders show up in Front Desk
- [ ] Set payment/bank details in Front Desk > Payment, confirm the VietQR
      code renders after a test checkout
- [ ] Print an invoice from Front Desk > Orders
- [ ] Send a message via the floating chat widget as a visitor, reply as admin
- [ ] Track an order by ID from the Wholesale / Shop page
- [ ] Confirm `/admin` is unreachable without logging in (open in a private
      window)
- [ ] Generate a QR code pointing at `https://hoanglongtra.com` for the tea
      room (any QR generator — this isn't part of the app)

## Idle screen

Enable the idle screen on a tea-room device with `?kiosk=1`. After 30 seconds
without input, it shows a public-domain painting and gradually brings it into
focus. The screen stays off on a device until enabled there.

Nothing travels across the screen and the picture is never assembled. Earlier
versions built it from dots, and later painted it in with brush strokes sweeping
from several directions; the strokes crossed at angles and read, in the owner's
words, as a hand crawling over the paper. Motion is what made it unsettling, so
there is none — the painting sits still and only its sharpness changes.

`?paint=<seconds>` shortens the reveal so it can be judged quickly, e.g.
`?idle=2&paint=20`. Unlike the settings below it is **not** remembered, since a
fast reveal left on by accident would be worse than no preview at all.

These are typed into the browser's address bar (they are URLs, not terminal
commands), and each is remembered on that device:

| Address | Effect |
| --- | --- |
| `…/?kiosk=0` | turn the idle screen **off** on this device |
| `…/?kiosk=1` | turn it back **on** |
| `…/?idle=60` | wait 60 seconds instead of 30 |

Two deliberate exceptions:

- It never appears while a text field, textarea or select has focus, so it
  cannot cover a half-typed address or note. At 30 seconds this matters — filling
  in checkout involves long pauses with no pointer movement.
- It is not mounted on `/admin`. Staff reviewing orders would otherwise be
  interrupted every half minute.

The painting changes daily — day-of-year modulo the twelve works in
`lib/artworks.js`, so it cycles without anyone touching it. To change the
rotation, edit that list; each entry is a Met object ID or a Cleveland accession
number, and titles and artists come from the museums' own APIs.

Museum images are served through `/api/artwork-image`, with upstream fetch
revalidation managed by the route. The idle screen animates image sharpness.

## Notes & deviations from the original brief

- **AI auto-reply (Anthropic) was left out of this v1** per your choice — the
  support chat is fully working, just without an automatic first reply. The
  original `generateAIReply` logic is easy to re-add later: create a Next.js
  API route that calls the Anthropic API server-side (never from the browser,
  since that would expose the key) and wire it into `sendChatMessage` in
  `components/TeaConsole.jsx`.
- **`support_threads` has no direct anon table policy.** The brief asks for
  anon `INSERT`-only access, but a single `INSERT`-only policy can't support a
  back-and-forth conversation (the customer's second message would need to
  *update* the first row, not insert a new one). Instead, all customer chat
  actions go through two `SECURITY DEFINER` RPCs
  (`submit_customer_message`, `get_customer_thread`) that are scoped to one
  thread by a random per-browser `customer_id` — a customer still can't list
  or read anyone else's conversation, but multi-message chat actually works.
- **`promos` and `settings_payment` are not publicly readable tables**, even
  though the original prototype loaded them wholesale into the browser. A
  full promo-code list or the raw payment settings table isn't something a
  public site should expose. Customers instead validate one promo code via
  `apply_promo_code(code)` and fetch payment/QR details via
  `get_payment_info()` — both return only what's needed, never a full list.
- **`track_order` returns only `id` + `status`**, not the customer's name,
  address, etc. — someone who has (or guesses) an order ID only sees shipping
  progress, matching what the UI actually displays.
- **`reorder_lookup` (phone/email → last order) is a privacy trade-off worth
  knowing about:** anyone who enters a real customer's phone number or email
  can see that customer's last order (name, address, items). This mirrors a
  feature in the original prototype; if that's a concern, consider removing
  the "Ordered before?" box (`components/ReorderBox.jsx`) from the public
  pages, or gating it behind a one-time code sent to the customer.
- **Staff roles differ.** Admin and manager are recognized by `is_staff()`.
  Employees use the work area and its dedicated access rules. Some sensitive
  actions require admin specifically.
