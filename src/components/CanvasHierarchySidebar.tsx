'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

interface Canvas {
  id: string
  name: string
  parent_canvas_id: string | null
}

interface CanvasWithChildren extends Canvas {
  children?: CanvasWithChildren[]
}

function getBreadcrumbs(canvas: CanvasWithChildren, currentId: string, breadcrumbs: Canvas[] = []): Canvas[] {
  if (canvas.id === currentId) {
    return [...breadcrumbs, canvas]
  }
  
  if (canvas.children) {
    for (const child of canvas.children) {
      const result = getBreadcrumbs(child, currentId, [...breadcrumbs, canvas])
      if (result.length > breadcrumbs.length + 1) {
        return result
      }
    }
  }
  
  return breadcrumbs
}

export function CanvasHierarchySidebar() {
  const [hierarchy, setHierarchy] = useState<CanvasWithChildren | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null)
  const [editingCanvasName, setEditingCanvasName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasId: string } | null>(null)
  const router = useRouter()
  const params = useParams()
  const currentCanvasId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    loadHierarchy()
  }, [currentCanvasId])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const loadHierarchy = async () => {
    try {
      // Get current canvas
      const { data: currentCanvas } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', currentCanvasId)
        .single()

      if (!currentCanvas) return

      // Build the hierarchy by traversing up to root
      let rootCanvas = currentCanvas
      const canvasMap = new Map<string, Canvas>()
      canvasMap.set(currentCanvas.id, currentCanvas)

      // Find root canvas by going up the parent chain
      while (rootCanvas.parent_canvas_id) {
        const { data: parentCanvas } = await supabase
          .from('canvases')
          .select('*')
          .eq('id', rootCanvas.parent_canvas_id)
          .single()

        if (!parentCanvas) break
        canvasMap.set(parentCanvas.id, parentCanvas)
        rootCanvas = parentCanvas
      }

      // Get all canvases in the hierarchy
      const { data: allCanvases } = await supabase
        .from('canvases')
        .select('*')
        .or(`id.eq.${rootCanvas.id},parent_canvas_id.eq.${rootCanvas.id}`)

      // Recursively get all descendants
      const getDescendants = async (parentId: string) => {
        const { data: children } = await supabase
          .from('canvases')
          .select('*')
          .eq('parent_canvas_id', parentId)

        if (children && children.length > 0) {
          for (const child of children) {
            canvasMap.set(child.id, child)
            await getDescendants(child.id)
          }
        }
      }

      await getDescendants(rootCanvas.id)

      // Build tree structure
      const buildTree = (canvas: Canvas): CanvasWithChildren => {
        const children: CanvasWithChildren[] = []
        
        for (const [id, c] of canvasMap.entries()) {
          if (c.parent_canvas_id === canvas.id) {
            children.push(buildTree(c))
          }
        }

        return {
          ...canvas,
          children: children.length > 0 ? children : undefined
        }
      }

      setHierarchy(buildTree(rootCanvas))
      setLoading(false)
    } catch (error) {
      console.error('Error loading hierarchy:', error)
      setLoading(false)
    }
  }

  const renameCanvas = async (canvasId: string) => {
    if (!editingCanvasName.trim()) return

    const newName = editingCanvasName.trim()

    // Update the canvas name
    const { error } = await supabase
      .from('canvases')
      .update({ name: newName })
      .eq('id', canvasId)

    if (!error) {
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

      setEditingCanvasId(null)
      loadHierarchy() // Reload to show updated name
    }
  }

  const handleContextMenu = (e: React.MouseEvent, canvasId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasId
    })
  }

  const renderCanvas = (canvas: CanvasWithChildren, level: number = 0) => {
    const isActive = canvas.id === currentCanvasId
    const hasChildren = canvas.children && canvas.children.length > 0
    const isEditing = editingCanvasId === canvas.id

    return (
      <div key={canvas.id} className="select-none">
        {isEditing ? (
          <div
            className="px-3 py-1.5"
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <input
              type="text"
              value={editingCanvasName}
              onChange={(e) => setEditingCanvasName(e.target.value)}
              onBlur={() => renameCanvas(canvas.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameCanvas(canvas.id)
                } else if (e.key === 'Escape') {
                  setEditingCanvasId(null)
                }
              }}
              className="w-full px-2 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        ) : (
          <Link
            href={`/canvas/${canvas.id}`}
            className={`block px-3 py-1.5 text-sm hover:bg-gray-100 rounded transition-colors ${
              isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
            style={{ paddingLeft: `${12 + level * 16}px` }}
            onContextMenu={(e) => handleContextMenu(e, canvas.id)}
          >
            <div className="flex items-center">
              {hasChildren && (
                <svg
                  className="w-3 h-3 mr-1 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
              <span className="truncate">{canvas.name}</span>
            </div>
          </Link>
        )}
        {hasChildren && (
          <div className="ml-2">
            {canvas.children!.map(child => renderCanvas(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  // Check if current canvas has any sub-canvases
  const hasSubCanvases = hierarchy && hierarchy.children && hierarchy.children.length > 0
  
  // Show sidebar if we're in a nested canvas or if current canvas has sub-canvases
  if (!hierarchy || (!hierarchy.parent_canvas_id && !hasSubCanvases)) {
    return null
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-4 top-20 z-40 bg-white rounded-lg shadow-md p-2 hover:shadow-lg transition-shadow"
        title={isOpen ? "Close hierarchy" : "Show hierarchy"}
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-transform z-30 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '250px', marginTop: '64px' }}
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Canvas Hierarchy</h3>
          {hierarchy && (
            <div className="flex items-center text-xs text-gray-500 flex-wrap">
              {getBreadcrumbs(hierarchy, currentCanvasId).map((canvas, index, arr) => (
                <div key={canvas.id} className="flex items-center">
                  {index > 0 && <span className="mx-1">›</span>}
                  <span className={canvas.id === currentCanvasId ? 'font-medium text-gray-700' : ''}>
                    {canvas.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-2 overflow-y-auto" style={{ height: 'calc(100% - 60px)' }}>
          {loading ? (
            <div className="text-center py-4 text-gray-500">
              Loading hierarchy...
            </div>
          ) : hierarchy ? (
            renderCanvas(hierarchy)
          ) : (
            <div className="text-center py-4 text-gray-500">
              No hierarchy found
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const canvas = hierarchy && findCanvasById(hierarchy, contextMenu.canvasId)
              if (canvas) {
                setEditingCanvasId(contextMenu.canvasId)
                setEditingCanvasName(canvas.name)
                setContextMenu(null)
              }
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Rename Canvas
          </button>
        </div>
      )}
    </>
  )
}

function findCanvasById(canvas: CanvasWithChildren, id: string): CanvasWithChildren | null {
  if (canvas.id === id) return canvas
  
  if (canvas.children) {
    for (const child of canvas.children) {
      const found = findCanvasById(child, id)
      if (found) return found
    }
  }
  
  return null
}