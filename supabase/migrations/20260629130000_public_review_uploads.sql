-- ============================================================
-- MDink — Allow public review-media uploads (Leave Your Review form)
-- Visitors are not authenticated, so they need a narrow, safe path
-- to upload only into the review-submissions/ folder of mdink-media.
-- Admins keep full control everywhere else.
-- ============================================================

-- Public (anon + authenticated) may INSERT only into the
-- review-submissions/ folder, nowhere else in the bucket.
DROP POLICY IF EXISTS "Public upload review media" ON storage.objects;
CREATE POLICY "Public upload review media" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'mdink-media'
    AND (storage.foldername(name))[1] = 'review-submissions'
  );

-- (Public read is already granted by "Public read mdink media".
--  Update/delete remain admin-only via the existing policies.)
