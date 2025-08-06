'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { CanvasWrapper } from '@/components/CanvasWrapper'
import { CanvasHierarchySidebar } from '@/components/CanvasHierarchySidebar'
import { useCanvasStore } from '@/lib/store/canvas-store'
import type { Canvas as CanvasType } from '@/utils/supabase/types'

export default function CanvasPage() {
  const params = useParams()
  const router = useRouter()
  const canvasId = params.id as string
  const [canvas, setCanvas] = useState<CanvasType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const supabase = createClient()
  const { nodes, edges, setNodes, setEdges } = useCanvasStore()

  useEffect(() => {
    // Clear stores before loading new canvas
    setNodes([])
    setEdges([])
    loadCanvas()
    
    // Cleanup function to clear stores on unmount
    return () => {
      setNodes([])
      setEdges([])
    }
  }, [canvasId])

  // Reload canvas data when the page becomes visible (for synapse node updates)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, reload canvas data to catch any synapse node updates
        loadCanvas()
      }
    }

    const handleFocus = () => {
      // Window gained focus, reload canvas data
      loadCanvas()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [canvasId])

  // Auto-save functionality
  useEffect(() => {
    if (!canvas) return // Don't save if canvas hasn't loaded yet
    
    const saveTimer = setTimeout(() => {
      saveCanvas()
    }, 2000) // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [nodes, edges, canvas])

  const loadCanvas = async () => {
    try {
      // Load canvas details - use * to get all fields for compatibility
      const { data: canvasData, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', canvasId)
        .single()

      if (canvasError) throw canvasError
      setCanvas(canvasData)

      // Load nodes
      const { data: nodesData, error: nodesError } = await supabase
        .from('nodes')
        .select('*')
        .eq('canvas_id', canvasId)

      if (nodesError) throw nodesError

      // Load edges
      const { data: edgesData, error: edgesError } = await supabase
        .from('edges')
        .select('*')
        .eq('canvas_id', canvasId)

      if (edgesError) throw edgesError

      // Transform data for React Flow
      const transformedNodes = nodesData?.map(node => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          ...node.data,
          // Ensure synapse nodes have the canvasId
          ...(node.type === 'synapse' && { canvasId })
        },
        style: node.style,
      })) || []

      const transformedEdges = edgesData?.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
        style: edge.style,
      })) || []

      setNodes(transformedNodes)
      setEdges(transformedEdges)
    } catch (error) {
      console.error('Error loading canvas:', error)
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      // If it's a Supabase error, log details
      if (error && typeof error === 'object' && 'details' in error) {
        console.error('Supabase error details:', error)
      }
      
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const saveCanvas = async () => {
    setSaving(true)
    console.log('Saving canvas:', { canvasId, nodes: nodes.length, edges: edges.length })
    
    try {
      // Get existing nodes and edges to delete only removed ones
      const { data: existingNodes } = await supabase.from('nodes').select('id').eq('canvas_id', canvasId)
      const { data: existingEdges } = await supabase.from('edges').select('id').eq('canvas_id', canvasId)
      
      const currentNodeIds = nodes.map(n => n.id)
      const currentEdgeIds = edges.map(e => e.id)
      
      // Delete nodes that no longer exist
      const nodesToDelete = existingNodes?.filter(n => !currentNodeIds.includes(n.id)).map(n => n.id) || []
      if (nodesToDelete.length > 0) {
        const { error: deleteNodesError } = await supabase.from('nodes').delete().in('id', nodesToDelete)
        if (deleteNodesError) console.error('Error deleting nodes:', deleteNodesError)
      }
      
      // Delete edges that no longer exist
      const edgesToDelete = existingEdges?.filter(e => !currentEdgeIds.includes(e.id)).map(e => e.id) || []
      if (edgesToDelete.length > 0) {
        const { error: deleteEdgesError } = await supabase.from('edges').delete().in('id', edgesToDelete)
        if (deleteEdgesError) console.error('Error deleting edges:', deleteEdgesError)
      }

      // Save nodes
      if (nodes.length > 0) {
        const nodesToSave = nodes.map(node => ({
          id: node.id,
          canvas_id: canvasId,
          type: node.type,
          position: node.position,
          data: node.data || {},
          style: node.style || {},
        }))

        console.log('Saving nodes:', nodesToSave)
        const { data, error: nodesError } = await supabase
          .from('nodes')
          .upsert(nodesToSave, { onConflict: 'id' })
          .select()

        if (nodesError) {
          console.error('Error saving nodes:', JSON.stringify(nodesError, null, 2))
          console.error('Failed nodes data:', JSON.stringify(nodesToSave, null, 2))
          
          // Handle constraint error for synapse type
          if (nodesError.code === '23514' && nodesError.message?.includes('nodes_type_check')) {
            console.warn('Synapse node type not yet supported in database. Please update the database constraint.')
            // Continue without throwing error for now
            // TODO: Update database constraint to include 'synapse' type
          } else {
            throw nodesError
          }
        }
      }

      // Save edges
      if (edges.length > 0) {
        const edgesToSave = edges.map(edge => ({
          id: edge.id,
          canvas_id: canvasId,
          source: edge.source,
          target: edge.target,
          type: edge.type || 'default',
          label: edge.label || null,
          style: edge.style || {},
        }))

        console.log('Saving edges:', edgesToSave)
        const { error: edgesError } = await supabase
          .from('edges')
          .upsert(edgesToSave, { onConflict: 'id' })

        if (edgesError) {
          console.error('Error saving edges:', edgesError)
          throw edgesError
        }
      }

      // Update canvas updated_at
      const { error: updateError } = await supabase
        .from('canvases')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', canvasId)
        
      if (updateError) {
        console.error('Error updating canvas timestamp:', updateError)
      }
      
      console.log('Canvas saved successfully')
      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving canvas:', error)
      alert('Failed to save canvas. Check console for details.')
    } finally {
      setSaving(false)
    }
  }

  const saveCanvasTitle = async () => {
    if (!editTitle.trim() || !canvas) return

    const newName = editTitle.trim()

    // Update the canvas name
    const { error } = await supabase
      .from('canvases')
      .update({ name: newName })
      .eq('id', canvasId)

    if (!error) {
      // Update local state
      setCanvas({ ...canvas, name: newName })
      
      // Find and update any synapse nodes in parent canvases that point to this canvas
      try {
        // First, find all nodes where the data->subCanvasId matches this canvas
        const { data: synapseNodes } = await supabase
          .from('nodes')
          .select('id, canvas_id, data')
          .eq('type', 'synapse')
          .not('data', 'is', null)

        if (synapseNodes) {
          // Filter nodes that have subCanvasId pointing to our canvas
          const nodesToUpdate = synapseNodes.filter(node => 
            node.data && node.data.subCanvasId === canvasId
          )

          // Update each synapse node's label
          for (const node of nodesToUpdate) {
            await supabase
              .from('nodes')
              .update({
                data: {
                  ...node.data,
                  label: newName
                }
              })
              .eq('id', node.id)
          }
        }
      } catch (updateError) {
        console.error('Error updating synapse nodes:', updateError)
      }

      setIsEditingTitle(false)
    }
  }

  const handleTitleClick = () => {
    if (canvas) {
      setEditTitle(canvas.name)
      setIsEditingTitle(true)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveCanvasTitle()
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setEditTitle('')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading canvas...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={saveCanvasTitle}
              onKeyDown={handleTitleKeyDown}
              className="text-xl font-semibold bg-transparent border-b-2 border-blue-500 focus:outline-none px-1"
              autoFocus
            />
          ) : (
            <h1 
              className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleTitleClick}
              title="Click to rename"
            >
              {canvas?.name}
            </h1>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {saving && <span className="text-sm text-gray-500">Saving...</span>}
          {!saving && lastSaved && (
            <span className="text-sm text-green-600">
              Saved at {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={saveCanvas}
            className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
          >
            Save
          </button>
        </div>
      </div>
      <div className="flex-1">
        <CanvasWrapper canvasId={canvasId} />
        <CanvasHierarchySidebar />
      </div>
    </div>
  )
}