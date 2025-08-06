-- Combined migration file for nested canvases feature
-- Run this in Supabase SQL editor

-- 1. Update canvases table
ALTER TABLE canvases 
ADD COLUMN IF NOT EXISTS parent_canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS parent_node_id UUID,
ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0;

-- 2. Update nodes table  
ALTER TABLE nodes
ADD COLUMN IF NOT EXISTS is_group_portal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sub_canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL;

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_canvases_parent_canvas_id ON canvases(parent_canvas_id);
CREATE INDEX IF NOT EXISTS idx_canvases_depth ON canvases(depth);
CREATE INDEX IF NOT EXISTS idx_nodes_is_group_portal ON nodes(is_group_portal);
CREATE INDEX IF NOT EXISTS idx_nodes_sub_canvas_id ON nodes(sub_canvas_id);

-- 4. Create trigger to calculate canvas depth
CREATE OR REPLACE FUNCTION calculate_canvas_depth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_canvas_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth
    FROM canvases
    WHERE id = NEW.parent_canvas_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_calculate_canvas_depth ON canvases;
CREATE TRIGGER trg_calculate_canvas_depth
BEFORE INSERT OR UPDATE OF parent_canvas_id ON canvases
FOR EACH ROW
EXECUTE FUNCTION calculate_canvas_depth();

-- 5. Create recursive function to get all nested canvases
CREATE OR REPLACE FUNCTION get_all_nested_canvases(root_canvas_id UUID)
RETURNS TABLE(canvas_id UUID, level INT) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE nested AS (
    SELECT id as canvas_id, 0 as level
    FROM canvases
    WHERE id = root_canvas_id
    
    UNION ALL
    
    SELECT c.id as canvas_id, n.level + 1
    FROM canvases c
    INNER JOIN nested n ON c.parent_canvas_id = n.canvas_id
  )
  SELECT * FROM nested;
END;
$$ LANGUAGE plpgsql;

-- 6. Create breadcrumb function
CREATE OR REPLACE FUNCTION get_canvas_breadcrumbs(
  start_canvas_id UUID,
  user_id UUID
)
RETURNS TABLE (
  canvas_id UUID,
  canvas_name TEXT,
  parent_node_id UUID,
  depth INT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE breadcrumb_path AS (
    -- Base case: start with the given canvas
    SELECT 
      c.id as canvas_id,
      c.name as canvas_name,
      c.parent_node_id,
      c.depth,
      c.parent_canvas_id
    FROM canvases c
    WHERE c.id = start_canvas_id 
      AND c.user_id = get_canvas_breadcrumbs.user_id
    
    UNION ALL
    
    -- Recursive case: get parent canvases
    SELECT 
      c.id as canvas_id,
      c.name as canvas_name,
      c.parent_node_id,
      c.depth,
      c.parent_canvas_id
    FROM canvases c
    INNER JOIN breadcrumb_path bp ON c.id = bp.parent_canvas_id
    WHERE c.user_id = get_canvas_breadcrumbs.user_id
  )
  SELECT 
    bp.canvas_id,
    bp.canvas_name,
    bp.parent_node_id,
    bp.depth
  FROM breadcrumb_path bp
  ORDER BY bp.depth ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update RLS policies for nested canvases
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their nested canvases" ON canvases;
DROP POLICY IF EXISTS "Users can create nested canvases" ON canvases;

-- Create new policies
CREATE POLICY "Users can view their nested canvases" ON canvases
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM get_all_nested_canvases(id) gnc
    JOIN canvases c ON c.id = gnc.canvas_id
    WHERE c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create nested canvases" ON canvases
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  (parent_canvas_id IS NULL OR 
   EXISTS (
     SELECT 1 FROM canvases 
     WHERE id = parent_canvas_id AND user_id = auth.uid()
   ))
);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_canvas_breadcrumbs TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_nested_canvases TO authenticated;