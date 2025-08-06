import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, nodes, edges, folder_id, metadata, subCanvases } = await request.json()

    if (!name || !nodes || !edges) {
      return NextResponse.json(
        { error: 'Name, nodes, and edges are required' },
        { status: 400 }
      )
    }

    // Create the canvas
    const canvasId = uuidv4()
    const { data: canvas, error: canvasError } = await supabase
      .from('canvases')
      .insert({
        id: canvasId,
        name,
        description,
        user_id: user.id,
        created_by: user.id, // This is what RLS policies check
        folder_id: folder_id || null,
        metadata: {
          ...metadata,
          source: 'ai-conversation',
          created_with: 'conversation-import'
        }
      })
      .select()
      .single()

    if (canvasError) {
      console.error('Canvas creation error:', canvasError)
      return NextResponse.json(
        { error: 'Failed to create canvas' },
        { status: 500 }
      )
    }

    // Save nodes
    if (nodes.length > 0) {
      const nodesData = nodes.map((node: any) => ({
        id: node.id,
        canvas_id: canvasId,
        type: node.type,
        position: node.position,
        data: node.data,
        style: node.style || {},
        // These columns might not exist yet if migrations haven't been run
        ...(node.width !== undefined && { width: node.width }),
        ...(node.height !== undefined && { height: node.height }),
        ...(node.parentNode && { parent_node: node.parentNode }),
        ...(node.extent && { extent: node.extent }),
        ...(node.zIndex !== undefined && { z_index: node.zIndex })
      }))

      const { error: nodesError } = await supabase
        .from('nodes')
        .insert(nodesData)

      if (nodesError) {
        console.error('Nodes creation error:', nodesError)
        // Try to clean up the canvas if nodes fail
        await supabase.from('canvases').delete().eq('id', canvasId)
        return NextResponse.json(
          { error: 'Failed to create nodes: ' + nodesError.message },
          { status: 500 }
        )
      }
    }

    // Save edges
    if (edges.length > 0) {
      const edgesData = edges.map((edge: any) => ({
        id: edge.id,
        canvas_id: canvasId,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'default',
        style: edge.style || {},
        ...(edge.data && { data: edge.data }),
        ...(edge.sourceHandle && { source_handle: edge.sourceHandle }),
        ...(edge.targetHandle && { target_handle: edge.targetHandle }),
        ...(edge.label && { label: edge.label })
      }))

      const { error: edgesError } = await supabase
        .from('edges')
        .insert(edgesData)

      if (edgesError) {
        console.error('Edges creation error:', edgesError)
        // Note: Not cleaning up here as partial success might be acceptable
      }
    }

    // Create sub-canvases if provided
    if (subCanvases && subCanvases.length > 0) {
      for (const subCanvas of subCanvases) {
        const { synapseId, nodes: subNodes, edges: subEdges } = subCanvas
        
        // Find the synapse node to get its label
        const synapseNode = nodes.find((n: any) => n.id === synapseId)
        const synapseLabel = synapseNode?.data?.label || 'Sub Canvas'
        
        // Create sub-canvas
        const subCanvasId = uuidv4()
        const { error: subCanvasError } = await supabase
          .from('canvases')
          .insert({
            id: subCanvasId,
            name: `${synapseLabel} - Details`,
            description: `Nested content for ${synapseLabel}`,
            user_id: user.id,
            created_by: user.id,
            parent_canvas_id: canvasId,
            metadata: {
              source: 'ai-conversation',
              parent_synapse: synapseId
            }
          })
        
        if (!subCanvasError) {
          // Update synapse node with sub-canvas ID - fix the data structure
          const updatedData = {
            ...synapseNode.data,
            subCanvasId: subCanvasId,
            nodeCount: subNodes.length
          }
          
          // Update both in database and in the nodes array for immediate response
          await supabase
            .from('nodes')
            .update({ 
              data: updatedData
            })
            .eq('id', synapseId)
            .eq('canvas_id', canvasId)
          
          // Also update the node in the nodes array that will be returned
          const nodeIndex = nodes.findIndex((n: any) => n.id === synapseId)
          if (nodeIndex !== -1) {
            nodes[nodeIndex].data = updatedData
          }
          
          // Create nodes for sub-canvas
          if (subNodes.length > 0) {
            const subNodesData = subNodes.map((node: any) => ({
              id: node.id,
              canvas_id: subCanvasId,
              type: node.type,
              position: node.position,
              data: node.data,
              style: node.style || {},
              ...(node.width !== undefined && { width: node.width }),
              ...(node.height !== undefined && { height: node.height })
            }))
            
            await supabase.from('nodes').insert(subNodesData)
          }
          
          // Create edges for sub-canvas
          if (subEdges.length > 0) {
            const subEdgesData = subEdges.map((edge: any) => ({
              id: edge.id,
              canvas_id: subCanvasId,
              source: edge.source,
              target: edge.target,
              type: edge.type || 'default',
              style: edge.style || {}
            }))
            
            await supabase.from('edges').insert(subEdgesData)
          }
        }
      }
    }

    // Log the AI generation event
    await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        canvas_id: canvasId,
        type: 'conversation-to-mindmap',
        metadata: {
          node_count: nodes.length,
          edge_count: edges.length,
          sub_canvases_count: subCanvases?.length || 0,
          original_content_length: metadata?.original_content_length,
          title: name
        }
      })

    return NextResponse.json({
      id: canvasId,
      success: true,
      canvas: {
        id: canvasId,
        name,
        description,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        subCanvasCount: subCanvases?.length || 0
      }
    })
  } catch (error) {
    console.error('Canvas creation from AI error:', error)
    return NextResponse.json(
      { error: 'Failed to create canvas from AI' },
      { status: 500 }
    )
  }
}