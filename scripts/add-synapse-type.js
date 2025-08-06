const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSynapseNodeType() {
  try {
    // Drop existing constraint and add new one with synapse
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the existing check constraint
        ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;
        
        -- Add a new check constraint with all node types including synapse
        ALTER TABLE nodes ADD CONSTRAINT nodes_type_check 
          CHECK (type IN ('text', 'image', 'video', 'file', 'link', 'ai-response', 'headline', 'sticky', 'emoji', 'group', 'synapse'));
      `
    })

    if (error) {
      console.error('Error updating constraint:', error)
      
      // If exec_sql doesn't exist, try a different approach
      console.log('Trying alternative approach...')
      
      // We can't directly execute DDL through Supabase client
      console.log('\nPlease run the following SQL in your Supabase SQL editor:')
      console.log(`
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;

ALTER TABLE nodes ADD CONSTRAINT nodes_type_check 
  CHECK (type IN ('text', 'image', 'video', 'file', 'link', 'ai-response', 'headline', 'sticky', 'emoji', 'group', 'synapse'));
      `)
    } else {
      console.log('Successfully added synapse node type!')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the update
addSynapseNodeType()