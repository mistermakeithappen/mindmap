import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, Handle, Position, useReactFlow } from 'reactflow'
import { DragHandle } from './DragHandle'

interface CanvasHeadlineNodeData {
  text?: string
  fontSize?: number
  fontWeight?: string
  color?: string
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right'
}

export const CanvasHeadlineNode = memo(({ id, data, selected, dragging }: NodeProps<CanvasHeadlineNodeData>) => {
  const [text, setText] = useState(data.text || 'Heading')
  const [isEditing, setIsEditing] = useState(false)
  const [fontSize, setFontSize] = useState(data.fontSize || 32)
  const [fontWeight, setFontWeight] = useState(data.fontWeight || '700')
  const [color, setColor] = useState(data.color || '#111827')
  const [fontFamily, setFontFamily] = useState(data.fontFamily || 'system-ui')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>(data.textAlign || 'left')
  const [textWidth, setTextWidth] = useState(200)
  const textRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const reactFlow = useReactFlow()
  
  // Check if multiple nodes are selected
  const selectedNodesCount = reactFlow.getNodes().filter(n => n.selected).length
  const showSettings = selected && selectedNodesCount === 1

  const updateNodeData = (updates: Partial<CanvasHeadlineNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  useEffect(() => {
    if (isEditing && textRef.current) {
      // Set the text content when entering edit mode
      textRef.current.innerText = text
      // Focus and put cursor at the end
      textRef.current.focus()
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(textRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing, text])

  // Measure text width and auto-resize
  useEffect(() => {
    if (measureRef.current) {
      // Create a temporary span to measure text width
      const span = measureRef.current
      span.style.fontSize = `${fontSize}px`
      span.style.fontWeight = fontWeight
      span.style.fontFamily = fontFamily
      span.style.visibility = 'hidden'
      span.style.position = 'absolute'
      span.style.whiteSpace = 'nowrap'
      span.innerText = text || 'Heading'
      
      document.body.appendChild(span)
      const width = span.offsetWidth
      document.body.removeChild(span)
      
      // Add padding for comfortable editing
      setTextWidth(Math.max(200, width + 40))
    }
  }, [text, fontSize, fontWeight, fontFamily])

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newText = e.currentTarget.innerText
    setText(newText)
    updateNodeData({ text: newText })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false)
      textRef.current?.blur()
    }
    // Allow Enter for line breaks in headlines
    e.stopPropagation()
  }

  return (
    <div 
      className={`group relative ${selected ? 'ring-2 ring-blue-400 ring-offset-2 rounded' : ''}`}
      style={{ 
        width: `${textWidth}px`,
        minHeight: '50px',
        padding: selected ? '8px' : '0px',
        background: 'transparent',
        zIndex: 1000 // Higher z-index to appear above other nodes
      }}
    >
      {/* Drag handle at the top */}
      <DragHandle position="top" showIcon={false} />
      
      {/* Hidden span for measuring text */}
      <span ref={measureRef} style={{ position: 'absolute', visibility: 'hidden', whiteSpace: 'nowrap' }} />
      {/* Handles - only visible when selected as single node */}
      {showSettings && (
        <>
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-white !w-2 !h-2 !border !border-black opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ top: -8 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-white !w-2 !h-2 !border !border-black opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ bottom: -8 }}
          />
          <Handle
            type="target"
            position={Position.Left}
            className="!bg-white !w-2 !h-2 !border !border-black opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: -8 }}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="!bg-white !w-2 !h-2 !border !border-black opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ right: -8 }}
          />
        </>
      )}

      {/* Main text content */}
      <div
        ref={textRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onDoubleClick={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        onInput={handleTextChange}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          // Always stop propagation to prevent node dragging
          e.stopPropagation()
        }}
        className="nodrag outline-none cursor-text"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight,
          color,
          fontFamily,
          textAlign,
          lineHeight: 1.2,
          minHeight: '40px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          background: 'transparent',
          border: 'none',
          padding: '4px',
          borderRadius: '4px',
          transition: 'background-color 0.2s',
          backgroundColor: isEditing ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text'
        }}
      >
        {!isEditing ? text : undefined}
      </div>

      {/* Settings panel - only visible when selected and only one node selected */}
      {showSettings && !isEditing && (
        <div 
          className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 z-50 transition-opacity duration-150"
          style={{ opacity: dragging ? 0.1 : 1, pointerEvents: dragging ? 'none' : 'auto' }}
        >
          <div className="space-y-2">
            {/* Alignment buttons */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600 mr-1">Align:</span>
              <button
                onClick={() => {
                  setTextAlign('left')
                  updateNodeData({ textAlign: 'left' })
                }}
                className={`p-1.5 rounded transition-colors ${
                  textAlign === 'left' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Align Left"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h12M3 18h18" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTextAlign('center')
                  updateNodeData({ textAlign: 'center' })
                }}
                className={`p-1.5 rounded transition-colors ${
                  textAlign === 'center' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Align Center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setTextAlign('right')
                  updateNodeData({ textAlign: 'right' })
                }}
                className={`p-1.5 rounded transition-colors ${
                  textAlign === 'right' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Align Right"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M9 12h12M3 18h18" />
                </svg>
              </button>
            </div>
            
            {/* Other controls */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
            <label className="flex items-center gap-1">
              <span className="text-gray-600">Size:</span>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => {
                  const size = parseInt(e.target.value) || 32
                  setFontSize(size)
                  updateNodeData({ fontSize: size })
                }}
                className="nodrag w-16 px-1 py-0.5 border border-gray-300 rounded"
                min="12"
                max="72"
              />
            </label>
            
            <label className="flex items-center gap-1">
              <span className="text-gray-600">Weight:</span>
              <select
                value={fontWeight}
                onChange={(e) => {
                  setFontWeight(e.target.value)
                  updateNodeData({ fontWeight: e.target.value })
                }}
                className="nodrag px-1 py-0.5 border border-gray-300 rounded text-xs"
              >
                <option value="400">Normal</option>
                <option value="500">Medium</option>
                <option value="600">Semibold</option>
                <option value="700">Bold</option>
                <option value="800">Extra Bold</option>
                <option value="900">Black</option>
              </select>
            </label>

            <label className="flex items-center gap-1">
              <span className="text-gray-600">Color:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value)
                  updateNodeData({ color: e.target.value })
                }}
                className="nodrag w-8 h-6 border border-gray-300 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center gap-1">
              <span className="text-gray-600">Font:</span>
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value)
                  updateNodeData({ fontFamily: e.target.value })
                }}
                className="nodrag px-1 py-0.5 border border-gray-300 rounded text-xs"
              >
                <option value="system-ui">System</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="monospace">Monospace</option>
                <option value="cursive">Cursive</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Times New Roman', serif">Times</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Courier New', monospace">Courier</option>
              </select>
            </label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

CanvasHeadlineNode.displayName = 'CanvasHeadlineNode'