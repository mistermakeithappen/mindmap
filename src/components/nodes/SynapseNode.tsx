import { memo, useState, useEffect, useRef } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'

interface SynapseNodeData {
  label?: string
  subCanvasId?: string
  nodeCount?: number
  canvasId?: string
}

export const SynapseNode = memo(({ id, data = {}, selected }: NodeProps<SynapseNodeData>) => {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label || 'Synapse')
  const [isCreating, setIsCreating] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isDragTarget, setIsDragTarget] = useState(false)
  const [actualSubCanvasId, setActualSubCanvasId] = useState<string | null>(data.subCanvasId || null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams()
  const reactFlow = useReactFlow()
  const supabase = createClient()
  
  // Get current canvas ID from URL if not in data
  const currentCanvasId = data.canvasId || params.canvasId as string

  // Debug editing state changes and focus input
  useEffect(() => {
    console.log('SynapseNode isEditing changed:', isEditing)
    if (isEditing && inputRef.current) {
      // Focus the input after a small delay to ensure it's rendered
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 10)
    }
  }, [isEditing])

  // Sync local label with data changes
  useEffect(() => {
    if (data.label && data.label !== label) {
      setLabel(data.label)
    }
  }, [data.label, label])

  // Check database for existing sub-canvas on mount
  useEffect(() => {
    const checkExistingSubCanvas = async () => {
      try {
        // First check if we already have subCanvasId in data
        if (data.subCanvasId) {
          setActualSubCanvasId(data.subCanvasId)
          return
        }
        
        // Check database for existing sub-canvas linked to this node
        const { data: nodeData } = await supabase
          .from('nodes')
          .select('data')
          .eq('id', id)
          .eq('canvas_id', currentCanvasId)
          .single()
        
        if (nodeData?.data?.subCanvasId) {
          setActualSubCanvasId(nodeData.data.subCanvasId)
          // Update React Flow state to match database
          reactFlow.setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id 
                ? { ...node, data: { ...node.data, subCanvasId: nodeData.data.subCanvasId } }
                : node
            )
          )
        }
      } catch (error) {
        console.error('Error checking existing sub-canvas:', error)
      }
    }
    
    checkExistingSubCanvas()
  }, [id, currentCanvasId, data.subCanvasId, reactFlow, supabase])
  
  // Listen for drag events
  useEffect(() => {
    const checkDragTarget = () => {
      const nodes = reactFlow.getNodes()
      const thisNode = nodes.find(n => n.id === id)
      if (thisNode && thisNode.className && thisNode.className.includes('drag-target')) {
        setIsDragTarget(true)
      } else {
        setIsDragTarget(false)
      }
    }
    
    const interval = setInterval(checkDragTarget, 100)
    return () => clearInterval(interval)
  }, [id, reactFlow])

  const handleSave = async () => {
    setIsEditing(false)
    
    // Update node data in React Flow
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, label } } : node
      )
    )
    
    // Persist to database
    try {
      await supabase
        .from('nodes')
        .update({ 
          data: {
            ...data,
            label
          }
        })
        .eq('id', id)
        .eq('canvas_id', currentCanvasId)

      // If this synapse node has a linked sub-canvas, update its name too
      if (actualSubCanvasId) {
        await supabase
          .from('canvases')
          .update({ name: label })
          .eq('id', actualSubCanvasId)
      }
    } catch (error) {
      console.error('Error saving synapse label:', error)
    }
  }

  const handleClick = async () => {
    console.log('Synapse clicked:', { id, actualSubCanvasId })
    
    if (!actualSubCanvasId) {
      // Create a new sub-canvas (only if none exists)
      setIsCreating(true)
      try {
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          console.error('User not authenticated')
          return
        }

        const newCanvasId = uuidv4()
        console.log('Creating new sub-canvas:', newCanvasId)
        
        // Create the sub-canvas
        const { error: canvasError } = await supabase.from('canvases').insert({
          id: newCanvasId,
          name: `${label} - Details`,
          description: `Nested canvas from ${label}`,
          user_id: userData.user.id,
          parent_canvas_id: currentCanvasId || null,
        })

        if (!canvasError) {
          // Update node data in database to persist the link
          const { error: nodeError } = await supabase
            .from('nodes')
            .update({ 
              data: {
                ...data,
                subCanvasId: newCanvasId
              }
            })
            .eq('id', id)
            .eq('canvas_id', currentCanvasId)
          
          if (!nodeError) {
            // Update React Flow state
            reactFlow.setNodes((nodes) =>
              nodes.map((node) =>
                node.id === id 
                  ? { ...node, data: { ...node.data, subCanvasId: newCanvasId } }
                  : node
              )
            )
            setActualSubCanvasId(newCanvasId)
            console.log('Navigating to new sub-canvas:', newCanvasId)
            router.push(`/canvas/${newCanvasId}`)
          } else {
            console.error('Error updating node with sub-canvas ID:', nodeError)
          }
        } else {
          console.error('Error creating sub-canvas:', canvasError)
        }
      } catch (error) {
        console.error('Error creating sub-canvas:', error)
      } finally {
        setIsCreating(false)
      }
    } else {
      // Navigate to existing sub-canvas
      console.log('Navigating to existing sub-canvas:', actualSubCanvasId)
      router.push(`/canvas/${actualSubCanvasId}`)
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Context menu triggered, setting editing to true')
    // Directly open the editor on right-click
    setIsEditing(true)
  }

  return (
    <div 
      className={`relative ${selected ? 'ring-4 ring-purple-500 ring-opacity-50' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onContextMenu={handleContextMenu}
    >
      <NodeHandles />
      
      {/* Portal/Black Hole Visual */}
      <div className="relative w-[200px] h-[200px] flex items-center justify-center">
        {/* Outer glow effect */}
        <div className="absolute inset-0 bg-purple-900 rounded-full blur-2xl opacity-30 animate-pulse" />
        
        {/* Swirling vortex layers */}
        <div className="absolute inset-2 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-900 via-black to-purple-900 animate-spin-slow" />
          <div className="absolute inset-2 bg-gradient-to-r from-indigo-900 via-black to-indigo-900 animate-spin-reverse" />
          <div className="absolute inset-4 bg-gradient-to-r from-purple-800 via-black to-purple-800 animate-spin-slow" />
          
          {/* Center black hole */}
          <div className="absolute inset-8 bg-black rounded-full shadow-[0_0_50px_rgba(147,51,234,0.5)]" />
          
          {/* Event horizon effect */}
          <div className="absolute inset-8 rounded-full border-2 border-purple-500 opacity-50 animate-pulse" />
        </div>
        
        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={(e) => {
                console.log('Input blur event')
                // Use a timeout to allow for other interactions
                setTimeout(() => {
                  if (document.activeElement !== inputRef.current) {
                    handleSave()
                  }
                }, 150)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  setIsEditing(false)
                  setLabel(data.label || 'Synapse') // Reset to original
                }
              }}
              className="text-sm font-semibold bg-black bg-opacity-70 text-white px-2 py-1 rounded border-2 border-purple-400 focus:outline-none focus:border-purple-300"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 className="text-sm font-semibold text-white mb-1">
              {label}
            </h3>
          )}
          
          {data.nodeCount && data.nodeCount > 0 && (
            <span className="text-xs text-purple-300">
              {data.nodeCount} nodes
            </span>
          )}
          
          {actualSubCanvasId && (
            <span className="text-xs text-green-300">
              ✓ Linked
            </span>
          )}
        </div>
        
        {/* Hover effect - gravitational pull indicator */}
        {(isHovering || isDragTarget) && (
          <div className="absolute inset-0 rounded-full">
            <div className={`absolute inset-0 border-2 ${isDragTarget ? 'border-purple-300' : 'border-purple-400'} rounded-full animate-ping ${isDragTarget ? 'opacity-60' : 'opacity-30'}`} />
            <div className={`absolute inset-0 border-2 ${isDragTarget ? 'border-indigo-300' : 'border-indigo-400'} rounded-full animate-ping animation-delay-200 ${isDragTarget ? 'opacity-40' : 'opacity-20'}`} />
          </div>
        )}
        
        {/* Drag target indicator - enhanced visual feedback */}
        {isDragTarget && (
          <>
            <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-pulse" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 opacity-30 animate-spin-slow" />
            <div className="absolute -inset-4 rounded-full border-4 border-purple-400 opacity-50 animate-pulse" />
          </>
        )}
        
        {/* Click hint */}
        {isHovering && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {actualSubCanvasId ? 'Click to enter • Right-click to rename' : 'Click to create sub-canvas • Right-click to rename'}
          </div>
        )}
      </div>
      
      {/* Drag instruction when hovering */}
      {isHovering && !actualSubCanvasId && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-purple-900 bg-opacity-90 text-white text-xs px-3 py-1 rounded whitespace-nowrap">
          Drag nodes here to nest them
        </div>
      )}
      
      {/* Loading overlay */}
      {isCreating && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
          <div className="text-white text-sm">Creating...</div>
        </div>
      )}
      
      {/* Click handler for navigation - only active when not editing */}
      {!isEditing && (
        <div 
          className="absolute inset-0 rounded-full cursor-pointer z-20"
          onClick={(e) => {
            e.stopPropagation()
            handleClick()
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('Context menu on click handler, setting editing to true')
            setIsEditing(true)
          }}
        />
      )}
    </div>
  )
})

SynapseNode.displayName = 'SynapseNode'