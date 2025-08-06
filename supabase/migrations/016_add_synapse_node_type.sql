-- Drop the existing check constraint
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

-- Add a new check constraint with all node types including synapse
ALTER TABLE nodes ADD CONSTRAINT nodes_type_check 
  CHECK (type IN ('text', 'image', 'video', 'file', 'link', 'ai-response', 'headline', 'sticky', 'emoji', 'group', 'synapse'));