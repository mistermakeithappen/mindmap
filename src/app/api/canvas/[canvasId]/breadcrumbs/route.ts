import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface BreadcrumbItem {
  canvasId: string
  canvasName: string
  parentNodeId: string | null
  depth: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ canvasId: string }> }
) {
  try {
    const { canvasId } = await params
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Recursive CTE to get all parent canvases
    const { data: breadcrumbs, error } = await supabase.rpc('get_canvas_breadcrumbs', {
      start_canvas_id: canvasId,
      user_id: user.id
    })

    if (error) {
      console.error('Error fetching breadcrumbs:', error)
      
      // Fallback to simple query if RPC doesn't exist
      const { data: canvas, error: canvasError } = await supabase
        .from('canvases')
        .select('id, name, parent_canvas_id, parent_node_id, depth')
        .eq('id', canvasId)
        .eq('user_id', user.id)
        .single()

      if (canvasError || !canvas) {
        return NextResponse.json({ error: 'Canvas not found' }, { status: 404 })
      }

      // Build breadcrumbs manually
      const breadcrumbItems: BreadcrumbItem[] = []
      let currentCanvas = canvas

      while (currentCanvas) {
        breadcrumbItems.unshift({
          canvasId: currentCanvas.id,
          canvasName: currentCanvas.name,
          parentNodeId: currentCanvas.parent_node_id,
          depth: currentCanvas.depth || 0
        })

        if (!currentCanvas.parent_canvas_id) break

        const { data: parent } = await supabase
          .from('canvases')
          .select('id, name, parent_canvas_id, parent_node_id, depth')
          .eq('id', currentCanvas.parent_canvas_id)
          .eq('user_id', user.id)
          .single()

        if (!parent) break
        currentCanvas = parent
      }

      return NextResponse.json({ breadcrumbs: breadcrumbItems })
    }

    return NextResponse.json({ breadcrumbs })
  } catch (error) {
    console.error('Error fetching breadcrumbs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}