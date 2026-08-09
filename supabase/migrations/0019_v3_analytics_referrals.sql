-- Dashboard analytics + customer referrals.
--
-- Additive only. Nothing here drops or rewrites a column, so everything the admin has
-- entered live (products, articles, orders, promos) is untouched.

-- ---------- page_views: self-hosted visit counter ----------
-- Recorded from the browser, so crawlers that don't run JS never appear — which is most of
-- the bot traffic. session_id is a random id kept in localStorage: it separates "visitors"
-- from "views" without a cookie banner, since it carries no personal data at all.
create table if not exists page_views (
  id bigserial primary key,
  ts timestamptz not null default now(),
  path text not null,
  session_id text not null,
  referrer text not null default '',
  lang text not null default ''
);

create index if not exists page_views_ts_idx on page_views(ts desc);
create index if not exists page_views_session_idx on page_views(session_id);

-- ---------- promos gains referral support ----------
-- A referral code is just a promo owned by a customer, so the whole existing
-- validate/apply/record path (apply_promo_code, orders.promo) keeps working unchanged.
--   kind = 'staff'    a code the house made by hand (everything that exists today)
--   kind = 'referral' a buyer's personal share code — gives the friend the discount
--   kind = 'reward'   a one-time code issued to a referrer once their friend actually bought
alter table promos add column if not exists owner_contact text not null default '';
alter table promos add column if not exists kind text not null default 'staff';
alter table promos add column if not exists max_uses integer;
alter table promos add column if not exists uses integer not null default 0;

-- Added as a separate, guarded step: a plain CHECK in the ALTER above would fail on any
-- pre-existing row if the default ever changed.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'promos_kind_check') then
    alter table promos add constraint promos_kind_check
      check (kind in ('staff', 'referral', 'reward'));
  end if;
end $$;

create index if not exists promos_owner_contact_idx on promos(lower(owner_contact));

-- ---------- referral_rewards: the ledger ----------
-- One row per successful referral: who referred whom, the order that triggered it, and the
-- one-time code the referrer earned. Kept separate from promos so the history survives even
-- if the reward code is later deleted.
create table if not exists referral_rewards (
  id text primary key,
  referrer_contact text not null,
  referred_contact text not null,
  referral_code text not null,
  order_id text references orders(id) on delete set null,
  reward_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists referral_rewards_referrer_idx on referral_rewards(lower(referrer_contact));
-- A given customer can only ever trigger one reward, no matter how many times they reorder.
create unique index if not exists referral_rewards_one_per_referred
  on referral_rewards(lower(referred_contact));
