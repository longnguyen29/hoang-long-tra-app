# Hoàng Long Apps

Public website and retail checkout, staff CRM and order operations, and a partner portal. Keep the affected flow working from its normal entry point.

- Start with the relevant route in `app/`, UI in `components/`, business rules in `lib/`, and nearby tests. Read the feature-specific guide in `docs/` when it affects the task.
- For local work use Node.js 22.15+ and `npm ci`. Run focused checks while editing, then `npm test`, `npm run lint`, and a build when the change affects the application. Use isolated data for tests.
- Preserve existing order, price, payment and partner semantics unless the task changes them. Verify access at the server and database boundary for any data change.
- Keep credentials, customer conversations and other private records out of this public repo. Get explicit authorization before changing production data or services, sending customer messages, or deploying.
- Record the checks run and any behavior that still needs live verification.
