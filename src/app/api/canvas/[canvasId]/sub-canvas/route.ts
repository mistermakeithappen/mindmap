import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params
    const supabase = await createClient()
    const { parentNodeId, groupName } = await request.json()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the parent canvas to verify ownership and get depth
    const { data: parentCanvas, error: canvasError } = await supabase
      .from('canvases')
      .select('*')
      .eq('id', canvasId)
      .eq('user_id', user.id)
      .single()

    if (canvasError || !parentCanvas) {
      return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
    }

    // Create the sub-canvas
    const subCanvasId = uuidv4()
    const { data: subCanvas, error: createError } = await supabase
      .from('canvases')
      .insert({
        id: subCanvasId,
        name: `${groupName || 'Group'} Contents`,
        description: `Contents of ${groupName || 'group'} from ${parentCanvas.name}`,
        created_by: user.id,
        user_id: user.id,
        parent_canvas_id: canvasId,
        parent_node_id: parentNodeId,
        depth: (parentCanvas.depth || 0) + 1
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating sub-canvas:', createError)
      return NextResponse.json({ error: 'Failed to create sub-canvas' }, { status: 500 })
    }

    // Update the parent node to be a portal
    const { error: updateError } = await supabase
      .from('nodes')
      .update({
        is_group_portal: true,
        sub_canvas_id: subCanvasId,
        // Will update the data field separately if needed
      })
      .eq('id', parentNodeId)
      .eq('canvas_id', canvasId)

    if (updateError) {
      console.error('Error updating parent node:', updateError)
      // Still return success as the sub-canvas was created
    }

    return NextResponse.json({ subCanvas })
  } catch (error) {
    console.error('Error creating sub-canvas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const nodeId = searchParams.get('nodeId')

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID required' }, { status: 400 })
    }

    // Get the sub-canvas associated with this node
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('sub_canvas_id')
      .eq('id', nodeId)
      .eq('canvas_id', canvasId)
      .single()

    if (nodeError || !node || !node.sub_canvas_id) {
      return NextResponse.json({ error: 'Sub-canvas not found' }, { status: 404 })
    }

    // Get the sub-canvas data with nodes and edges
    const { data: subCanvas, error: canvasError } = await supabase
      .from('canvases')
      .select(`
        *,
        nodes(*),
        edges(*)
      `)
      .eq('id', node.sub_canvas_id)
      .eq('user_id', user.id)
      .single()

    if (canvasError || !subCanvas) {
      return NextResponse.json({ error: 'Sub-canvas not found' }, { status: 404 })
    }

    return NextResponse.json({ subCanvas })
  } catch (error) {
    console.error('Error fetching sub-canvas:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}