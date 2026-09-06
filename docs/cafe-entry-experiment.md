# Café acquisition entry — unpublished review

Base: `7a7916a4277523531b6be96f2a934fd343cb83cb`. Branch: `codex/cafe-acquisition-review`.

This additive route tests whether a simpler drink-first entry helps café prospects understand the existing Menu Lab before requesting samples. `/cho-quan` is a candidate acquisition destination; `/sample/menu-lab` is the direct control. The live homepage and sample route are unchanged. Do not add it to navigation or replace the homepage without a separate decision.

## Implementation

- Reuses `recommendMenuLab` and the public catalogue. Reference costs never imply a wholesale quote, whole-drink COGS, or available lot stock.
- Fixed 500 ml preview matches the existing Menu Lab default. The visitor can change size and character there.
- `cafeSampleHref` carries only bounded UTM fields and validated use/character IDs. Missing attribution defaults to website/owned. Arbitrary query fields, contact details, and unregistered experiment codes are not copied.
- Both pages use existing sample submission behavior; this page has no form or new customer-write API.
- Calls the existing conversion RPC with allowed event names: `home_view` / placement `cafe_entry_v1`, `trade_brief_started` / `cafe_entry_<drink>`, `home_sample_clicked` / `cafe_entry_handoff`. Treat these as coarse funnel checkpoints, not Meta Lead events. Localhost recording is suppressed.
- Use the existing anonymous session identifier to deduplicate by visitor and period. A visitor can try multiple drink directions; summing choice events is not a person count.
- The existing analytics system does not establish durable campaign → sample → order attribution on its own. Reconcile the earlier Pixel PR and source fields before paid launch.
- Public prices load with a ten-second timeout and retry. Missing, unavailable or invalid prices display a confirmation message. Recipes remain clearly marked as starting points.
- A supplied House drink photo illustrates a tea application; it is not claimed to depict every reference recipe.
- The route is `noindex`, absent from sitemap/navigation and has no idle-screen overlay.

## Verification

`node --test lib/cafe-entry.test.mjs lib/menu-lab.test.mjs lib/public-attribution.test.mjs`

`npm run build` with normal public Supabase configuration (or placeholders for build-only checks).

Check mobile 320, 375, 414 and 768 widths, desktop, VI/EN, radio keyboard selection, catalogue loading and failure, and the outgoing URL's UTM/use/character values. Do not create sample records against production just to test this route.

## Business review

At the stated 50,000₫ daily allowance and 3–5 prospects weekly, prefer a simple directional test. Do not divide the small audience between many creatives and pages at once. First review/approve assets, then publish the unlinked variant only with permission. Organic posts and paid campaigns require their own approval. No spending is authorized by this document.

Compare qualified sample requests per unique visitor and staff effort, then track first and repeat orders. Preserve comparable creative, audience, channel, offer and time when comparing destinations. Treat small or sequential samples as inconclusive, not statistically proven winners. A variant may lose by adding a step before the existing sample flow.
