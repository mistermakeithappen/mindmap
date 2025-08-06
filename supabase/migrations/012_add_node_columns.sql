-- Add missing columns to nodes table for React Flow compatibility
ALTER TABLE nodes 
  ADD COLUMN IF NOT EXISTS width FLOAT,
  ADD COLUMN IF NOT EXISTS height FLOAT,
  ADD COLUMN IF NOT EXISTS parent_node UUID REFERENCES nodes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS extent VARCHAR(20),
  ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_nodes_parent_node ON nodes(parent_node);
CREATE INDEX IF NOT EXISTS idx_nodes_z_index ON nodes(z_index);

-- Update extent check constraint
ALTER TABLE nodes 
  ADD CONSTRAINT nodes_extent_check 
  CHECK (extent IS NULL OR extent IN ('parent'));

-- Add missing columns to edges table
ALTER TABLE edges
  ADD COLUMN IF NOT EXISTS source_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS target_handle VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;