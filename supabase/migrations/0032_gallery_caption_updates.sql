-- The v2 gallery policies allowed staff to add and remove images but accidentally omitted
-- caption editing. The controlled House editor updates captions without replacing images.
create policy "gallery_images: staff update" on gallery_images
  for update to authenticated
  using (is_staff())
  with check (is_staff());
