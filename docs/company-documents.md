# Tài liệu công ty

Route: `/admin/documents`. Available to verified staff managers/admins only. It is linked from the internal navigation and from an approved partner's card in Partner Network (`Soạn thỏa thuận hoa hồng`). Public partner signup remains closed.

## V1 workflow

1. Choose an agreement for customer referrals/commissions, a mutual NDA, or commission reconciliation minutes.
2. Optionally prefill the approved partner's public business/contact details and agreed first/repeat rates. A trading name, contact person or operating region is never inferred to be a legal entity, authorised signatory or registered address.
3. Complete the legal identities and commercial facts; edit the supplied proposed clauses as needed. Unknown rates, dates, expenses and cash exclusions remain blank rather than silently becoming zero.

For the referral agreement, **Mức hoa hồng mẫu** uses the same explicit presets as Partner Network: referral 3% first / 1% for three repeat orders; assisted sale 5% first / 2% for three repeat orders; bulk/export negotiated clears rates for a separate agreement. Choosing a preset only edits the current draft. Editing rates remains possible. It does not overwrite saved partner conditions or extend an existing entitlement.
4. Review the A4 preview, acknowledge the review and use **In / lưu PDF** (native print, choose Save as PDF). Essential missing fields and invalid amounts prevent the normal export action. The printable document is always marked as an unsigned draft; it is not a payment instruction or an executed agreement.
5. Download `.txt` for further editing, or download/reopen a private `.json` draft to continue on another computer. Downloading is not an upload or cloud save. Keep these files private. The app does not send documents to the partner.

## Integration and access

- SSR `getUser()` verifies the account, confirmed email and its own `staff_roles` row before rendering the builder or fetching partner information.
- The optional partner selector uses the existing manager RLS, approved-only SELECT and an explicit projection, bounded to 200 records. It does not call `partner_network_admin_snapshot()`, which synchronizes order links.
- No service credentials, internal margins/costs, bank information, review notes or customer lists enter the builder.
- Download and print do not approve partners, mutate commission rules, reconcile production data, create payments or persist signed records. Reconciliation minutes calculate an explicitly entered group of orders with one agreed rate; they do not replace the existing commission ledger.
- No migration, new environment variable, external PDF service or runtime dependency is required.

## Template review

The user must supply the verified Hoàng Long legal entity, tax ID, registered address and authorised representative. These are not available in the existing public company settings. Public brand contact is reused, not treated as legal identity.

The referral agreement expressly proposes calculating commissions on collected revenue excluding VAT, customer-billed shipping, refunds and cancelled orders, with a bounded repeat-order entitlement. The minutes require each exclusion, including an explicit zero when appropriate; instructions warn against deducting the same refunded/cancelled or tax/shipping amount twice. Different commission rates need separate breakdowns.

Contract structure was cross-checked against the primary reproduction of [Civil Code 91/2015/QH13, Article 398](https://www.wipo.int/wipolex/en/legislation/details/17200). The templates do not claim a legal review, invent statutory rates/tax treatment or replace the parties' agreement and review.

## Bulk/export packing

`lib/b2b-packing.js` centralizes the owner's listing: **PP/PE sacks of 20, 30 or 35 kg**, adjustable for tea appearance and intended use, confirmed in the quotation. Company profiles, export sales briefs, B2B catalog/wholesale/event pages and their related PDFs use this note separately from actual SKU/sample packs. Retail SKU sizes, units, checkout and prices are unchanged.

## Focused QA

- Signed-out, unconfirmed-email and non-manager accounts cannot receive the builder/partner projection.
- Switching partners clears the previous partner's legal/signatory fields and rates.
- An unknown rate is blank; an agreed zero remains zero. A repeat-order limit of zero excludes repeat commission.
- Missing required fields, invalid dates/percentages, out-of-range adjustments and unknown cash exclusions block export.
- JSON drafts round-trip, unexpected fields are discarded, corrupt/oversized files show an error; text is rendered as text rather than HTML.
- A4 print contains only the document, signature areas and draft status, without navigation/editor/locale controls. Inspect Vietnamese glyphs and page breaks.
- Manually check the phone layout and native Save as PDF/share flow on iPhone/Android.

## Deferred

Cloud draft/history storage, signed-file archive, Drive sync, electronic signatures, automatic messaging and general contract management are deliberately outside this small V1.
