-- Lets the wholesale sample landing page file its enquiries into the existing leads table.
--
-- Two things stood in the way. leads only ever held a name and a contact — there was nowhere
-- to put the shop's name or the address a sample has to be posted to. And interest carried a
-- CHECK allowing only 'wholesale' or 'retail', so a third label could not be written at all.
--
-- Additive: the new columns default to empty, so every lead already in the table stays valid
-- and reads exactly as before.

alter table leads add column if not exists business_name text not null default '';
alter table leads add column if not exists address text not null default '';

-- Replace the two-value CHECK with one that also accepts the landing page's label. Done by
-- name and guarded, so re-running this cannot fail on a constraint that is already correct.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'leads_interest_check') then
    alter table leads drop constraint leads_interest_check;
  end if;

  alter table leads add constraint leads_interest_check
    check (interest in ('wholesale', 'retail', 'mau-thu-doanh-nghiep'));
end $$;

-- The public insert policy from 0002_rls.sql still applies unchanged: anyone may add a lead
-- as long as it arrives unread, and nobody but staff can read them back. Which is what makes
-- this safe to expose on a page reached straight from an advert.
