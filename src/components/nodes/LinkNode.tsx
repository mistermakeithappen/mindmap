import { memo, useState } from 'react'
import { NodeProps } from 'reactflow'
import { NodeHandles } from './NodeHandles'
import { DragHandle } from './DragHandle'

interface LinkNodeData {
  url?: string
  title?: string
}

export const LinkNode = memo(({ id, data, selected }: NodeProps<LinkNodeData>) => {
  const [url, setUrl] = useState(data.url || '')
  const [title, setTitle] = useState(data.title || '')

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} w-[250px]`}>
      <NodeHandles />
      {/* Drag handles on all sides for easier grabbing */}
      <DragHandle position="top" />
      <DragHandle position="left" showIcon={false} />
      <DragHandle position="right" showIcon={false} />
      <DragHandle position="bottom" showIcon={false} />
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🔗</span>
        <input
          type="text"
          placeholder="Link title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="nodrag flex-1 font-semibold outline-none"
        />
      </div>
      <input
        type="url"
        placeholder="Enter URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onMouseDown={(e) => e.stopPropagation()}
        className="nodrag w-full text-sm text-blue-600 outline-none"
      />
    </div>
  )
})

LinkNode.displayName = 'LinkNode'