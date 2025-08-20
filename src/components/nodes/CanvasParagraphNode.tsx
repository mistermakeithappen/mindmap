import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, Handle, Position, useReactFlow } from 'reactflow'
import { DragHandle } from './DragHandle'

interface CanvasParagraphNodeData {
  text?: string
  fontSize?: number
  lineHeight?: number
  color?: string
  fontFamily?: string
  textAlign?: 'left' | 'center' | 'right' | 'justify'
}

export const CanvasParagraphNode = memo(({ id, data, selected, dragging }: NodeProps<CanvasParagraphNodeData>) => {
  const [text, setText] = useState(data.text || 'Start typing your paragraph here...')
  const [isEditing, setIsEditing] = useState(false)
  const [fontSize, setFontSize] = useState(data.fontSize || 16)
  const [lineHeight, setLineHeight] = useState(data.lineHeight || 1.6)
  const [color, setColor] = useState(data.color || '#374151')
  const [fontFamily, setFontFamily] = useState(data.fontFamily || 'system-ui')
  const [textAlign, setTextAlign] = useState(data.textAlign || 'left')
  const [textDimensions, setTextDimensions] = useState({ width: 300, height: 80 })
  const textRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const reactFlow = useReactFlow()
  
  // Check if multiple nodes are selected
  const selectedNodesCount = reactFlow.getNodes().filter(n => n.selected).length
  const showSettings = selected && selectedNodesCount === 1

  const updateNodeData = (updates: Partial<CanvasParagraphNodeData>) => {
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

  // Measure text dimensions and auto-resize
  useEffect(() => {
    if (measureRef.current) {
      // Create a temporary div to measure text dimensions
      const div = measureRef.current
      div.style.fontSize = `${fontSize}px`
      div.style.lineHeight = `${lineHeight}`
      div.style.fontFamily = fontFamily
      div.style.visibility = 'hidden'
      div.style.position = 'absolute'
      div.style.whiteSpace = 'pre-wrap'
      div.style.wordBreak = 'break-word'
      div.innerText = text || 'Start typing your paragraph here...'
      
      // Temporarily add to body to measure
      document.body.appendChild(div)
      
      // Measure width for each line and find maximum
      const lines = text.split('\n')
      let maxWidth = 0
      
      lines.forEach(line => {
        div.style.whiteSpace = 'nowrap'
        div.innerText = line || ' '
        maxWidth = Math.max(maxWidth, div.offsetWidth)
      })
      
      // Measure height with wrapping
      div.style.whiteSpace = 'pre-wrap'
      div.style.width = 'auto'
      div.innerText = text || 'Start typing your paragraph here...'
      const height = div.offsetHeight
      
      document.body.removeChild(div)
      
      // Add padding for comfortable editing
      setTextDimensions({
        width: Math.min(800, Math.max(300, maxWidth + 60)),
        height: Math.max(80, height + 40)
      })
    }
  }, [text, fontSize, lineHeight, fontFamily])

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
    // Allow all keys for paragraph editing
    e.stopPropagation()
  }

  return (
    <div 
      className={`group relative ${selected ? 'ring-2 ring-blue-400 ring-offset-2 rounded' : ''}`}
      style={{ 
        width: `${textDimensions.width}px`,
        height: `${textDimensions.height}px`,
        padding: selected ? '8px' : '0px',
        background: 'transparent',
        zIndex: 1000 // Higher z-index to appear above other nodes
      }}
    >
      {/* Drag handle at the top */}
      <DragHandle position="top" showIcon={false} />
      
      {/* Hidden div for measuring text */}
      <div ref={measureRef} style={{ position: 'absolute', visibility: 'hidden' }} />
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
          lineHeight,
          color,
          fontFamily,
          textAlign,
          minHeight: '60px',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          background: 'transparent',
          border: 'none',
          padding: '8px',
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
              <button
                onClick={() => {
                  setTextAlign('justify')
                  updateNodeData({ textAlign: 'justify' })
                }}
                className={`p-1.5 rounded transition-colors ${
                  textAlign === 'justify' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                title="Justify"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h18M3 18h18" />
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
                    const size = parseInt(e.target.value) || 16
                    setFontSize(size)
                    updateNodeData({ fontSize: size })
                  }}
                  className="nodrag w-14 px-1 py-0.5 border border-gray-300 rounded"
                  min="10"
                  max="32"
                />
              </label>
              
              <label className="flex items-center gap-1">
                <span className="text-gray-600">Line:</span>
                <input
                  type="number"
                  value={lineHeight}
                  onChange={(e) => {
                    const height = parseFloat(e.target.value) || 1.6
                    setLineHeight(height)
                    updateNodeData({ lineHeight: height })
                  }}
                  className="nodrag w-14 px-1 py-0.5 border border-gray-300 rounded"
                  min="1"
                  max="3"
                  step="0.1"
                />
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
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', serif">Times</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Helvetica Neue', sans-serif">Helvetica</option>
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

CanvasParagraphNode.displayName = 'CanvasParagraphNode'