'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { CanvasWrapper } from '@/components/CanvasWrapper'
import { CanvasHierarchySidebar } from '@/components/CanvasHierarchySidebar'
import { useCanvasStore } from '@/lib/store/canvas-store'
import type { Canvas as CanvasType } from '@/utils/supabase/types'
import { exportCanvas, downloadCanvasAsJSON, downloadCanvasAsHTML } from '@/utils/canvas-export'

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
  const [showExportMenu, setShowExportMenu] = useState(false)
  const supabase = createClient()
  const { nodes, edges, setNodes, setEdges } = useCanvasStore()

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowExportMenu(false)
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showExportMenu])

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
      const transformedNodes = nodesData?.map(node => {
        console.log('Loading node:', node.id, 'position:', node.position, 'dimensions:', node.width, 'x', node.height, 'parent:', node.parent_node)
        return {
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            ...node.data,
            // Ensure synapse nodes have the canvasId
            ...(node.type === 'synapse' && { canvasId })
          },
          style: node.style,
          width: node.width,
          height: node.height,
          parentId: node.parent_node || undefined,
          extent: node.extent as 'parent' | undefined,
          zIndex: node.z_index || 0,
          expandParent: true,
        }
      }) || []

      const transformedEdges = edgesData?.map(edge => {
        // Check if this was an automation edge saved with fallback
        const isAutomationType = edge.data?.isAutomationType === true
        const edgeType = isAutomationType ? 'automation' : (edge.type || 'default')
        
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.source_handle || undefined,
          targetHandle: edge.target_handle || undefined,
          type: edgeType,
          label: edge.label || undefined,
          style: edge.style || {},
          data: edge.data || {},
        }
      }) || []

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
  }, [canvasId, router, setEdges, setNodes, supabase])

  const saveCanvas = useCallback(async () => {
    if (loading) {
      console.log('Skipping save - still loading')
      return
    }
    
    setSaving(true)
    console.log('Saving canvas:', { canvasId, nodes: nodes.length, edges: edges.length })
    
    try {
      // Get existing nodes and edges to delete only removed ones
      const { data: existingNodes } = await supabase.from('nodes').select('id').eq('canvas_id', canvasId)
      const { data: existingEdges } = await supabase.from('edges').select('id').eq('canvas_id', canvasId)
      
      console.log('Existing edges in DB:', existingEdges?.map(e => e.id))
      console.log('Current edges in store:', edges.map(e => e.id))
      
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
        console.log('Deleting edges from database:', edgesToDelete)
        const { error: deleteEdgesError } = await supabase.from('edges').delete().in('id', edgesToDelete)
        if (deleteEdgesError) {
          console.error('Error deleting edges:', deleteEdgesError)
        } else {
          console.log('Successfully deleted edges:', edgesToDelete)
        }
      }

      // Save nodes
      if (nodes.length > 0) {
        const nodesToSave = nodes.map(node => {
          console.log('Saving node:', node.id, 'position:', node.position, 'dimensions:', node.width, 'x', node.height, 'parentId:', node.parentId)
          return {
            id: node.id,
            canvas_id: canvasId,
            type: node.type,
            position: node.position || { x: 0, y: 0 },
            data: node.data || {},
            style: node.style || {},
            width: node.width,
            height: node.height,
            parent_node: node.parentId || null,
            extent: node.extent || null,
            z_index: node.zIndex || 0,
          }
        })

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

      // Save edges (even if empty array to ensure proper state)
      if (edges.length > 0) {
        const edgesToSave = edges.map(edge => ({
          id: edge.id,
          canvas_id: canvasId,
          source: edge.source,
          target: edge.target,
          source_handle: edge.sourceHandle || null,
          target_handle: edge.targetHandle || null,
          type: 'default', // Always save as 'default' to avoid database constraint
          label: edge.label || null,
          style: edge.style || {},
          data: {
            ...(edge.data || {}),
            originalType: edge.type, // Store the actual type in data
            isAutomationType: edge.type === 'automation',
          },
        }))

        console.log('Saving edges:', edgesToSave)
        const { data, error: edgesError } = await supabase
          .from('edges')
          .upsert(edgesToSave, { onConflict: 'id' })
          .select()

        if (edgesError) {
          console.error('Error saving edges:', JSON.stringify(edgesError, null, 2))
          console.error('Failed edges data:', JSON.stringify(edgesToSave, null, 2))
          
          // Check if it's a constraint error for edge type
          if (edgesError.code === '23514' && edgesError.message?.includes('edges_type_check')) {
            console.warn('Automation edge type not yet supported in database. Falling back to default type.')
            // Retry with default type for automation edges
            const fallbackEdges = edgesToSave.map(edge => ({
              ...edge,
              type: edge.type === 'automation' ? 'default' : edge.type,
              data: { ...edge.data, isAutomationType: edge.type === 'automation' }
            }))
            
            const { error: retryError } = await supabase
              .from('edges')
              .upsert(fallbackEdges, { onConflict: 'id' })
              .select()
            
            if (retryError) {
              console.error('Retry failed:', retryError)
              throw retryError
            }
            console.log('Successfully saved edges with fallback type')
          } else {
            throw edgesError
          }
        }
      } else {
        console.log('No edges to save (all deleted)')
      }

      // Update canvas updated_at field
      const { error: canvasError } = await supabase
        .from('canvases')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', canvasId)

      if (canvasError) {
        console.error('Error updating canvas:', canvasError)
        throw canvasError
      }

      setLastSaved(new Date())
    } catch (error) {
      console.error('Error saving canvas:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
    } finally {
      setSaving(false)
    }
  }, [canvasId, edges, nodes, supabase, loading])

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
  }, [canvasId, loadCanvas, setEdges, setNodes])

  // Reload canvas data when the page becomes visible (for synapse node updates)
  // BUT only if we're not actively editing or have unsaved changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && !saving) {
        // Only reload if we're not in the middle of saving
        // This prevents overwriting local changes
        console.log('Page became visible, checking if reload needed...')
        // We could add more sophisticated checks here
      }
    }

    const handleFocus = () => {
      // Removed auto-reload on focus to prevent edge deletion issues
      // The auto-save will handle persisting changes
      console.log('Window gained focus - skipping reload to preserve local changes')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [canvasId, saving])

  // Auto-save functionality
  useEffect(() => {
    if (!canvas) return // Don't save if canvas hasn't loaded yet
    
    console.log('Auto-save triggered. Current edges:', edges.length)
    
    const saveTimer = setTimeout(() => {
      saveCanvas()
    }, 2000) // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer)
  }, [nodes, edges, canvas, saveCanvas])

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

  const handleExportJSON = () => {
    if (!canvas) return
    
    const exportData = exportCanvas(
      canvasId,
      canvas.name,
      canvas.description || undefined,
      nodes,
      edges
    )
    
    downloadCanvasAsJSON(exportData)
    setShowExportMenu(false)
  }

  const handleExportHTML = () => {
    if (!canvas) return
    
    const exportData = exportCanvas(
      canvasId,
      canvas.name,
      canvas.description || undefined,
      nodes,
      edges
    )
    
    downloadCanvasAsHTML(exportData)
    setShowExportMenu(false)
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
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowExportMenu(!showExportMenu)
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center gap-1"
              title="Export options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                <button
                  onClick={handleExportJSON}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export as JSON
                  <span className="text-xs text-gray-500">(Import-ready)</span>
                </button>
                <button
                  onClick={handleExportHTML}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  Export as HTML
                  <span className="text-xs text-gray-500">(Shareable)</span>
                </button>
              </div>
            )}
          </div>
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