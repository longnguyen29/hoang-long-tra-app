-- The home page opening band showed a single photograph (settings_home.featured_photo).
-- It becomes a swipeable set. featured_photos holds the ordered list.
--
-- featured_photo is deliberately KEPT and kept in sync with the first slide: it still holds
-- the photo the admin uploaded before this migration, so nothing they entered is lost, and
-- the client falls back to it when featured_photos is empty. Do not drop it.

alter table settings_home add column if not exists featured_photos jsonb not null default '[]'::jsonb;

-- Carry the existing single photo across as the first slide.
update settings_home
set featured_photos = jsonb_build_array(featured_photo)
where coalesce(featured_photo, '') <> ''
  and featured_photos = '[]'::jsonb;
