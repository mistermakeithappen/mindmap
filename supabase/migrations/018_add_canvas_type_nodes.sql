-- Add canvas type nodes (canvasHeadline and canvasParagraph) to the node type constraint
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

-- Add new constraint including all node types including canvas type nodes
ALTER TABLE nodes ADD CONSTRAINT nodes_type_check 
  CHECK (type IN (
    'text', 
    'image', 
    'video', 
    'file', 
    'link', 
    'ai-response', 
    'headline', 
    'sticky', 
    'emoji', 
    'group', 
    'synapse',
    'automationContainer',
    'trigger',
    'action',
    'wait',
    'ifElse',
    'canvasHeadline',
    'canvasParagraph'
  ));

-- Add comment for clarity
COMMENT ON CONSTRAINT nodes_type_check ON nodes IS 'Allowed node types including canvas type nodes for direct canvas typing';