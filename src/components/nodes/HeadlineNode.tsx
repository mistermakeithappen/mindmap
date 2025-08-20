import { memo, useState } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'
import { DragHandle } from './DragHandle'
import { GroupedNodeWrapper } from './GroupedNodeWrapper'

interface HeadlineNodeData {
  text?: string
  gradient?: string
  font?: string
  shadow?: string
  align?: string
}

const gradients = [
  { name: 'Purple Pink', value: 'from-purple-500 to-pink-500' },
  { name: 'Blue Green', value: 'from-blue-500 to-green-500' },
  { name: 'Red Orange', value: 'from-red-500 to-orange-500' },
  { name: 'Indigo Purple', value: 'from-indigo-500 to-purple-500' },
  { name: 'Teal Cyan', value: 'from-teal-500 to-cyan-500' },
  { name: 'Yellow Pink', value: 'from-yellow-400 to-pink-400' },
  { name: 'Gray Black', value: 'from-gray-700 to-black' },
  { name: 'Emerald Blue', value: 'from-emerald-400 to-blue-500' },
]

const fonts = [
  { name: 'Sans', value: 'font-sans' },
  { name: 'Serif', value: 'font-serif' },
  { name: 'Mono', value: 'font-mono' },
  { name: 'Display', value: 'font-display' },
]

const shadows = [
  { name: 'None', value: '' },
  { name: 'Small', value: 'drop-shadow-sm' },
  { name: 'Medium', value: 'drop-shadow-md' },
  { name: 'Large', value: 'drop-shadow-lg' },
  { name: 'XL', value: 'drop-shadow-xl' },
  { name: '2XL', value: 'drop-shadow-2xl' },
  { name: 'Glow', value: 'drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]' },
]

export const HeadlineNode = memo(({ id, data, selected }: NodeProps<HeadlineNodeData>) => {
  const [text, setText] = useState(data.text || 'Headline')
  const [isEditing, setIsEditing] = useState(false)
  const [gradient, setGradient] = useState(data.gradient || gradients[0].value)
  const [font, setFont] = useState(data.font || fonts[0].value)
  const [shadow, setShadow] = useState(data.shadow || shadows[2].value)
  const [align, setAlign] = useState(data.align || 'text-center')
  
  const reactFlow = useReactFlow()
  
  // Check if multiple nodes are selected
  const selectedNodesCount = reactFlow.getNodes().filter(n => n.selected).length
  const showToolbar = selected && selectedNodesCount === 1

  const updateNodeData = (updates: Partial<HeadlineNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    updateNodeData({ text: e.target.value })
  }

  const handleGradientChange = (newGradient: string) => {
    setGradient(newGradient)
    updateNodeData({ gradient: newGradient })
  }

  const handleFontChange = (newFont: string) => {
    setFont(newFont)
    updateNodeData({ font: newFont })
  }

  const handleShadowChange = (newShadow: string) => {
    setShadow(newShadow)
    updateNodeData({ shadow: newShadow })
  }

  const handleAlignChange = (newAlign: string) => {
    setAlign(newAlign)
    updateNodeData({ align: newAlign })
  }

  return (
    <GroupedNodeWrapper nodeId={id}>
      <div className={`relative bg-gradient-to-r ${gradient} rounded-lg shadow-md p-4 border-2 ${selected ? 'border-purple-700' : 'border-transparent'} min-w-[200px]`}>
        <NodeHandles />
        {/* Drag handles on all sides for easier grabbing */}
        <DragHandle position="top" />
        <DragHandle position="left" showIcon={false} />
        <DragHandle position="right" showIcon={false} />
        <DragHandle position="bottom" showIcon={false} />
        
        {/* Text Content */}
        {isEditing ? (
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            className={`nodrag w-full text-2xl font-bold text-white bg-transparent outline-none placeholder-white/70 ${font} ${shadow} ${align}`}
            autoFocus
          />
        ) : (
          <h2 
            onClick={() => setIsEditing(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`nodrag text-2xl font-bold text-white cursor-text ${font} ${shadow} ${align}`}
          >
            {text}
          </h2>
        )}
      </div>

      {/* Floating Settings Panel - Only show when selected and single node */}
      {showToolbar && (
        <div 
          className="absolute w-72 bg-white rounded-lg shadow-2xl p-4 border border-gray-200"
          style={{
            top: '50%',
            left: 'calc(100% + 20px)',
            transform: 'translateY(-50%)',
            zIndex: 1000,
          }}
        >
          {/* Arrow pointing to node */}
          <div 
            className="absolute w-4 h-4 bg-white border-l border-b border-gray-200 transform rotate-45"
            style={{
              left: '-8px',
              top: '50%',
              marginTop: '-8px',
            }}
          />
          <h3 className="font-semibold text-gray-800 mb-3">Customize Headline</h3>
          
          {/* Gradient Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Gradient</label>
            <div className="grid grid-cols-2 gap-2">
              {gradients.map((g) => (
                <button
                  key={g.value}
                  onClick={() => handleGradientChange(g.value)}
                  className={`h-8 rounded bg-gradient-to-r ${g.value} hover:scale-105 transition-transform ${
                    gradient === g.value ? 'ring-2 ring-gray-800 ring-offset-2' : ''
                  }`}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          {/* Font Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Font</label>
            <select
              value={font}
              onChange={(e) => handleFontChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {fonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shadow Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Drop Shadow</label>
            <select
              value={shadow}
              onChange={(e) => handleShadowChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {shadows.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Text Alignment */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Text Alignment</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleAlignChange('text-left')}
                className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                  align === 'text-left' 
                    ? 'bg-purple-500 text-white border-purple-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Left
              </button>
              <button
                onClick={() => handleAlignChange('text-center')}
                className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                  align === 'text-center' 
                    ? 'bg-purple-500 text-white border-purple-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Center
              </button>
              <button
                onClick={() => handleAlignChange('text-right')}
                className={`flex-1 px-3 py-2 border rounded-md transition-colors ${
                  align === 'text-right' 
                    ? 'bg-purple-500 text-white border-purple-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Right
              </button>
            </div>
          </div>

        </div>
      )}
    </GroupedNodeWrapper>
  )
})

HeadlineNode.displayName = 'HeadlineNode'