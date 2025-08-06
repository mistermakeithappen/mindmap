-- Fix all database issues

-- 1. First, disable RLS temporarily to fix policies
ALTER TABLE canvases DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on canvases
DROP POLICY IF EXISTS "Users can view their own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can view their nested canvases" ON canvases;
DROP POLICY IF EXISTS "Users can create canvases" ON canvases;
DROP POLICY IF EXISTS "Users can create nested canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update their canvases" ON canvases;
DROP POLICY IF EXISTS "Users can delete their canvases" ON canvases;
DROP POLICY IF EXISTS "Enable read access for users" ON canvases;
DROP POLICY IF EXISTS "Enable insert for users" ON canvases;
DROP POLICY IF EXISTS "Enable update for users" ON canvases;
DROP POLICY IF EXISTS "Enable delete for users" ON canvases;

-- 3. Create simple, non-recursive policies
CREATE POLICY "canvases_select_policy" ON canvases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "canvases_insert_policy" ON canvases
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "canvases_update_policy" ON canvases
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "canvases_delete_policy" ON canvases
FOR DELETE USING (auth.uid() = user_id);

-- 4. Re-enable RLS
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- 5. Make sure nodes and edges policies are also simple
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own nodes" ON nodes;
DROP POLICY IF EXISTS "Users can create nodes" ON nodes;
DROP POLICY IF EXISTS "Users can update their own nodes" ON nodes;
DROP POLICY IF EXISTS "Users can delete their own nodes" ON nodes;

-- Create simple policies for nodes
CREATE POLICY "nodes_select_policy" ON nodes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = nodes.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "nodes_insert_policy" ON nodes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = nodes.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "nodes_update_policy" ON nodes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = nodes.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "nodes_delete_policy" ON nodes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = nodes.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

-- 6. Same for edges
DROP POLICY IF EXISTS "Users can view their own edges" ON edges;
DROP POLICY IF EXISTS "Users can create edges" ON edges;
DROP POLICY IF EXISTS "Users can update their own edges" ON edges;
DROP POLICY IF EXISTS "Users can delete their own edges" ON edges;

CREATE POLICY "edges_select_policy" ON edges
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = edges.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "edges_insert_policy" ON edges
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = edges.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "edges_update_policy" ON edges
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = edges.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);

CREATE POLICY "edges_delete_policy" ON edges
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM canvases 
    WHERE canvases.id = edges.canvas_id 
    AND canvases.user_id = auth.uid()
  )
);