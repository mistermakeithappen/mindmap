import { memo, useState } from 'react'
import { NodeProps } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface StickyNodeData {
  text?: string
  color?: string
}

const colors = ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-purple-200']

export const StickyNode = memo(({ id, data, selected }: NodeProps<StickyNodeData>) => {
  const [text, setText] = useState(data.text || '')
  const [color, setColor] = useState(data.color || 'bg-yellow-200')

  return (
    <div className={`${color} rounded-lg shadow-md p-4 border-2 ${selected ? 'border-gray-600' : 'border-transparent'} w-[200px] h-[200px] relative`}>
      <NodeHandles />
      <div className="absolute top-2 right-2 flex gap-1">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-4 h-4 rounded-full ${c} border border-gray-400 ${color === c ? 'ring-2 ring-gray-600' : ''}`}
          />
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note..."
        className="w-full h-full bg-transparent outline-none resize-none pt-6"
      />
    </div>
  )
})

StickyNode.displayName = 'StickyNode'