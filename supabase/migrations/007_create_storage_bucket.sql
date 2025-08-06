-- Create storage bucket for canvas files
INSERT INTO storage.buckets (id, name, public)
VALUES ('canvas-files', 'canvas-files', true)
ON CONFLICT (id) DO NOTHING;

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