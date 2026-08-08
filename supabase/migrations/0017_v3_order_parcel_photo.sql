-- House of Hoàng Long v3.0 — photo of the packed parcel, attached to an order
-- Run after 0016_v3_house_story.sql.
--
-- Staff-only: uploaded from Front Desk when the order is packed, so there's a record of
-- what actually went out. Customers never see or set this — `orders` has no public select
-- policy (0002_rls.sql), and the only customer-facing read is the track_order RPC, which
-- returns just id/status/tracking_code.

alter table orders add column if not exists parcel_photo text default '';
