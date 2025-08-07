'use client'

import { useEffect, useState, useCallback } from 'react'
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

  const loadCanvas = useCallback(async () => {
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
    } finally {
      setLoading(false)
    }
  }, [canvasId, setNodes, setEdges, supabase])

  const saveCanvas = useCallback(async () => {
    if (!canvas || !nodes.length) return

    setSaving(true)
    try {
      // Save nodes
      const { error: nodesError } = await supabase
        .from('nodes')
        .upsert(
          nodes.map(node => ({
            id: node.id,
            canvas_id: canvasId,
            type: node.type,
            position: node.position,
            data: node.data,
            style: node.style,
          }))
        )

      if (nodesError) throw nodesError

      // Save edges
      const { error: edgesError } = await supabase
        .from('edges')
        .upsert(
          edges.map(edge => ({
            id: edge.id,
            canvas_id: canvasId,
            source: edge.source,
            target: edge.target,
            type: edge.type,
            label: edge.label,
            style: edge.style,
          }))
        )

      if (edgesError) throw edgesError

      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving canvas:', error)
    } finally {
      setSaving(false)
    }
  }, [canvas, nodes, edges, canvasId, supabase])

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
  }, [loadCanvas, setNodes, setEdges])

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
  }, [loadCanvas])

  // Auto-save functionality
  useEffect(() => {
    if (!canvas) return // Don't save if canvas hasn't loaded yet
    
    const saveTimer = setTimeout(() => {
      saveCanvas()
    }, 2000) // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [saveCanvas, canvas])

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