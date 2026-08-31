-- ============================================================
-- Storage policies for the 'media' bucket.
-- Run this AFTER creating a bucket named exactly "media" in
-- Storage > Buckets, marked Public.
-- ============================================================

create policy "Public can view media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Authenticated can upload media"
  on storage.objects for insert
  with check (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "Authenticated can update media"
  on storage.objects for update
  using (bucket_id = 'media' and auth.role() = 'authenticated');

create policy "Authenticated can delete media"
  on storage.objects for delete
  using (bucket_id = 'media' and auth.role() = 'authenticated');
