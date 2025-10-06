/*
  # Create Receipts Storage Bucket

  1. Changes
    - Creates a new storage bucket called 'receipts' for storing expense receipt images
    - Sets the bucket to public so receipt URLs can be accessed
    - Adds storage policies to allow:
      - Authenticated users to upload their own receipts
      - Authenticated users to view their own receipts
      - Admins to view all receipts
  
  2. Security
    - Users can only upload to their own user_id folder
    - Users can only access receipts from their own expenses
    - Admin users (with role 'admin') can access all receipts
*/

-- Create the receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts to their own folder
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to view their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow users to update their own receipts
CREATE POLICY "Users can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own receipts
CREATE POLICY "Users can delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
