'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { CanvasWrapper } from '@/components/CanvasWrapper'
import { useCanvasStore } from '@/lib/store/canvas-store'
import type { Canvas as CanvasType } from '@/utils/supabase/types'

export default function SharedCanvasPage() {
  const params = useParams()
  const canvasId = params.id as string
  const [canvas, setCanvas] = useState<CanvasType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { setNodes, setEdges } = useCanvasStore()

  const loadCanvas = useCallback(async () => {
    try {
      // Load canvas details - only load if it's public
      const { data: canvasData, error: canvasError } = await supabase
        .from('canvases')
        .select('*')
        .eq('id', canvasId)
        .eq('is_public', true)
        .single()

      if (canvasError) {
        if (canvasError.code === 'PGRST116') {
          setError('This mind map is not publicly shared or does not exist.')
        } else {
          setError('Failed to load mind map.')
        }
        return
      }

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
        width: node.width,
        height: node.height,
      })) || []

      const transformedEdges = edgesData?.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.source_handle || undefined,
        targetHandle: edge.target_handle || undefined,
        type: edge.type || 'default',
        label: edge.label || undefined,
        style: edge.style || {},
        data: edge.data || {},
      })) || []

      setNodes(transformedNodes)
      setEdges(transformedEdges)
    } catch (error) {
      console.error('Error loading shared canvas:', error)
      setError('Failed to load mind map.')
    } finally {
      setLoading(false)
    }
  }, [canvasId, setEdges, setNodes, supabase])

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading shared mind map...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Mind Map Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link 
            href="/" 
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {canvas?.name}
          </h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Shared Mind Map
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Read-only view
          </span>
          <Link 
            href="/" 
            className="px-3 py-1 text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Create Your Own
          </Link>
        </div>
      </div>
      <div className="flex-1">
        <CanvasWrapper canvasId={canvasId} readOnly={true} />
      </div>
    </div>
  )
}