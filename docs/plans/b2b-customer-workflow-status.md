# B2B customer workflow — work in progress

This branch is **not ready to merge or deploy**. It contains preliminary calculation and progress rules plus an untested schema sketch; it does not implement the user-facing workflow. The schema sketch is deliberately outside `supabase/migrations` and must not be applied as-is.

## Existing integration points

- The CRM uses `trade_opportunities`; existing categories describe customer segments and do not indicate legal B2B status. Orders can be associated through quotation, wholesale account, explicit directory link or a unique contact. Ambiguous contacts must not be silently linked.
- `/admin/documents` is restricted to confirmed admin/manager users. Its existing tea order confirmation and delivery templates prefill from an order. Drafts currently remain on the device and signed documents are not stored there.
- `orders` distinguishes retail and wholesale. The Order Book and customer profile each have an existing detail view; the checklist belongs within these views.
- The local Green Hill reference found so far is a PDF, not the requested Green Hill–Legend Tea Word set. It has not yet been used as a contract template.

## Implemented in this branch

- Preliminary pure functions and tests for checklist progress, framework validity, explicit VAT rates, invoice issuance evidence and two confirmed product-name mappings. They are not yet wired into application screens or persisted.

## Remaining before production

1. Design and test durable customer/order linking, automatic initialization and historical migrations; resolve ambiguous ownership without guessing.
2. Complete the schema with immutable/versioned evidence and audit trail, ensure evidence references real private storage objects, secure upload/download with role checks, test RLS and privilege isolation, and create a proper migration. The present sketch is not adequate for production, in particular because it allows direct document updates and does not verify object existence.
3. Integrate Company Documents, saving editable drafts and separately preserving signed files; use verified reference documents where available. Configure legal entities and bank accounts privately, not in Git.
4. Add customer/order UI, B2B classification, per-order next action and overview; support issued invoice metadata and editable official product names including Trà Nhài. Confirm whether existing prices include VAT before calculating an invoice.
5. Run security and integration tests, production build with required environment, mobile/desktop QA, and verify a safe end-to-end flow before merging, applying the migration and deploying.
