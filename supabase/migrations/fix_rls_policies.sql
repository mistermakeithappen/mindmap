-- Fix the infinite recursion in RLS policies
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Users can view their nested canvases" ON canvases;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can view their own canvases" ON canvases
FOR SELECT USING (auth.uid() = user_id);

-- Ensure the insert policy is correct
DROP POLICY IF EXISTS "Users can create nested canvases" ON canvases;
CREATE POLICY "Users can create canvases" ON canvases
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add update policy
CREATE POLICY "Users can update their canvases" ON canvases
FOR UPDATE USING (auth.uid() = user_id);

-- Add delete policy
CREATE POLICY "Users can delete their canvases" ON canvases
FOR DELETE USING (auth.uid() = user_id);