-- Drop the existing check constraint on nodes table
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

-- Add updated check constraint with all node types
ALTER TABLE nodes ADD CONSTRAINT nodes_type_check 
  CHECK (type IN ('text', 'image', 'video', 'file', 'link', 'ai-response', 'headline', 'sticky', 'emoji', 'group'));

-- Create storage bucket for canvas files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-files', 'canvas-files', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Set up RLS policies for storage
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'canvas-files');

CREATE POLICY "Anyone can view files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'canvas-files');

CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'canvas-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'canvas-files' AND auth.uid()::text = (storage.foldername(name))[1]);