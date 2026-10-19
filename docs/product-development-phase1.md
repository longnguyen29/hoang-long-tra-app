# Product Development & Supplier Network — Phase1 (2026-10-19)

## Scope and reuse

Manager-only `/admin/product-development` and `/admin/suppliers` extend the existing StaffShell, Supabase identity and manager authorization. Concepts are NOT a second commercial product catalog. Existing `catalog_products` and `catalog_variants` remain the only sellable SKU/pack records. Projects link to these IDs. Existing supply items/BOM and tea batches are read and linked without reserving, decrementing or allocating material. Recipes, QC, operations and the existing product-development budget envelope retain their owners.

Supplier identity reuses `vendors`. `supplier_profiles` holds private manufacturing contacts, sourcing state and unknown commercial terms. Newly seeded supplier-only vendors remain inactive and are excluded from `list_public_vendors()` even if an older screen activates them. Existing grower output remains unchanged. Source claims from the handoff remain unverified; no supplier messages are sent or supplier relationships confirmed.

## Data and permissions

Apply migration `0096_product_development_foundation.sql` ONCE. Pending0095 revenue rewards is unrelated and not required. Do not replay earlier production migrations. No new environment variables, external service or application dependency.

New private tables: `product_development_projects`, `supplier_profiles`, `product_development_catalog_links`, `product_development_suppliers`, `product_development_resources`, `product_development_events`. All enable RLS, manager-only SELECT and no direct authenticated mutations. RPCs check auth + is_staff_manager, whitelist fields, preserve actor/time server-side and use optimistic row versions. History is append-only through authorized operations. Existing public SKU/vendor functions never read project costs or supplier profiles.

Phase1 deliberately blocks all public concept visibility, launch and production commitments even for managers. The data model names future stages, but public availability remains hidden and production/live stages require a later gate implementation. Existing commercial catalog availability is independent: linking a sold tea to a research/audit project does not remove it from sale. D/H/K stay research-only. Supplier quote/qualified/approval stages and commercial terms likewise wait for evidence-based sourcing workflows in Phase2.

## Seed records and provenance

30 prioritized concepts plus informational CAT-* review tasks for remaining actual tea catalog rows; only four exact A001–A004 identity links. A005/A006 remain unresolved rather than treating all jasmine/lotus as Shan Tuyết. B records are format development, not new formulations/SKUs. Six unqualified leads, potential project associations and eight workstreams. Full82-code roadmap and research-only ideas are preserved in `product-universe-map.md`.

The owner-only `product_development_seed()` uses conflict-do-nothing; rerunning never overwrites user edits, clears supplier decisions or creates duplicate catalog products. Ordinary clients cannot execute it. This is an internal initialization/recovery mechanism, not a public endpoint.

Planning allowances are versioned constants, not a financial ledger. The component estimates sum12–37m VND, while the brief headline says12–35m; UI flags this for review. They exclude supplied tea's economic value, normal overhead and commercial runs. No approved/actual/committed spending is invented. Per-project estimates require provenance and explanatory notes; supplier-quote/actual cost entries are not available until their evidence workflow exists.

## Deliberately next

Phase2: supplier RFQ documents/responses, versioned quotes/MOQ and landed-cost comparison, sample evaluations and attachments, evidence-backed commercial costs, approved/committed/paid budget links. Use existing spending controls rather than duplicating accounting.

Phase3: explicitly approved research visibility and interest intake, format filters, verified manufacturing homepage services and existing CRM intake. Nothing public is launched from Phase1 seeds.

Phase4: actual material reservations/input-output work orders, outsourced lot traceability, seven evidence gates, finished-goods reconciliation and explicit commercial launch. Informational links in Phase1 do NOT prevent double allocation or release quality-held batches; no production allocation is claimed. Do not represent pressed finished steamed green tea as raw Pu-erh, or rejected/nonfood materials as food grade.

Press-only supplier search remains OPEN until an actual service accepting Hoàng Long tea is verified. Suggested contact tasks are notes only, not sent requests.

## Focused QA

- Seed/reseed isolated DB; compare every existing catalog/variant/stock/material/batch record and public grower list unchanged.
- Anon/customer/worker cannot read private tables/snapshots, mutate projects or execute seed; manager can.
- Edit project owner/date/next action/blocker; stale save must fail without overwriting another edit.
- Link actual SKU, batch, material and candidate supplier; repeat links do not duplicate and stock remains unchanged.
- Attempts to launch or publish research, commit production, mark supplier approved/quoted, or turn estimates into confirmed quote costs fail closed.
- Existing retail checkout, pricing and material planning tests; manual desktop/390px manager screens, empty/unknown amounts and supplier acceptance states.

## Release verification — 2026-10-19

Migration0096 applied once to the existing production project. Production now has42 projects (30 priority concepts +12 existing-tea audits),6 supplier leads and16 catalog links; all6 new tables have RLS enabled. Before/after catalog, variant and public-grower projection hashes match exactly. No earlier migration, including pending0095, was replayed.

45 isolated PostgreSQL assertions and67 existing pricing, material-planning, retail checkout and staff-order tests passed. Production build passed after the final form-save fixes. The repository's `npm run lint` cannot run because its existing `next lint` command is unsupported by the installed Next16; no separate typecheck script exists, and the build's TypeScript phase completed. Physical390px interaction still needs a real-phone check.

The Supabase dashboard currently warns that the organization exceeded its prior billing-cycle quota and may be restricted from9 November2026 if it remains over quota. No billing plan or payment setting was changed.
