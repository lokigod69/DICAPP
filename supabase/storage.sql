-- ============================================================================
-- DIC APP - Storage Policies
-- ============================================================================
-- Run this in Supabase Dashboard > Storage after creating the 'uploads' bucket
--
-- Bucket Configuration:
-- - Name: uploads
-- - Public: false
-- - File size limit: 10 MB
-- - Allowed MIME types: text/csv, application/csv, text/plain
-- ============================================================================

-- Policy 1: Users can upload to their own folder
-- Path format: {user_id}/ingests/{timestamp}-{filename}.csv
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Users can read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- Instructions:
-- ============================================================================
-- 1. Go to Supabase Dashboard > Storage
-- 2. Create new bucket named 'uploads'
-- 3. Set as private (not public)
-- 4. Set file size limit to 10 MB
-- 5. Set allowed MIME types: text/csv, application/csv, text/plain
-- 6. Go to Storage > Policies
-- 7. Run the CREATE POLICY statements above
-- ============================================================================
