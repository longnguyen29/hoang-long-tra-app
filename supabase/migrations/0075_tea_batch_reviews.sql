-- Private, append-only sensory assessments of existing tea batches.
-- A review never releases/holds a batch or edits its public passport.
begin;

create table if not exists public.tea_batch_reviews (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references public.tea_batches(id) on delete restrict,
  aroma_score smallint check (aroma_score between 1 and 5),
  taste_score smallint check (taste_score between 1 and 5),
  liquor_score smallint check (liquor_score between 1 and 5),
  result text not null check (result in ('pass', 'hold', 'reject')),
  notes text not null default '' check (char_length(notes) <= 3000),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reviewer_name text not null,
  reviewed_at timestamptz not null default now(),
  constraint tea_batch_reviews_pass_scored check (
    result <> 'pass' or (aroma_score is not null and taste_score is not null and liquor_score is not null)
  ),
  constraint tea_batch_reviews_issue_explained check (
    result = 'pass' or char_length(btrim(notes)) > 0
  )
);

create index if not exists tea_batch_reviews_batch_time_idx
  on public.tea_batch_reviews(batch_id, reviewed_at desc, id desc);

alter table public.tea_batch_reviews enable row level security;
drop policy if exists "tea_batch_reviews: staff select" on public.tea_batch_reviews;
create policy "tea_batch_reviews: staff select" on public.tea_batch_reviews
  for select to authenticated using (public.is_staff());

revoke all on public.tea_batch_reviews from public, anon, authenticated;
grant select on public.tea_batch_reviews to authenticated;

create or replace function public.create_tea_batch_review(
  p_batch_id text,
  p_aroma_score smallint,
  p_taste_score smallint,
  p_liquor_score smallint,
  p_result text,
  p_notes text
)
returns setof public.tea_batch_reviews
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_reviewer_name text;
begin
  if auth.uid() is null or not public.is_staff() then raise exception 'staff_required'; end if;
  if not exists(select 1 from public.tea_batches where id = p_batch_id) then raise exception 'batch_not_found'; end if;
  if p_aroma_score not between 1 and 5
    or p_taste_score not between 1 and 5
    or p_liquor_score not between 1 and 5 then
    raise exception 'invalid_batch_review_score';
  end if;
  if p_result is null or p_result not in ('pass', 'hold', 'reject') then raise exception 'invalid_batch_review_result'; end if;
  if char_length(coalesce(p_notes, '')) > 3000 then raise exception 'invalid_batch_review_notes'; end if;
  if p_result = 'pass' and (p_aroma_score is null or p_taste_score is null or p_liquor_score is null) then
    raise exception 'batch_review_pass_requires_scores';
  end if;
  if p_result in ('hold', 'reject') and char_length(btrim(coalesce(p_notes, ''))) = 0 then
    raise exception 'batch_review_issue_requires_notes';
  end if;

  select coalesce(nullif(btrim(profile.display_name), ''), nullif(user_record.email, ''), auth.uid()::text)
    into v_reviewer_name
    from auth.users as user_record
    left join public.staff_profiles as profile on profile.user_id = user_record.id
    where user_record.id = auth.uid();

  return query
    insert into public.tea_batch_reviews (
      batch_id, aroma_score, taste_score, liquor_score, result, notes,
      reviewer_id, reviewer_name, reviewed_at
    ) values (
      p_batch_id, p_aroma_score, p_taste_score, p_liquor_score, p_result, btrim(coalesce(p_notes, '')),
      auth.uid(), coalesce(v_reviewer_name, auth.uid()::text), now()
    ) returning *;
end;
$$;

revoke all on function public.create_tea_batch_review(text, smallint, smallint, smallint, text, text)
  from public, anon, authenticated;
grant execute on function public.create_tea_batch_review(text, smallint, smallint, smallint, text, text)
  to authenticated;

commit;
