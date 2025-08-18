import { memo, useState, useEffect } from 'react'
import { NodeProps, useReactFlow, Handle, Position } from 'reactflow'

interface WaitNodeData {
  waitForNodeId?: string
  waitType?: 'completion' | 'time' | 'condition'
  waitTime?: number
  waitTimeUnit?: 'seconds' | 'minutes' | 'hours'
}

export const WaitNode = memo(({ id, data, selected }: NodeProps<WaitNodeData>) => {
  const [waitForNodeId, setWaitForNodeId] = useState(data.waitForNodeId || '')
  const [waitType, setWaitType] = useState(data.waitType || 'completion')
  const [waitTime, setWaitTime] = useState(data.waitTime || 5)
  const [waitTimeUnit, setWaitTimeUnit] = useState(data.waitTimeUnit || 'seconds')
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<WaitNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  // Get all action nodes that can be waited for
  const actionNodes = reactFlow.getNodes().filter(node => 
    node.type === 'action' && node.id !== id
  )

  const getSelectedNodeName = () => {
    if (!waitForNodeId) return 'Select action...'
    const node = actionNodes.find(n => n.id === waitForNodeId)
    return node?.data?.name || `Node ${waitForNodeId.slice(0, 8)}`
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border-2 ${
        selected ? 'border-yellow-500' : 'border-gray-300'
      } w-[200px] overflow-hidden`}
    >
      {/* Top handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-white !w-3 !h-3 !border-2 !border-black"
        style={{ top: -6 }}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-lg">⏳</span>
          <div className="text-xs font-semibold uppercase tracking-wide">
            Wait
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Wait type selector */}
        <div>
          <label className="text-xs text-gray-600 block mb-1">Wait Type</label>
          <select
            value={waitType}
            onChange={(e) => {
              const newType = e.target.value as WaitNodeData['waitType']
              setWaitType(newType || 'time')
              updateNodeData({ waitType: newType })
            }}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-500"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="completion">Until Action Completes</option>
            <option value="time">For Duration</option>
            <option value="condition">Until Condition</option>
          </select>
        </div>

        {/* Conditional content based on wait type */}
        {waitType === 'completion' && (
          <div>
            <label className="text-xs text-gray-600 block mb-1">Wait for Action</label>
            <select
              value={waitForNodeId}
              onChange={(e) => {
                setWaitForNodeId(e.target.value)
                updateNodeData({ waitForNodeId: e.target.value })
              }}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-500"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="">Select action...</option>
              {actionNodes.map(node => (
                <option key={node.id} value={node.id}>
                  {node.data?.name || `Action ${node.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
            {waitForNodeId && (
              <div className="mt-1 text-xs text-gray-500">
                Waiting for: {getSelectedNodeName()}
              </div>
            )}
          </div>
        )}

        {waitType === 'time' && (
          <div>
            <label className="text-xs text-gray-600 block mb-1">Duration</label>
            <div className="flex gap-1">
              <input
                type="number"
                min="1"
                value={waitTime}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1
                  setWaitTime(value)
                  updateNodeData({ waitTime: value })
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-500"
                onClick={(e) => e.stopPropagation()}
              />
              <select
                value={waitTimeUnit}
                onChange={(e) => {
                  const unit = e.target.value as WaitNodeData['waitTimeUnit']
                  setWaitTimeUnit(unit || 'seconds')
                  updateNodeData({ waitTimeUnit: unit })
                }}
                className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-500"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="seconds">sec</option>
                <option value="minutes">min</option>
                <option value="hours">hrs</option>
              </select>
            </div>
          </div>
        )}

        {waitType === 'condition' && (
          <div>
            <label className="text-xs text-gray-600 block mb-1">Condition</label>
            <input
              type="text"
              placeholder="Enter condition..."
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-yellow-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {/* Bottom handle */}
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

WaitNode.displayName = 'WaitNode'