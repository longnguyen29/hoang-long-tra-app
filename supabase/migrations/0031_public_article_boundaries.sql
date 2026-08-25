-- Internal brand-kit notes were historically hidden only by the public UI while the
-- wiki_articles SELECT policy still exposed every category through the data API. Keep staff
-- access unchanged, but make the public boundary true at the database layer as well.

drop policy if exists "wiki_articles: public read" on wiki_articles;

create policy "wiki_articles: public read editorial" on wiki_articles
  for select to anon, authenticated
  using (category <> 'brandkit' or is_staff());
