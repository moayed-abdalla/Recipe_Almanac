-- ============================================
-- Supabase Storage Bucket Policies
-- ============================================
-- Run this SQL in your Supabase SQL Editor to fix RLS policy issues
-- Make sure the buckets exist first: recipe-images, avatars, feedback-attachments
-- ============================================

-- ============================================
-- RECIPE-IMAGES BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist (required if policies already exist)
DROP POLICY IF EXISTS "Authenticated users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view recipe images" ON storage.objects;

-- Allow authenticated users to upload recipe images to their own folder
CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own recipe images
CREATE POLICY "Users can update their own recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own recipe images
CREATE POLICY "Users can delete their own recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to recipe images
CREATE POLICY "Public can view recipe images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- ============================================
-- AVATARS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist (optional)
-- DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;

-- Allow authenticated users to upload avatars
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- FEEDBACK-ATTACHMENTS BUCKET POLICIES
-- ============================================

-- Drop existing policies if they exist (optional)
-- DROP POLICY IF EXISTS "Authenticated users can upload feedback attachments" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own feedback attachments" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own feedback attachments" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view feedback attachments" ON storage.objects;

-- Allow authenticated users to upload feedback attachments to their own folder
CREATE POLICY "Authenticated users can upload feedback attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own feedback attachments
CREATE POLICY "Users can update their own feedback attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own feedback attachments
CREATE POLICY "Users can delete their own feedback attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to feedback attachments
CREATE POLICY "Public can view feedback attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-attachments');

