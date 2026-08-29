# House of Hoàng Long — web app

Next.js + Supabase production port of the `tra-hoang-long-app.jsx` prototype.
Public site (Our Story, Wholesale ordering, Shop, support chat) plus a
staff-only `/admin` console (Front Desk: orders, leads, messages, payment
settings, catalog, reviews, promo codes).

## 1. Prerequisites

- [Node.js LTS](https://nodejs.org) (20.x or newer) + npm
- A Supabase project (already created — URL and anon key are in `.env.local`)
- A Vercel account with the `hoanglongtra.com` domain already attached to it

## 2. Local setup

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the public site, http://localhost:3000/admin for
the staff console (will redirect to `/admin/login` until you've created a staff
account — see step 4).

`.env.local` already contains `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit this file (it's git-ignored).

## 3. Set up the Supabase database

In the Supabase dashboard, open **SQL Editor** and run these three files **in
order**, each as its own query:

1. `supabase/migrations/0001_schema.sql` — tables
2. `supabase/migrations/0002_rls.sql` — Row Level Security policies
3. `supabase/migrations/0003_functions.sql` — RPC functions used by the public
   site (order tracking, promo codes, chat, payment QR, reorder)

Then seed the starter content (wiki articles + tea catalog copied from the
prototype):

```bash
# add this line to .env.local first (Supabase dashboard > Settings > API > service_role)
# SUPABASE_SERVICE_ROLE_KEY=...
npm run seed
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only ever use it locally for this
script, never in the deployed app, and remove it from `.env.local` again once
you're done seeding if you want to be extra safe.

## 4. Create the first admin account

Supabase Auth is for internal staff only — customers never sign in.

1. In the Supabase dashboard, go to **Authentication > Providers** and turn
   **off** "Allow new users to sign up" (internal accounts should only be
   created by you, from the dashboard).
2. Go to **Authentication > Users > Add user**, create an account with an
   email + password for the first admin.
3. Copy that user's UUID, then in **SQL Editor** run:
   ```sql
   insert into staff_roles (user_id, role) values ('<paste-uuid-here>', 'admin');
   ```
4. That person can now sign in at `/admin/login`. Repeat step 2–3 for each
   additional staff member (manager/employee — the `role` value is stored for
   your own reference; every row in `staff_roles` currently gets the same
   full Front Desk access, see "Notes & deviations" below).

## 5. Deploy to Vercel

```bash
git add -A
git commit -m "Initial commit"
```

Then either push to a new GitHub repo and import it in the Vercel dashboard,
or run `vercel` from this folder if you have the Vercel CLI installed. Set the
same two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel
project's **Settings > Environment Variables** (Production + Preview). Set
`SUPABASE_SERVICE_ROLE_KEY` as a server-only variable as well; the staff and
carrier webhook API routes need it, but it is never exposed to browser code.

Once the Vercel project is live and building successfully, go to **Settings >
Domains** and move `hoanglongtra.com` from the old project to this new one.
**This replaces the live site — confirm you're ready before doing it.**

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

## 6. Test checklist before announcing the new site

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

After 30 seconds without a touch, click, key or scroll, the screen fades to warm
paper carrying a public-domain Chinese or Japanese painting, sunk in mist. Over
the next 80 seconds the mist thins and the picture comes into focus, then holds
until someone touches it. This runs for **every visitor on every page of the
public site** — it is not limited to the tea-room tablet.

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

Images are fetched live from the museums through `/api/artwork-image` and never
stored. That relay exists because the particle effect must read the real pixels
(`getImageData`), which browsers block on cross-origin images unless the host
sends `Access-Control-Allow-Origin` on the GET — and neither museum does.
Note that Met images *do* send it on HEAD, so `curl -I` suggests they would
work; they don't. Verify CORS in a browser, not with `curl -I`.

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
- **Staff roles aren't differentiated yet.** `staff_roles.role` is stored
  (`admin` / `manager` / `employee`) but every row currently grants the same
  full Front Desk access. Add role checks in `is_staff()` or in the UI later
  if you want e.g. employees to see orders but not edit payment settings.
