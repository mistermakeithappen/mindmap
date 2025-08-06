-- Add user_id column to canvases table to make it consistent with other tables
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing canvases to set user_id from created_by
UPDATE canvases SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Add metadata column to canvases if not exists
ALTER TABLE canvases ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create table for tracking AI generations
CREATE TABLE IF NOT EXISTS ai_generations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES canvases(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX idx_ai_generations_canvas_id ON ai_generations(canvas_id);
CREATE INDEX idx_ai_generations_type ON ai_generations(type);
CREATE INDEX idx_ai_generations_created_at ON ai_generations(created_at);
CREATE INDEX idx_canvases_user_id ON canvases(user_id);

-- Enable RLS
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI generations" ON ai_generations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI generations" ON ai_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for canvases to also check user_id
CREATE POLICY "Users can create canvases with user_id" ON canvases
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can update own canvases by user_id" ON canvases
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can delete own canvases by user_id" ON canvases
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = created_by);

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