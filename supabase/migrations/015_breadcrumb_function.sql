-- Create a function to get canvas breadcrumbs
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