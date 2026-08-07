-- House of Hoàng Long v3.0 — structured flavour tags per product
-- Run after 0014_v3_product_review_functions.sql.
--
-- `notes` stays the free-text tasting paragraph. This adds short, scannable tags
-- ("Floral", "Creamy", "Mineral") rendered as chips on cards and the detail modal.
-- Shape mirrors the other bilingual columns: { "en": [...], "vi": [...] }.

alter table catalog_products add column if not exists flavors jsonb not null default '{}'::jsonb;
