-- House of Hoàng Long v3.0 — producer + origin facts for the Our Story opener
-- Run after 0015_v3_product_flavors.sql.
--
-- Lives on settings_home (already public-read / staff-write, see 0005_v2_rls.sql) since
-- this is single-row site content, not a collection. Everything starts empty: the section
-- only renders once staff fill it in from Front Desk, so nothing shows half-built.

alter table settings_home add column if not exists producer_name text default '';
alter table settings_home add column if not exists producer_photo text default '';
alter table settings_home add column if not exists producer_role jsonb not null default '{}'::jsonb;
alter table settings_home add column if not exists producer_quote jsonb not null default '{}'::jsonb;

-- [{ "value": "1200m", "label": { "en": "Altitude", "vi": "Độ cao" } }, ...]
alter table settings_home add column if not exists origin_stats jsonb not null default '[]'::jsonb;
