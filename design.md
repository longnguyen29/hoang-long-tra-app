# Design — House of Hoàng Long

A locked design system for the customer website, staff operations console, and
supporting editorial pages. Every redesign reads this file before changing UI.
The system preserves working product behavior and changes presentation in
controlled slices.

## Genre

Editorial on public surfaces; utilitarian within staff surfaces. Both share one
quiet, botanical identity rather than behaving like separate brands.

## Macrostructure family

- Marketing and commerce pages: **Split Studio**. Text and real evidence—tea,
  garden, packing, or product—share the frame. On narrow screens, evidence
  follows its explanation.
- App pages: **Workbench**. Staff see state, next action, owner, and time before
  decorative or secondary information.
- Content pages: **Long Document**. A readable 60–65ch measure, honest headings,
  and images inside the reading flow.

## Theme

- `--color-paper`: `oklch(96% 0.012 82)`
- `--color-paper-2`: `oklch(92% 0.018 82)`
- `--color-paper-3`: `oklch(88% 0.021 82)`
- `--color-ink`: `oklch(22% 0.028 155)`
- `--color-ink-2`: `oklch(36% 0.035 155)`
- `--color-muted`: `oklch(48% 0.022 150)`
- `--color-rule`: `oklch(78% 0.022 90)`
- `--color-rule-2`: `oklch(86% 0.017 90)`
- `--color-accent`: `oklch(52% 0.115 72)`
- `--color-accent-ink`: `oklch(20% 0.026 155)`
- `--color-focus`: `oklch(56% 0.19 48)`
- `--color-danger`: `oklch(48% 0.145 29)`

Paper carries warmth. Jade carries hierarchy. Brass identifies one meaningful
action or selected state per view. Lacquer is reserved for risk and exceptions.

## Typography

- Display: Newsreader, weight 500–700, roman
- Body and interface: Inter Tight, weight 400–700
- Seal outlier: Noto Serif SC and the existing `TMCOngDo` asset, brand only
- Display tracking: `-0.025em`
- Type-scale anchor: `--text-display: clamp(2.75rem, 6vw, 6.5rem)`

## Spacing

The named 4-point scale in `tokens.css` is mandatory for new CSS. Existing
inline values migrate to it slice by slice; no large mechanical rewrite.

## Motion

- Easings: `--ease-out`, `--ease-in`, and `--ease-in-out` from `tokens.css`
- Public reveal: opacity plus no more than 8px of spatial travel
- Staff changes: immediate state change; motion only explains reordering
- Reduced motion: opacity-only, at most 120ms

## Microinteractions stance

- Silent success for ordinary saves
- Undo for reversible removal; explicit confirmation for irreversible actions
- Focus is instant and visible
- Loading retains the action label or replaces predictable content with a skeleton
- Hover never carries functionality unavailable to touch or keyboard users

## CTA voice

- Primary: deep jade field, rice-paper text, compact corners, verb-first label
- Secondary: paper field with a jade rule
- Editorial links: underlined text with a directional arrow when navigation is not obvious

## Per-page allowances

- Marketing pages may use supplied photography; never invented customer proof.
- App pages must not use decorative enrichment. Function carries the page.
- Content pages use typography and supplied archival imagery only.

## What pages MUST share

- The seal and House of Hoàng Long wordmark
- Palette, typography, spacing, focus, and interaction-state vocabulary
- Button/input heights and status semantics
- Error, empty, loading, and success language

## What pages MAY differ on

- Content density appropriate to customer versus staff work
- Section composition within the declared page family
- Photography crop and placement on public pages

## Migration order

1. Shared tokens, document shell, focus, type, and motion.
2. Public home and commerce navigation without changing data behavior.
3. Staff `/admin` information architecture and component extraction.
4. `/ops` migration from standalone document toward shared app foundations.
5. Campaign, sample, privacy, and authentication pages.
6. Apply the proven staff system to `hoang-long-quan-ly` as a separate branch.

## Exports

The canonical CSS export is [`tokens.css`](./tokens.css). Other formats will be
added only if a consumer needs them; duplicated unused exports become drift.
