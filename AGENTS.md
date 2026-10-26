# House of Hoàng Long — Working policies

**DRAFT v0.2 · 26 October 2026 · Policy proposal awaiting review.**

This document proposes durable brand, truthfulness and engineering policies.
It does not authorize a task, implementation, merge, deployment or production-data
change. The user's current instructions take precedence over this draft.

## Resolve the current phase before acting

Read the latest authorized task and its relevant dated decision record. For the
HL-001 concept revision, see
[26 October 2026 — concept revision](docs/vision/decisions/2026-10-26-hl-001-concept-revision.md).
Dated records describe the authority and evidence at that time; they are not
permanent bans on later explicitly approved work. Record a new decision when the
phase changes rather than leaving a temporary no-code instruction in this file.

## Brand and creative authority

The proposed brand idea is a living Vietnamese tea house with the credibility
of a manufacturer and the utility of a procurement platform. Serious distributors,
manufacturers, chains and importers are the primary commercial audience; the
heritage retail collection remains accessible with supporting emphasis.

ChatGPT serves as Creative Director for the vision, storyboard, visual system and
design compositions. Codex owns execution, feasibility and verification. The owner
confirms business facts, image permissions and commercial policy. Do not conflate
these roles: creative approval is not factual verification, signing authority,
permission to change financial logic or authorization to deploy.

Use the latest explicitly approved, home-scoped vision for an authorized homepage
implementation. Its recorded exceptions may supersede the legacy composition,
type, palette and motion constraints in `design.md` for that scope. Until approval,
new creative documents are proposals. Neither a skill's aesthetic defaults nor
legacy Split Studio guidance may silently veto a later approved scoped direction.
Existing global tokens and staff/commerce semantics remain the baseline outside
the approved scope; do not replace them through an unreviewed global override.

## Review snapshots and approval references

Before implementation, retain a review snapshot containing the exact commit,
document versions, visual-composition filenames/dimensions, known asset gaps,
factual limits and the Creative Director's verdict/reference. Link amendments to
the review requirements they address. Keep before screenshots, static proposed
compositions and screenshots of implemented UI unmistakably separate.

Approval must name what is approved and for which phase. A draft PR, a passing
build, silence or Codex's self-rating is not approval. If the direction changes
materially after approval, retain the old snapshot and obtain review of the new
composition. Implementation completion, creative acceptance, merge and deployment
are distinct events, each reported accurately against the authority available.

## Business contracts to preserve

- Public routes, catalog IDs, live product availability, units and prices.
- Vietnamese/English locale handling and sanitized campaign attribution.
- Supabase clients, RPCs, RLS, consent, lead intake and sample/quotation flows.
- Retail cart, checkout, bundles, volume benefits and partner referral consent.
- Partner access, ownership, commissions and private reconciliation information.
- Staff authentication, orders, payments, costs, procedures, inventory,
  notifications, reminders and all financial operations.

Keep these boundaries unless the user specifically authorizes a change to them.
Do not recreate a business workflow as a decorative homepage form. Reuse existing
destinations and helpers. Never put service credentials, customer data or internal
margins in public components, fixtures, screenshots or review documents.

## Truthful content and images

Reuse `lib/export-product-profile.js` for the four core teas. Do not alias the older
export-offer IDs or their prices to the canonical catalog SKUs. Keep owner-supplied
statements distinct from independent verification. Do not invent factory ownership,
founder biographies, photo identities, clients, awards, laboratory values, capacity
evidence, certifications or export markets.

Caption photographs for what they actually show. A leaf-handling image is not a
named portrait; an archive collage is not a single panoramic factory photograph.
AI beverage concepts and third-party branded drink photographs are not evidence
of Hoàng Long manufacturing. A missing real asset stays missing, with an honest
composition or explicit release limitation instead of synthetic proof.

## Engineering and verification

List the intended files and contracts before implementation. Prefer scoped or
additive presentation work. Shared navigation changes require regression checks
on company, catalog, wholesale and retail pages; global-shell changes need an
explicit reason and review. Do not make staff tools inherit theatrical home UI.

Prefer existing React/CSS capabilities and responsive real images. Justify a new
motion dependency against the approved interaction. Preserve native scrolling,
keyboard access, useful focus states, touch usability and reduced motion.

Run checks proportional to the change after final meaningful edits. Documentation
needs document/link and scope checks; application changes need an appropriate
production build, relevant regressions, navigation/accessibility checks and actual
responsive screenshots. Report failed or unavailable checks; do not call a build
a visual pass or an unsupported `next lint` command a passing linter.

## Publishing discipline

Inspect actual branch/build automation before pushing or opening a PR. A draft PR
does not inherently suppress previews. Preview and production publication require
the applicable authorization; local-only review is the fallback when publication
is not authorized. Keep deployment exclusions narrowly scoped and record their
review/removal conditions in the relevant decision record. Do not disable unrelated
branches, change existing crons or infer deployment permission from creative approval.
