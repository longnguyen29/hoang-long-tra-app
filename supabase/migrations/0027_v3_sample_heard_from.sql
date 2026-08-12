-- "Where did you hear about us?" on the sample page.
--
-- Worth asking here specifically: this page is only reached from a link the House posts or
-- hands out, so the answer says which channel is actually bringing in shops rather than
-- which one collects the most likes.
--
-- Optional on purpose. The page's job is to get a sample request, and a required question
-- between a café owner and a free pack costs more than the answer is worth.

alter table sample_requests add column if not exists heard_from text not null default '';

-- The parameter list changes, and "create or replace" with different arguments makes a
-- second overload rather than replacing anything — leaving two functions of the same name
-- for PostgREST to choose between. Dropping the old signature first is what actually
-- replaces it.
drop function if exists submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text);

-- p_heard_from carries a default so the argument list stays backwards compatible: a browser
-- still running the previous build calls this with nine arguments and it works, rather than
-- a café's request failing in the gap between this running and the new page going live.
create or replace function submit_sample_request(
  p_store_name text,
  p_contact_name text,
  p_phone text,
  p_address text,
  p_pack text,
  p_has_shop boolean,
  p_can_reformulate boolean,
  p_can_feedback boolean,
  p_note text,
  p_heard_from text default ''
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id text;
  v_pack text := coalesce(nullif(btrim(p_pack), ''), '50g');
begin
  if btrim(coalesce(p_store_name, '')) = '' then raise exception 'store_required'; end if;
  if btrim(coalesce(p_phone, '')) = '' then raise exception 'phone_required'; end if;
  if btrim(coalesce(p_address, '')) = '' then raise exception 'address_required'; end if;

  -- The free pack is for working shops that will actually put it through their bar. Paid
  -- sizes are open to anyone, so they skip the gate.
  if v_pack = '50g' and not (coalesce(p_has_shop, false)
                             and coalesce(p_can_reformulate, false)
                             and coalesce(p_can_feedback, false)) then
    raise exception 'not_qualified';
  end if;

  -- One open request per phone, so a link passed around can't be used to order repeatedly.
  if exists (
    select 1 from sample_requests r
    where regexp_replace(r.phone, '\D', '', 'g') = regexp_replace(btrim(p_phone), '\D', '', 'g')
      and r.status in ('new', 'sent')
  ) then
    raise exception 'already_requested';
  end if;

  v_id := 'sample-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);

  insert into sample_requests (
    id, store_name, contact_name, phone, address, pack,
    has_shop, can_reformulate, can_feedback, note, heard_from
  ) values (
    v_id, btrim(p_store_name), btrim(coalesce(p_contact_name, '')), btrim(p_phone), btrim(p_address), v_pack,
    coalesce(p_has_shop, false), coalesce(p_can_reformulate, false), coalesce(p_can_feedback, false),
    coalesce(p_note, ''),
    -- Clamped to the list the page offers. This is a public endpoint, so without it the
    -- column is a free text field anyone on the internet can write whatever they like into.
    case when btrim(coalesce(p_heard_from, '')) in ('threads', 'tiktok', 'facebook_instagram', 'word_of_mouth')
         then btrim(p_heard_from) else '' end
  );

  return v_id;
end;
$$;

revoke all on function submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text, text) from public;
grant execute on function submit_sample_request(text, text, text, text, text, boolean, boolean, boolean, text, text) to anon, authenticated;
