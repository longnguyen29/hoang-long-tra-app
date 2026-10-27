# HL-001 — Concept revision task and deployment lifecycle

**DRAFT v0.2 · 26 October 2026 · Concept revision only; not approved for implementation.**

> **SUPERSEDED TASK AUTHORITY:** Round 2 was rejected. A/B/C are NOT APPROVED;
> Working Tea Atlas is retired. The creative-production permissions below are
> historical. Follow the [current rejection/waiting decision](hl-001-awaiting-creative-reference.md).

This is a dated task/decision record, not a permanent repository-wide no-code
policy. A later explicitly authorized phase should receive its own record and
approval reference. Stable working policies belong in [AGENTS.md](../../../AGENTS.md).

## Authority and review snapshot

| Item | Recorded state |
| --- | --- |
| Work item | HL-001 — House of Hoàng Long Homepage Reinvention, concept revision. |
| Repository / branch | `longnguyen29/hoang-long-tra-app` / `codex/website-reinvention`. |
| Review PR | [PR #48](https://github.com/longnguyen29/hoang-long-tra-app/pull/48), remains draft. |
| Reviewed snapshot | `f7a19b959b8890e6df2351418f02178f993320c1`, first DRAFT documentation packet. |
| Creative Director reference | [Review comment 6409274323](https://github.com/longnguyen29/hoang-long-tra-app/pull/48#issuecomment-6409274323). |
| Verdict | **REVISE** — technical/factual baseline accepted; visual concept and opening copy not approved for implementation. |
| User's current authorization | Address R1–R9 on the same PR with revised DRAFT documents and actual visual concept evidence; return for review round 2. |
| Implementation authority | **NONE in this phase.** No redesign application code, migrations or production-data changes. |
| Merge / deployment authority | **NONE in this phase**, including public preview deployment. |

The Creative Director accepted the audit, product-ID separation, factual provenance,
integration safeguards and honest test limits as a baseline. That acceptance does
not approve the original hero, storyboard or a safe variation of the old aesthetic.

## Permitted revision deliverables

Update the creative direction, independent VI/EN openings, storyboard, visual
system and acceptance criteria. Produce static annotated design compositions for
creative evaluation, including desktop/mobile versions, an alternative opening,
and product/craft/manufacturing detail. These are **proposed static compositions**,
not screenshots of an implemented or published website. Preserve evidence and
asset provenance; do not fabricate photographs to fill missing documentary proof.

Keep the existing business/data behavior and prior application source unchanged.
Push only concept materials and supporting artifacts within this authorized
revision scope to the existing branch. Record which R1–R9 requirement each artifact addresses.
Do not merge the PR, mark the concept approved or start implementation merely
because all requested artifacts have been supplied.

## Gate to a later implementation phase

The round-2 review packet should identify its exact Git commit, DRAFT document
versions, composition paths/viewport sizes, selected and alternative directions,
Release A/B asset limits and unresolved factual questions. The Creative Director
must explicitly approve a particular responsive composition and scope or request
further changes. Retain that reference alongside the snapshot; do not overwrite
the prior REVISE verdict or imply that it became an approval.

After creative approval, obtain or identify the user's applicable implementation
authorization and create a new dated phase record. List the planned source files,
protected contracts, local test plan and publishing authority. Old phase-specific
“no code” restrictions then remain historical, rather than indefinitely blocking
newly authorized work. Creative approval alone still authorizes neither merging
nor publishing a preview/production deployment.

## R9 — Exact-branch deployment exclusion lifecycle

Current `vercel.json` contains:

```json
{
  "git": {
    "deploymentEnabled": {
      "codex/website-reinvention": false
    }
  }
}
```

This excerpt documents only the exclusion; it is not a replacement for the full
file. Preserve the existing cron entries and any unrelated settings. No change
to the exclusion is authorized or performed by this concept revision.

[Vercel's branch configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled)
controls automatic deployment by branch. Draft status is not a deployment control.
Unspecified branches retain their existing behavior; this exclusion does not
disable `main`, a differently named implementation branch or manual publication.
Inspect the effective configuration before any future branch push or merge.

| Later state | Required handling |
| --- | --- |
| Current draft/revision | Keep this exact exclusion. Review static artifacts or local-only renders. No preview or production deployment. |
| Concept approved; implementation authorized; preview not authorized | Keep an effective exclusion for the implementation branch, whether work remains here or uses a new branch. Use local production-mode QA. Do not assume the existing exact-name rule protects a new branch. |
| A preview is explicitly authorized later | In a separate reviewed configuration decision, either remove/adjust only the relevant exact-branch exclusion or use an authorized preview workflow. State the branch, audience, data/environment limits and authorization reference. Verify that the preview works; do not leave QA silently disabled. |
| Documentation PR later authorized for merge | Before merge, account for `main`'s automatic deployment behavior. A docs-only merge can still start a deployment; permission to merge must not be mistaken for permission to deploy. Resolve that explicitly in the merge/release decision. |
| This branch is retired after an authorized merge | Record whether the exact exclusion is still needed. Remove the obsolete branch key only in a separately approved cleanup/configuration change; if the containing object becomes empty, remove only that now-unused object. Preserve crons and all unrelated branch rules/settings. |

Do not solve this by disabling all branches, suppressing required CI, broadening
public access, or removing the guard pre-emptively in the concept PR. Do not rely
on skip-CI commit text. If future deployment permission remains absent, keep work
local and report the limit rather than publishing to obtain a screenshot.

## Current revision verification scope

Document references, DRAFT/version labels, R1–R9 traceability, artifact presence,
image/copy provenance, changed-file scope and the unchanged deployment guard.
Review static compositions visually. Application builds and production workflow
tests cannot prove the quality of a concept and are not substitutes for the
Creative Director's second review. Later implemented UI needs its own real
VI/EN/responsive/accessibility/regression evidence.
