-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  settings JSONB DEFAULT '{}'::jsonb
);

-- User profiles with tenant association
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Mind map canvases
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Nodes on canvas
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'file', 'link', 'ai-response')),
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  style JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Connections between nodes
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE NOT NULL,
  source UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
  target UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'default' CHECK (type IN ('default', 'straight', 'step', 'smoothstep', 'animated')),
  label TEXT,
  style JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- File storage references
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Canvas collaborators (for sharing)
CREATE TABLE canvas_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(canvas_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_canvases_organization_id ON canvases(organization_id);
CREATE INDEX idx_nodes_canvas_id ON nodes(canvas_id);
CREATE INDEX idx_edges_canvas_id ON edges(canvas_id);
CREATE INDEX idx_edges_source ON edges(source);
CREATE INDEX idx_edges_target ON edges(target);
CREATE INDEX idx_files_node_id ON files(node_id);
CREATE INDEX idx_canvas_collaborators_canvas_id ON canvas_collaborators(canvas_id);
CREATE INDEX idx_canvas_collaborators_user_id ON canvas_collaborators(user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations: Users can only see their organization
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Profiles: Users can view profiles in their organization
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Canvases: Users can view canvases in their organization or public canvases
CREATE POLICY "Users can view organization canvases" ON canvases
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    ) OR is_public = true
  );

-- Canvases: Users can create canvases in their organization
CREATE POLICY "Users can create canvases" ON canvases
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Canvases: Users can update their own canvases or those they have edit permission for
CREATE POLICY "Users can update canvases" ON canvases
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT canvas_id FROM canvas_collaborators 
      WHERE user_id = auth.uid() AND permission = 'edit'
    )
  );

-- Canvases: Users can delete their own canvases
CREATE POLICY "Users can delete own canvases" ON canvases
  FOR DELETE USING (created_by = auth.uid());

-- Nodes: Users can view nodes on accessible canvases
CREATE POLICY "Users can view nodes" ON nodes
  FOR SELECT USING (
    canvas_id IN (
      SELECT id FROM canvases WHERE 
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) OR is_public = true
    )
  );

-- Nodes: Users can create/update/delete nodes on canvases they can edit
CREATE POLICY "Users can manage nodes" ON nodes
  FOR ALL USING (
    canvas_id IN (
      SELECT id FROM canvases WHERE 
        created_by = auth.uid() OR
        id IN (
          SELECT canvas_id FROM canvas_collaborators 
          WHERE user_id = auth.uid() AND permission = 'edit'
        )
    )
  );

-- Edges: Same policies as nodes
CREATE POLICY "Users can view edges" ON edges
  FOR SELECT USING (
    canvas_id IN (
      SELECT id FROM canvases WHERE 
        organization_id IN (
          SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) OR is_public = true
    )
  );

CREATE POLICY "Users can manage edges" ON edges
  FOR ALL USING (
    canvas_id IN (
      SELECT id FROM canvases WHERE 
        created_by = auth.uid() OR
        id IN (
          SELECT canvas_id FROM canvas_collaborators 
          WHERE user_id = auth.uid() AND permission = 'edit'
        )
    )
  );

-- Files: Same policies as nodes
CREATE POLICY "Users can view files" ON files
  FOR SELECT USING (
    node_id IN (
      SELECT id FROM nodes WHERE canvas_id IN (
        SELECT id FROM canvases WHERE 
          organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
          ) OR is_public = true
      )
    )
  );

CREATE POLICY "Users can manage files" ON files
  FOR ALL USING (
    node_id IN (
      SELECT id FROM nodes WHERE canvas_id IN (
        SELECT id FROM canvases WHERE 
          created_by = auth.uid() OR
          id IN (
            SELECT canvas_id FROM canvas_collaborators 
            WHERE user_id = auth.uid() AND permission = 'edit'
          )
      )
    )
  );

-- Canvas collaborators: Canvas owners can manage collaborators
CREATE POLICY "Canvas owners can manage collaborators" ON canvas_collaborators
  FOR ALL USING (
    canvas_id IN (
      SELECT id FROM canvases WHERE created_by = auth.uid()
    )
  );

-- Canvas collaborators: Users can view their own collaborations
CREATE POLICY "Users can view own collaborations" ON canvas_collaborators
  FOR SELECT USING (user_id = auth.uid());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();