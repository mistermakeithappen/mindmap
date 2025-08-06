-- Add parent_canvas_id to canvases table for nesting
ALTER TABLE canvases 
ADD COLUMN parent_canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
ADD COLUMN parent_node_id UUID,
ADD COLUMN depth INTEGER DEFAULT 0;

-- Add index for efficient querying
CREATE INDEX idx_canvases_parent_canvas_id ON canvases(parent_canvas_id);
CREATE INDEX idx_canvases_depth ON canvases(depth);

-- Add is_nested flag to nodes table to identify group nodes that are portals
ALTER TABLE nodes
ADD COLUMN is_group_portal BOOLEAN DEFAULT false,
ADD COLUMN sub_canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL;

-- Create index for group portals
CREATE INDEX idx_nodes_sub_canvas_id ON nodes(sub_canvas_id);

-- Update RLS policies for nested canvases
CREATE POLICY "Users can view nested canvases" ON canvases
  FOR SELECT USING (
    auth.uid() = created_by OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM canvases parent
      WHERE parent.id = canvases.parent_canvas_id
      AND (parent.created_by = auth.uid() OR parent.user_id = auth.uid())
    )
  );

-- Function to calculate canvas depth
CREATE OR REPLACE FUNCTION calculate_canvas_depth(canvas_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_id UUID := canvas_id;
  depth_count INTEGER := 0;
BEGIN
  WHILE current_id IS NOT NULL LOOP
    SELECT parent_canvas_id INTO current_id
    FROM canvases
    WHERE id = current_id;
    
    IF current_id IS NOT NULL THEN
      depth_count := depth_count + 1;
    END IF;
  END LOOP;
  
  RETURN depth_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update depth when canvas is created or updated
CREATE OR REPLACE FUNCTION update_canvas_depth()
RETURNS TRIGGER AS $$
BEGIN
  NEW.depth := calculate_canvas_depth(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER canvas_depth_trigger
BEFORE INSERT OR UPDATE ON canvases
FOR EACH ROW
EXECUTE FUNCTION update_canvas_depth();