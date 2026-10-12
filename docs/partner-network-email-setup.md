# Partner authentication email — setup checkpoint

12 October 2026. Resend free transactional email was selected for the initial pilot. The existing Resend account is accessible, but the verified domain in that account belongs to another project. It is not used for Hoàng Long.

Production Auth URL and exact redirects have been saved. A separate sending domain, `auth.hoanglongtra.com`, has its DNS setup prepared in Resend. Domain verification and SMTP are **not complete**. Authoritative DNS is hosted at Wix; ordinary root-domain mail uses Spacemail. Do not replace root MX, SPF, website A/CNAME or unrelated project credentials.

## Complete in the owner’s logged-in browser

1. Sign in to Wix and open `hoanglongtra.com` → Manage DNS records.
2. Add only the exact DKIM TXT and two sending CNAME records displayed in the current Resend domain setup. Keep existing records; use provider-default TTL. DNS values are not guessed or copied from a different domain. The private handoff contains the displayed values for this setup.
3. Confirm the records in Resend and require a **Verified** sending status. Leave receiving disabled. Keep authentication email link/open tracking disabled so one-time links are not rewritten.
4. Prepare a dedicated API key named `Hoang Long Supabase Auth`: **Sending access**, restricted to `auth.hoanglongtra.com`. The owner completes credential creation and privately copies the value directly to Supabase; never put it in chat, Git, the client bundle or a screenshot.
5. Supabase Auth → Emails → SMTP: sender `no-reply@auth.hoanglongtra.com`, name `Hoàng Long`, host `smtp.resend.com`, port `465`, username `resend`, minimum interval `60` seconds. Password is the dedicated key. The non-secret fields are prepared in the browser, but the configuration has not been saved. Do not enable an empty/unverified SMTP configuration.
6. Send one controlled owner/test login, verify delivery in Resend, actual inbox receipt and the same-device callback/application continuation. A submitted send request alone is not delivery evidence. Check an existing wholesale buyer’s login as well because SMTP is shared by Supabase Auth.
7. Before opening intake, review the production module and partner isolation. Keep `PARTNER_NETWORK_PUBLIC_REGISTRATION=false` until the pilot is approved. No invitation is sent automatically.

No paid subscription/overage plan, SMTP secret or customer message was created by this setup. Domain verification may require DNS propagation; verify visible status rather than assume completion.

Official references: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Wix DNS records](https://support.wix.com/en/article/managing-dns-records-in-your-wix-account).
