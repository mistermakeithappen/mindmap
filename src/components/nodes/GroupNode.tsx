import { memo, useState } from 'react'
import { NodeProps, NodeResizer } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface GroupNodeData {
  label?: string
  color?: string
}

const colors = [
  { name: 'Blue', value: 'bg-blue-100 border-blue-400', rgba: 'rgba(219, 234, 254, 0.3)' },
  { name: 'Green', value: 'bg-green-100 border-green-400', rgba: 'rgba(220, 252, 231, 0.3)' },
  { name: 'Purple', value: 'bg-purple-100 border-purple-400', rgba: 'rgba(233, 213, 255, 0.3)' },
  { name: 'Pink', value: 'bg-pink-100 border-pink-400', rgba: 'rgba(252, 231, 243, 0.3)' },
  { name: 'Yellow', value: 'bg-yellow-100 border-yellow-400', rgba: 'rgba(254, 249, 195, 0.3)' },
]

export const GroupNode = memo(({ id, data = {}, selected }: NodeProps<GroupNodeData>) => {
  const [isEditing, setIsEditing] = useState(false)
  const [label, setLabel] = useState(data.label || 'Group')
  const colorData = colors.find(c => c.value === data.color) || colors[0]
  const [color, setColor] = useState(colorData.value)

  const handleSave = () => {
    setIsEditing(false)
  }

  return (
    <>
      <NodeResizer 
        isVisible={selected}
        minWidth={400}
        minHeight={300}
        handleStyle={{
          width: '12px',
          height: '12px',
          borderRadius: '6px',
          backgroundColor: '#6366f1',
          border: '2px solid white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        lineStyle={{
          borderColor: '#6366f1',
          borderWidth: '2px'
        }}
      />
      <div className={`relative w-full h-full ${selected ? 'ring-4 ring-indigo-500 ring-opacity-50' : ''}`}>
        {/* Background with proper styling */}
        <div 
          className={`absolute inset-0 ${color} border-2 rounded-xl transition-all shadow-md`}
          style={{ 
            backgroundColor: colors.find(c => c.value === color)?.rgba || colorData.rgba,
            borderStyle: 'dashed'
          }}
        />
        
        {/* Content container */}
        <div className="relative w-full h-full p-6 flex flex-col">
          <NodeHandles />
          
          {/* Header */}
          <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-2">
              <div className="text-2xl">📁</div>
              {isEditing ? (
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={handleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  className="text-lg font-semibold bg-white bg-opacity-70 px-2 py-1 rounded border-2 border-gray-400 focus:outline-none focus:border-gray-600"
                  autoFocus
                />
              ) : (
                <h3 
                  className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-gray-900 bg-white bg-opacity-70 px-3 py-1 rounded"
                  onClick={() => setIsEditing(true)}
                >
                  {label}
                </h3>
              )}
            </div>
            
            <div className="flex gap-1">
              {colors.map((c) => (
                <button
                  key={c.name}
                  className={`w-6 h-6 rounded-full ${c.value} border-2 transition-transform hover:scale-110`}
                  onClick={() => setColor(c.value)}
                  title={c.name}
                  style={{
                    borderColor: color === c.value ? '#4f46e5' : 'transparent',
                    borderWidth: '3px'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Content Area */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <div className="text-6xl mb-4 opacity-20">📥</div>
              <div className="text-lg font-medium text-gray-600 mb-2">
                Group Container
              </div>
              <div className="text-sm text-gray-500">
                Organize your nodes by placing them inside
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
})

GroupNode.displayName = 'GroupNode'