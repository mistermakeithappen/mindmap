-- Update RLS policies for nodes to check both user_id and created_by on canvases
DROP POLICY IF EXISTS "Users can manage nodes on own canvases" ON nodes;
CREATE POLICY "Users can manage nodes on own canvases" ON nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND (canvases.created_by = auth.uid() OR canvases.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update nodes on own canvases" ON nodes;
CREATE POLICY "Users can update nodes on own canvases" ON nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND (canvases.created_by = auth.uid() OR canvases.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete nodes on own canvases" ON nodes;
CREATE POLICY "Users can delete nodes on own canvases" ON nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND (canvases.created_by = auth.uid() OR canvases.user_id = auth.uid())
    )
  );

-- Update RLS policies for edges similarly
DROP POLICY IF EXISTS "Users can manage edges on own canvases" ON edges;
CREATE POLICY "Users can manage edges on own canvases" ON edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND (canvases.created_by = auth.uid() OR canvases.user_id = auth.uid())
    )
  );

-- Also update canvas policies to be consistent
DROP POLICY IF EXISTS "Users can create canvases with user_id" ON canvases;
CREATE POLICY "Users can create canvases with user_id" ON canvases
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can update own canvases by user_id" ON canvases;
CREATE POLICY "Users can update own canvases by user_id" ON canvases
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can delete own canvases by user_id" ON canvases;
CREATE POLICY "Users can delete own canvases by user_id" ON canvases
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = created_by);