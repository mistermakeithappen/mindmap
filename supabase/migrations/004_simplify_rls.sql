-- Temporarily allow all authenticated users to do everything
-- This is for development only - you should tighten these policies for production

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Users can insert organization" ON organizations;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view canvases" ON canvases;
DROP POLICY IF EXISTS "Users can create canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can delete own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can view nodes" ON nodes;
DROP POLICY IF EXISTS "Users can manage own nodes" ON nodes;
DROP POLICY IF EXISTS "Users can view edges" ON edges;
DROP POLICY IF EXISTS "Users can manage own edges" ON edges;
DROP POLICY IF EXISTS "Users can view files" ON files;
DROP POLICY IF EXISTS "Users can manage own files" ON files;
DROP POLICY IF EXISTS "Canvas owners can manage collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view own collaborations" ON canvas_collaborators;

-- Simple policies for development

-- Organizations: Allow authenticated users to do everything
CREATE POLICY "Authenticated users can do everything with organizations" ON organizations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Profiles: Allow authenticated users to do everything  
CREATE POLICY "Authenticated users can do everything with profiles" ON profiles
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Canvases: Users can only manage their own canvases
CREATE POLICY "Users can view all canvases" ON canvases
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create canvases" ON canvases
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own canvases" ON canvases
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own canvases" ON canvases
  FOR DELETE USING (auth.uid() = created_by);

-- Nodes: Users can manage nodes on their own canvases
CREATE POLICY "Users can view all nodes" ON nodes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage nodes on own canvases" ON nodes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes on own canvases" ON nodes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete nodes on own canvases" ON nodes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Edges: Same as nodes
CREATE POLICY "Users can view all edges" ON edges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage edges on own canvases" ON edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Files: Same pattern
CREATE POLICY "Users can view all files" ON files
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage files on own nodes" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nodes 
      JOIN canvases ON canvases.id = nodes.canvas_id
      WHERE nodes.id = node_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Canvas collaborators
CREATE POLICY "Users can do everything with collaborators" ON canvas_collaborators
  FOR ALL USING (auth.uid() IS NOT NULL);