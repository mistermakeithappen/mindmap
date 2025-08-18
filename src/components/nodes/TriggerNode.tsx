import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, useReactFlow, Handle, Position } from 'reactflow'

interface TriggerNodeData {
  name?: string
  notes?: string
  triggerType?: 'manual' | 'scheduled' | 'webhook' | 'event'
}

export const TriggerNode = memo(({ id, data, selected }: NodeProps<TriggerNodeData>) => {
  const [name, setName] = useState(data.name || 'New Trigger')
  const [notes, setNotes] = useState(data.notes || '')
  const [triggerType, setTriggerType] = useState(data.triggerType || 'manual')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<TriggerNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  useEffect(() => {
    if (isEditingNotes && notesInputRef.current) {
      notesInputRef.current.focus()
    }
  }, [isEditingNotes])

  const triggerIcons = {
    manual: '▶️',
    scheduled: '⏰',
    webhook: '🔗',
    event: '⚡'
  }

  const triggerColors = {
    manual: 'from-green-400 to-green-500',
    scheduled: 'from-blue-400 to-blue-500',
    webhook: 'from-yellow-400 to-yellow-500',
    event: 'from-purple-400 to-purple-500'
  }

  const handlePlayClick = () => {
    if (isRunning) {
      // Stop animation
      setIsRunning(false)
      // Reset all automation edges
      const edges = reactFlow.getEdges()
      reactFlow.setEdges(edges.map(edge => ({
        ...edge,
        data: { ...edge.data, isAnimating: false }
      })))
    } else {
      // Start animation
      setIsRunning(true)
      const edges = reactFlow.getEdges()
      const nodes = reactFlow.getNodes()
      
      // Build the automation flow path
      const animateFlow = (currentNodeId: string, delay: number = 0) => {
        // Find edges coming from current node
        const outgoingEdges = edges.filter(edge => edge.source === currentNodeId)
        
        outgoingEdges.forEach((edge, index) => {
          // Calculate delay for this edge
          const edgeDelay = delay + (index * 200) // Small stagger for multiple outputs
          
          // Animate this edge
          setTimeout(() => {
            reactFlow.setEdges(currentEdges => currentEdges.map(e => 
              e.id === edge.id 
                ? { ...e, data: { ...e.data, isAnimating: true } }
                : e
            ))
            
            // Stop animation on this edge after 1 second
            setTimeout(() => {
              reactFlow.setEdges(currentEdges => currentEdges.map(e => 
                e.id === edge.id 
                  ? { ...e, data: { ...e.data, isAnimating: false } }
                  : e
              ))
            }, 1000)
            
            // Continue to next node
            const nextNode = nodes.find(n => n.id === edge.target)
            if (nextNode && ['action', 'wait', 'ifElse'].includes(nextNode.type || '')) {
              // Recursively animate the next part of the flow
              animateFlow(edge.target, edgeDelay + 1000)
            }
          }, edgeDelay)
        })
        
        // If this is the trigger node and no edges, stop immediately
        if (currentNodeId === id && outgoingEdges.length === 0) {
          setTimeout(() => setIsRunning(false), 500)
        }
      }
      
      // Start animation from trigger
      animateFlow(id)
      
      // Stop running state after max duration (safety timeout)
      setTimeout(() => setIsRunning(false), 30000) // 30 seconds max
    }
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border-2 ${
        selected ? 'border-green-500' : 'border-gray-300'
      } w-[200px] overflow-hidden`}
    >
      {/* Header with trigger type */}
      <div className={`bg-gradient-to-r ${triggerColors[triggerType]} text-white px-3 py-2`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{triggerIcons[triggerType]}</span>
            {/* Play/Stop button */}
            <button
              onClick={handlePlayClick}
              className={`p-1 rounded-full transition-all ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isRunning ? 'Stop' : 'Run Automation'}
            >
              {isRunning ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
          <select
            value={triggerType}
            onChange={(e) => {
              const newType = e.target.value as TriggerNodeData['triggerType']
              setTriggerType(newType)
              updateNodeData({ triggerType: newType })
            }}
            className="bg-transparent text-white text-xs border border-white/30 rounded px-1 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="manual" className="text-gray-800">Manual</option>
            <option value="scheduled" className="text-gray-800">Scheduled</option>
            <option value="webhook" className="text-gray-800">Webhook</option>
            <option value="event" className="text-gray-800">Event</option>
          </select>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-90">
          Trigger
        </div>
      </div>

      {/* Name field */}
      <div className="p-3">
        {isEditingName ? (
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              updateNodeData({ name })
              setIsEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateNodeData({ name })
                setIsEditingName(false)
              }
              if (e.key === 'Escape') {
                setName(data.name || 'New Trigger')
                setIsEditingName(false)
              }
            }}
            className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded outline-none focus:border-green-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h4 
            className="text-sm font-semibold text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
            onDoubleClick={() => setIsEditingName(true)}
          >
            {name}
          </h4>
        )}

        {/* Notes field */}
        <div className="mt-2">
          {isEditingNotes ? (
            <textarea
              ref={notesInputRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                updateNodeData({ notes })
                setIsEditingNotes(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setNotes(data.notes || '')
                  setIsEditingNotes(false)
                }
              }}
              className="w-full px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded outline-none focus:border-green-500 resize-none"
              rows={2}
              placeholder="Add notes..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p 
              className="text-xs text-gray-600 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[40px]"
              onDoubleClick={() => setIsEditingNotes(true)}
            >
              {notes || <span className="italic text-gray-400">Double-click to add notes</span>}
            </p>
          )}
        </div>
      </div>

      {/* Only bottom handle (no top handle for triggers) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-white !w-3 !h-3 !border-2 !border-black"
        style={{ bottom: -6 }}
      />
    </div>
  )
})

TriggerNode.displayName = 'TriggerNode'