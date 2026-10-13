# Partner authentication email — setup checkpoint

13 October 2026. Resend transactional email is configured for the existing Supabase Auth service. The dedicated sending domain `auth.hoanglongtra.com` was verified; the owner saved the sending key privately in Supabase SMTP. A controlled owner's login email was recorded as Delivered in Resend during setup. This does not yet verify the first external partner's inbox or invitation acceptance.

SMTP uses sender `no-reply@auth.hoanglongtra.com`, name `Hoàng Long`, host `smtp.resend.com`, port `465`, username `resend`, and minimum interval 60 seconds. The sending key stays in Supabase's credential field; never put it in chat, Git, a screenshot or a browser bundle. Root mail and website DNS were preserved. No further DNS or SMTP setup is required for the private invitation route unless an actual provider error is observed.

## Private pilot

The owner chose invitations for a few people, with public registration remaining closed. Managers use `/admin/partner-network` → **Đăng ký & đối tác** → **Mời riêng đối tác**. New accounts receive Supabase's invitation email when the manager clicks Send. Existing accounts receive permission to complete their own pending application without another invitation email; they use the normal partner login. Inviting never approves a partner or grants access to another partner's leads.

The exact production redirect `https://www.hoanglongtra.com/partners/auth/invite` was added to Supabase's URL allowlist. The previous five redirects were retained: partner PKCE callback with/without `next`, `/partners/account`, `/partners`, and `/admin/work`. The existing invitation email template remains unchanged so employee invitations are preserved. See [private pilot implementation and QA](partner-network-private-pilot.md).

Keep `PARTNER_NETWORK_ENABLED=true` and `PARTNER_NETWORK_PUBLIC_REGISTRATION=false`. The server invite endpoint and acceptance page need no new credentials or database migration. No real invitation email was sent while implementing this feature.

Before the pilot, the owner should invite one real authorized participant, check inbox/spam, open the invite on the recipient's phone, complete the application, and verify it appears pending in the admin list. Also check normal login after the first acceptance. An accepted send command is not proof of inbox receipt; review Resend delivery status if necessary.

Official references: [Resend SMTP](https://resend.com/docs/send-with-smtp), [Supabase invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail), [Supabase sessions](https://supabase.com/docs/reference/javascript/auth-setsession), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
