# Hoàng Long Customer Memory — staff-only pilot

This is a real, database-backed feature, not the static prototype.

## What works after deploy and migration
- Visit /admin/customer-memory as an admin/manager (existing Supabase Auth role).
- Paste a Zalo personal chat, Facebook exchange, call notes, or tasting feedback. Add later messages to the same customer from the right page.
- The server stores each message in a private Supabase table, generates a suggested reply with OPENAI_API_KEY, and remembers customer preferences, historical quoted prices, sample feedback and commitments with a literal quote that the app checks against the conversation. Staff still verify that the quote supports the AI’s interpretation.
- Suggested replies are drafts, NOT external customer messages. Editing, approval, copy and snooze work in the CRM. Telegram can notify with an inline approve/snooze button.
- Messenger Page inbound events can arrive automatically when the Meta webhook is subscribed. Personal Zalo cannot be monitored with the Zalo OA API.

## Database and deployment
1. Deploy from a reviewed pull request. Do not commit real conversations, page IDs, tokens or bot credentials to this public repository.
2. Apply **supabase/migrations/0103_customer_memory_inbox.sql** to the same Supabase project as the main Hoàng Long app. It uses manager-only SELECT RLS; only server/service_role writes.
3. For the optional Mac bridge, also apply `supabase/migrations/0104_customer_memory_personal_bridge.sql`. Deploy to Vercel, preserving existing server env NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
4. Reuse OPENAI_API_KEY already configured for /admin/assistant, or set it as a server-only Vercel environment variable. Optionally set CUSTOMER_MEMORY_MODEL (defaults to gpt-5-mini). Never put credentials in NEXT_PUBLIC_ variables.
5. Confirm /admin/customer-memory opens for an admin/manager. Start with a fictional customer (no personal data) and test a copy/approve flow. Then add a real conversation with the customer's ordinary business communications under the business's data/privacy policy.
6. Verify customer records do not appear to unauthenticated users. Check mobile layout.

## Telegram notifications (optional but recommended)
1. Create a **dedicated bot** with @BotFather; note its token in private password manager. Set CUSTOMER_MEMORY_TELEGRAM_BOT_TOKEN, CUSTOMER_MEMORY_TELEGRAM_CHAT_ID in Vercel. Set CUSTOMER_MEMORY_SITE_URL=https://hoanglongtra.com, or the correct admin host.
2. A dedicated bot is recommended because each Telegram bot has only one webhook. Existing order alerts can continue using TELEGRAM_BOT_TOKEN independently.
3. For inline approvals/snooze: generate a long random secret (letters/digits/_/- only), set CUSTOMER_MEMORY_TELEGRAM_WEBHOOK_SECRET, then configure:
   POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
   JSON: {"url":"https://hoanglongtra.com/api/webhooks/customer-memory/telegram","secret_token":"<SECRET>","allowed_updates":["callback_query","message"]}
   This request should be made only in a secure terminal/private API client, never in GitHub.
4. Telegram callbacks require the configured chat ID. For a private DM they also require the user ID to equal the chat ID. For a group set CUSTOMER_MEMORY_TELEGRAM_USER_ID to restrict approvals to the owner.
5. In a **private chat** with the dedicated bot, send:
   /khach Anh Minh
   Khách: Mẫu trà hôm trước...
   Mình: Đã báo ...
   The bot saves the conversation as a new personal-Zalo memory and returns a draft. Use /them <thread-UUID> followed by a newline and new transcript to add to an existing record. /help shows the commands. This is manual copy/paste, **not Zalo auto-reading**.
6. Inline **Duyệt nháp** means internal approval only. It does **not** send a Facebook or Zalo reply. The owner copies/sends using the original channel after reviewing.

If you already use the main TELEGRAM_BOT_TOKEN, a minimal notification without customer identity or conversation text can fall back to that token/chat. Detailed contextual drafts and inline approval need a dedicated bot and private chat. Never set a webhook on the shared order-notification bot.

## Facebook Page Messenger webhook (optional)
1. Create/configure a Meta Developer App with Messenger Webhooks for the **business Page**. Enable the required app permissions and review/advanced access where needed.
2. Set server-only: META_APP_SECRET, META_MESSENGER_VERIFY_TOKEN (random), META_MESSENGER_PAGE_ID.
3. Configure callback URL: https://hoanglongtra.com/api/webhooks/customer-memory/meta. Use META_MESSENGER_VERIFY_TOKEN for GET challenge verification.
4. Subscribe the Page to relevant **messages** events. Confirm a real Page message creates one private thread and one draft. Verify duplicate webhook deliveries are ignored.
5. Each delivery can ingest up to 50 eligible text events. The webhook attempts up to three drafts immediately. Further drafts stay pending for the daily cron or manual regeneration in the staff UI.
6. Existing Page access controls and Meta platform messaging policy still apply. The pilot does not send messages outward via Meta APIs.

## Limitations and guardrails
- **Personal Zalo.** Manual paste or forwarding works without a bridge. An optional Mac listener can forward inbound text from selected chats using an unofficial client. Review the [bridge setup and account risks](../tools/zalo-personal-bridge/README.md) before enabling it. Use the OA webhook for an authorized Zalo Official Account.
- **No automatic customer send.** Internal approval is not proof that the customer has received a message.
- Historical prices are evidence only; do not assume they apply to new quantities. Human approval of offers is required.
- Webhook and API errors are designed to avoid secrets in error payloads and logs.
- Customer content is retained in your Supabase database; configure retention, access logging, deletion and staff offboarding before broad rollout.
- Confirm your customer data processing notices, contractual and privacy obligations before automatically ingesting conversations.
- The existing website repository is **public**, so the only acceptable place for credentials and real customer records is server-side encrypted configuration and the secured database, never Git.

## Daily follow-up reminders and catch-up
Vercel Cron runs at 02:00 UTC (09:00 Vietnam). Follow-up snooze sets a due timestamp 24 hours later; notification occurs on the **next** scheduled daily run after that due time, not precisely at the due timestamp. The cron also retries a small number of interrupted AI drafts. This is the only customer-memory reminder cron. With Telegram not configured, due tasks remain in the staff inbox.
