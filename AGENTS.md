# House of Hoàng Long — HL-001 working brief

**DRAFT · 26 October 2026 · Creative Director review pending.**

This file records the current authorized scope and a proposed working agreement.
The creative documents below are proposals, not an approved design or permission
to implement, merge or deploy them. The user's current instructions take precedence.

## Current task

Prepare the website audit and creative review packet on
`codex/website-reinvention`. No redesign application code, migrations, production
data changes, merge or deployment is authorized in this phase.

The only hosting configuration change in this branch is an exact-branch Vercel
deployment exclusion, needed to open a draft PR without an automatic preview.
Keep other branches and existing cron configuration unchanged.

## Proposed roles and approval record

- ChatGPT: Creative Director, responsible for reviewing and refining the vision,
  storyboard, visual system and acceptance criteria.
- Codex: audit, technical feasibility, implementation after authorization,
  verification and a candid report of limitations.
- The owner confirms company facts, image rights and commercial policy.

Do not describe the draft as approved because a PR exists, tests pass or an agent
likes it. Record the reviewed document revision and the actual approval reference
before implementation. Creative approval alone does not authorize a deployment.

## Read in this order

1. [Current-state audit](docs/vision/current-state-audit.md).
2. [Creative direction](docs/vision/creative-direction.md).
3. [Homepage storyboard](docs/vision/homepage-storyboard.md).
4. [Visual system](docs/vision/visual-system.md).
5. [Visual acceptance](docs/qa/visual-acceptance.md).

Read `design.md`, `tokens.css` and the relevant source files as the current
implementation baseline. The owner explicitly permits proposals beyond the old
Split Studio layout and motion restrictions. Do not silently rewrite the old
system or apply proposed global tokens to the running app in this draft phase.

## Business contracts to preserve

- Public routes, catalog IDs, live product availability, units and prices.
- Vietnamese/English locale handling and sanitized campaign attribution.
- Supabase clients, RPCs, RLS, consent, lead intake and existing sample/quote flows.
- Retail cart, checkout, bundles, volume benefits and partner referral consent.
- Partner access, ownership, commissions and private reconciliation information.
- Staff authentication, orders, payments, costs, procedures, inventory,
  notifications, reminders and all financial operations.

Never recreate these workflows in a decorative homepage form. Use existing
destinations and helpers. Never put service credentials, customer data or internal
margins in public components, fixtures, screenshots or review documents.

## Content and imagery

Use `lib/export-product-profile.js` for the four core teas. Do not alias the older
export-offer IDs or their prices to these catalog SKUs. Use the factual boundaries
and asset inventory in the audit; an owner-supplied statement is not independent
certification. Do not invent a founder biography, a person in a photograph,
factory ownership, clients, awards, laboratory values or export markets.

Photographs of leaves, equipment and people must be captioned for what they show.
AI beverage concepts and third-party branded drink photographs are not evidence
of Hoàng Long manufacturing. A missing portrait remains missing.

## Proposed implementation discipline, after approval

Keep changes scoped to the homepage and additive public presentation components.
List the exact files first. Shared navigation changes require checks on company,
catalog, wholesale and retail pages. Global shell changes need a separate reason
and explicit review; do not make the staff app inherit a theatrical marketing UI.

Prefer existing React/CSS capabilities and real responsive images. Add a motion
dependency only if an approved interaction cannot reasonably be built without it.
Preserve native scrolling, keyboard access and reduced-motion behavior.

Run checks proportional to the change, once after the final meaningful edits:
production build, relevant regression tests, navigation and accessibility checks,
and actual screenshots at 390, 768 and 1440 CSS pixels. A build is not a creative
review. Report failed or unavailable checks accurately; `npm run lint` currently
uses obsolete `next lint`, so it cannot be reported as a passing linter.

Current draft-only work needs document/link checks and review of the deployment
exclusion, not repeated application builds. Keep the PR in draft until reviewed.
