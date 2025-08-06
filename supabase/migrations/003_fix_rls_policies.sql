-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization canvases" ON canvases;
DROP POLICY IF EXISTS "Users can create canvases" ON canvases;
DROP POLICY IF EXISTS "Users can update canvases" ON canvases;
DROP POLICY IF EXISTS "Users can delete own canvases" ON canvases;
DROP POLICY IF EXISTS "Users can view nodes" ON nodes;
DROP POLICY IF EXISTS "Users can manage nodes" ON nodes;
DROP POLICY IF EXISTS "Users can view edges" ON edges;
DROP POLICY IF EXISTS "Users can manage edges" ON edges;
DROP POLICY IF EXISTS "Users can view files" ON files;
DROP POLICY IF EXISTS "Users can manage files" ON files;
DROP POLICY IF EXISTS "Canvas owners can manage collaborators" ON canvas_collaborators;
DROP POLICY IF EXISTS "Users can view own collaborations" ON canvas_collaborators;

-- Simplified RLS Policies to avoid recursion

-- Organizations: Users can view and manage their own organization
CREATE POLICY "Users can view own organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = organizations.id 
      AND profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert organization" ON organizations
  FOR INSERT WITH CHECK (true);

-- Profiles: Simplified policies
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Canvases: Simplified to use direct auth.uid() checks
CREATE POLICY "Users can view canvases" ON canvases
  FOR SELECT USING (
    is_public = true OR
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = canvases.organization_id
    )
  );

CREATE POLICY "Users can create canvases" ON canvases
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_id = canvases.organization_id
    )
  );

CREATE POLICY "Users can update own canvases" ON canvases
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own canvases" ON canvases
  FOR DELETE USING (created_by = auth.uid());

-- Nodes: Simplified policies
CREATE POLICY "Users can view nodes" ON nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = nodes.canvas_id 
      AND (
        canvases.is_public = true OR
        canvases.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own nodes" ON nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = nodes.canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Edges: Same as nodes
CREATE POLICY "Users can view edges" ON edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = edges.canvas_id 
      AND (
        canvases.is_public = true OR
        canvases.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own edges" ON edges
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = edges.canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Files: Same pattern
CREATE POLICY "Users can view files" ON files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nodes 
      JOIN canvases ON canvases.id = nodes.canvas_id
      WHERE nodes.id = files.node_id 
      AND (
        canvases.is_public = true OR
        canvases.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage own files" ON files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nodes 
      JOIN canvases ON canvases.id = nodes.canvas_id
      WHERE nodes.id = files.node_id 
      AND canvases.created_by = auth.uid()
    )
  );

-- Canvas collaborators: Simplified
CREATE POLICY "Canvas owners can manage collaborators" ON canvas_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM canvases 
      WHERE canvases.id = canvas_collaborators.canvas_id 
      AND canvases.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can view own collaborations" ON canvas_collaborators
  FOR SELECT USING (user_id = auth.uid());