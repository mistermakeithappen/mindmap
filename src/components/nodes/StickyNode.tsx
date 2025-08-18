import { memo, useState, useRef } from 'react'
import { NodeProps, useReactFlow, NodeResizer } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface StickyNodeData {
  text?: string
  color?: string
  shape?: 'square' | 'rounded' | 'circle' | 'hexagon' | 'diamond'
}

const colors = [
  { name: 'Yellow', value: 'bg-yellow-200', border: 'border-yellow-400' },
  { name: 'Pink', value: 'bg-pink-200', border: 'border-pink-400' },
  { name: 'Blue', value: 'bg-blue-200', border: 'border-blue-400' },
  { name: 'Green', value: 'bg-green-200', border: 'border-green-400' },
  { name: 'Purple', value: 'bg-purple-200', border: 'border-purple-400' },
  { name: 'Orange', value: 'bg-orange-200', border: 'border-orange-400' },
]

const shapes = [
  { name: 'Square', value: 'square', icon: '⬜' },
  { name: 'Rounded', value: 'rounded', icon: '⬜' },
  { name: 'Circle', value: 'circle', icon: '⭕' },
  { name: 'Hexagon', value: 'hexagon', icon: '⬡' },
  { name: 'Diamond', value: 'diamond', icon: '◆' },
]

export const StickyNode = memo(({ id, data, selected, dragging }: NodeProps<StickyNodeData>) => {
  const [text, setText] = useState(data.text || '')
  const [color, setColor] = useState(data.color || 'bg-yellow-200')
  const [shape, setShape] = useState(data.shape || 'square')
  const [showControls, setShowControls] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<StickyNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    updateNodeData({ text: e.target.value })
  }

  const handleColorChange = (newColor: string) => {
    setColor(newColor)
    updateNodeData({ color: newColor })
  }

  const handleShapeChange = (newShape: StickyNodeData['shape']) => {
    setShape(newShape || 'square')
    updateNodeData({ shape: newShape })
  }

  const getShapeClasses = () => {
    switch (shape) {
      case 'rounded':
        return 'rounded-2xl'
      case 'circle':
        return 'rounded-full aspect-square'
      case 'hexagon':
        return 'clip-path-hexagon'
      case 'diamond':
        return 'transform rotate-45'
      default:
        return 'rounded-lg'
    }
  }

  const getContentClasses = () => {
    if (shape === 'diamond') {
      return 'transform -rotate-45 scale-75'
    }
    return ''
  }

  const currentColorConfig = colors.find(c => c.value === color) || colors[0]

  return (
    <>
      <NodeResizer 
        isVisible={selected}
        minWidth={150}
        minHeight={150}
        color="#3b82f6"
        handleStyle={{ width: '10px', height: '10px' }}
      />
      <NodeHandles />
      
      <div 
        className={`relative ${currentColorConfig.value} shadow-md border-2 ${
          selected ? currentColorConfig.border : 'border-transparent'
        } w-full h-full ${getShapeClasses()} overflow-hidden transition-all duration-200`}
        style={shape === 'hexagon' ? {
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)'
        } : {}}
      >
        {/* Drag handle - top bar for repositioning */}
        <div 
          className="absolute top-0 left-0 right-0 h-8 cursor-move z-10 bg-black bg-opacity-0 hover:bg-opacity-5 transition-colors"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          <div className="flex items-center justify-center h-full">
            <div className={`w-12 h-1 ${currentColorConfig.border.replace('border-', 'bg-')} rounded-full opacity-30`} />
          </div>
        </div>

        {/* Control buttons */}
        <div 
          className="absolute top-2 right-2 z-20 transition-opacity duration-150"
          style={{ 
            opacity: (showControls || selected) && !dragging ? 1 : 0,
            pointerEvents: (showControls || selected) && !dragging ? 'auto' : 'none'
          }}
        >
          {/* Color picker */}
          <div className="flex gap-1 mb-2">
            {colors.map((c) => (
              <button
                key={c.value}
                onClick={() => handleColorChange(c.value)}
                className={`w-5 h-5 rounded-full ${c.value} ${c.border} border-2 ${
                  color === c.value ? 'ring-2 ring-gray-600 ring-offset-1' : ''
                } hover:scale-110 transition-transform`}
                title={c.name}
              />
            ))}
          </div>
          
          {/* Shape picker */}
          <div className="flex gap-1">
            {shapes.map((s) => (
              <button
                key={s.value}
                onClick={() => handleShapeChange(s.value as StickyNodeData['shape'])}
                className={`w-5 h-5 flex items-center justify-center text-xs rounded ${
                  shape === s.value 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-white bg-opacity-70 text-gray-700 hover:bg-opacity-90'
                } transition-all`}
                title={s.name}
              >
                {s.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Text content */}
        <div className={`w-full h-full p-4 pt-10 ${getContentClasses()}`}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Write a note..."
            className={`w-full h-full bg-transparent outline-none resize-none ${
              shape === 'circle' ? 'text-center flex items-center justify-center' : ''
            }`}
            style={{ 
              cursor: 'text',
              WebkitUserSelect: 'text',
              userSelect: 'text'
            }}
            onMouseDown={(e) => {
              // Stop propagation to prevent node dragging when selecting text
              e.stopPropagation()
            }}
          />
        </div>
      </div>

      {/* Custom CSS for hexagon */}
      <style jsx>{`
        .clip-path-hexagon {
          clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
        }
      `}</style>
    </>
  )
})

StickyNode.displayName = 'StickyNode'