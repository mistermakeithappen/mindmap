const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateEmojiToSynapse() {
  try {
    // Get all emoji nodes
    const { data: emojiNodes, error: fetchError } = await supabase
      .from('nodes')
      .select('*')
      .eq('type', 'emoji')

    if (fetchError) {
      console.error('Error fetching emoji nodes:', fetchError)
      return
    }

    console.log(`Found ${emojiNodes?.length || 0} emoji nodes to migrate`)

    if (!emojiNodes || emojiNodes.length === 0) {
      console.log('No emoji nodes to migrate')
      return
    }

    // Update each emoji node to synapse type
    for (const node of emojiNodes) {
      const { error: updateError } = await supabase
        .from('nodes')
        .update({ 
          type: 'synapse',
          style: { width: 200, height: 200 }, // Update size
          data: { 
            ...node.data,
            label: 'Synapse',
            emoji: node.data?.emoji // Preserve emoji if it exists
          }
        })
        .eq('id', node.id)

      if (updateError) {
        console.error(`Error updating node ${node.id}:`, updateError)
      } else {
        console.log(`Migrated node ${node.id} from emoji to synapse`)
      }
    }

    console.log('Migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
  }
}

// Run the migration
migrateEmojiToSynapse()