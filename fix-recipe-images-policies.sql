-- ============================================
-- Fix Recipe Images Storage Policies
-- ============================================
-- Use this script if you're getting "policy already exists" errors
-- but the Supabase UI shows no policies for recipe-images bucket
-- ============================================

-- First, let's check what policies exist (optional - for debugging)
-- Uncomment the line below to see all storage policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'objects' AND schemaname = 'storage';

-- Drop ALL existing policies for recipe-images bucket (by name pattern)
-- This handles cases where policies exist but aren't visible in the UI
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname LIKE '%recipe%' 
            OR policyname LIKE '%Recipe%'
            OR policyname LIKE '%RECIPE%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Now create the correct policies with ownership checks
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

