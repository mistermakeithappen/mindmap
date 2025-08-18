import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, useReactFlow, Handle, Position, Node } from 'reactflow'

interface AutomationContainerData {
  label?: string
  expanded?: boolean
}

export const AutomationContainerNode = memo(({ id, data, selected }: NodeProps<AutomationContainerData>) => {
  const [label, setLabel] = useState(data.label || 'Automation')
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [expanded, setExpanded] = useState(data.expanded !== false)
  const [isDragOver, setIsDragOver] = useState(false)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<AutomationContainerData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [isEditingLabel])

  const handleLabelChange = (value: string) => {
    setLabel(value)
    updateNodeData({ label: value })
  }

  const toggleExpanded = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    updateNodeData({ expanded: newExpanded })
  }

  // Calculate minimum height based on child nodes
  useEffect(() => {
    const nodes = reactFlow.getNodes()
    const childNodes = nodes.filter(node => node.parentId === id)
    
    if (childNodes.length > 0 && expanded) {
      let maxY = 0
      childNodes.forEach(child => {
        const childBottom = (child.position?.y || 0) + (child.height || 100)
        maxY = Math.max(maxY, childBottom)
      })
      
      // Update container height if children need more space
      const minHeight = maxY + 40 // Add padding
      reactFlow.setNodes(nodes => 
        nodes.map(node => 
          node.id === id 
            ? { ...node, style: { ...node.style, minHeight: `${minHeight}px` } }
            : node
        )
      )
    }
  }, [id, expanded, reactFlow])

  return (
    <div 
      className={`bg-gradient-to-b from-purple-50 to-white rounded-lg shadow-lg border-2 ${
        selected ? 'border-purple-500' : 'border-purple-300'
      } ${isDragOver ? 'border-purple-600 border-dashed' : ''} w-full h-full transition-all duration-300`}
      style={{ minWidth: '400px', minHeight: expanded ? '400px' : '60px' }}
    >
      {/* Top Handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-white !w-3 !h-3 !border-2 !border-black"
        style={{ top: -6 }}
      />
      
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 bg-purple-500 text-white rounded-t-md ${!expanded ? 'rounded-b-md' : ''}`}>
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={toggleExpanded}
            className="text-white hover:bg-purple-600 rounded p-1 transition-colors"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {isEditingLabel ? (
            <input
              ref={labelInputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => {
                handleLabelChange(label)
                setIsEditingLabel(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleLabelChange(label)
                  setIsEditingLabel(false)
                }
                if (e.key === 'Escape') {
                  setLabel(data.label || 'Automation')
                  setIsEditingLabel(false)
                }
              }}
              className="bg-purple-600 text-white px-2 py-1 rounded outline-none flex-1"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3 
              className="font-semibold cursor-pointer hover:bg-purple-600 px-2 py-1 rounded flex-1"
              onDoubleClick={() => setIsEditingLabel(true)}
            >
              {label}
            </h3>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs bg-purple-600 px-2 py-1 rounded">
            Container
          </span>
        </div>
      </div>
      
      {/* Expandable Content Area */}
      {expanded && (
        <div className="p-4 relative flex-1" style={{ minHeight: '300px' }}>
          <div className="absolute inset-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-400 text-sm bg-white px-3">Drop automation nodes here</span>
          </div>
        </div>
      )}
      
      {/* Bottom Handle for outgoing connections */}
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

AutomationContainerNode.displayName = 'AutomationContainerNode'