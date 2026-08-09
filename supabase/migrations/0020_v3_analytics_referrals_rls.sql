-- House of Hoàng Long v3.0 — RLS for page_views and referral_rewards
-- Run after 0019_v3_analytics_referrals.sql.

alter table page_views enable row level security;

create policy "page_views: staff select" on page_views
  for select using (is_staff());

create policy "page_views: staff delete" on page_views
  for delete using (is_staff());

-- Deliberately no public select and no public insert.
--
-- Insert: writes go through record_page_view(), which fixes ts server-side and ignores any
-- client-supplied timestamp. A public insert policy would let anyone forge unlimited rows
-- and make the dashboard numbers meaningless.
--
-- Select: session ids and referrers are only ever aggregated, by page_view_stats().

alter table referral_rewards enable row level security;

create policy "referral_rewards: staff select" on referral_rewards
  for select using (is_staff());

create policy "referral_rewards: staff delete" on referral_rewards
  for delete using (is_staff());

-- No public select: rows pair a referrer's contact with a referred customer's contact, so
-- readable rows would expose who bought from whom. A customer reads only their own side,
-- through my_referral_status(), which takes their contact and returns nothing about anyone
-- else. No public insert: rewards are issued by submit_retail_order() alone, after it has
-- confirmed the order is real and the referred customer is genuinely new.
