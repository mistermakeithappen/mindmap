import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, useReactFlow, Handle, Position } from 'reactflow'

interface ActionNodeData {
  name?: string
  notes?: string
  actionType?: 'api' | 'database' | 'email' | 'transform' | 'custom'
}

export const ActionNode = memo(({ id, data, selected }: NodeProps<ActionNodeData>) => {
  const [name, setName] = useState(data.name || 'New Action')
  const [notes, setNotes] = useState(data.notes || '')
  const [actionType, setActionType] = useState(data.actionType || 'custom')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const notesInputRef = useRef<HTMLTextAreaElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<ActionNodeData>) => {
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

  const actionIcons = {
    api: '🌐',
    database: '💾',
    email: '📧',
    transform: '🔄',
    custom: '⚙️'
  }

  const actionColors = {
    api: 'from-blue-400 to-blue-500',
    database: 'from-indigo-400 to-indigo-500',
    email: 'from-pink-400 to-pink-500',
    transform: 'from-orange-400 to-orange-500',
    custom: 'from-gray-400 to-gray-500'
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border-2 ${
        selected ? 'border-blue-500' : 'border-gray-300'
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

      {/* Header with action type */}
      <div className={`bg-gradient-to-r ${actionColors[actionType]} text-white px-3 py-2`}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-lg">{actionIcons[actionType]}</span>
          <select
            value={actionType}
            onChange={(e) => {
              const newType = e.target.value as ActionNodeData['actionType']
              if (newType) {
                setActionType(newType)
                updateNodeData({ actionType: newType })
              }
            }}
            className="bg-transparent text-white text-xs border border-white/30 rounded px-1 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="api" className="text-gray-800">API Call</option>
            <option value="database" className="text-gray-800">Database</option>
            <option value="email" className="text-gray-800">Email</option>
            <option value="transform" className="text-gray-800">Transform</option>
            <option value="custom" className="text-gray-800">Custom</option>
          </select>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide opacity-90">
          Action
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
                setName(data.name || 'New Action')
                setIsEditingName(false)
              }
            }}
            className="w-full px-2 py-1 text-sm font-semibold border border-gray-300 rounded outline-none focus:border-blue-500"
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
              className="w-full px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded outline-none focus:border-blue-500 resize-none"
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

        {/* Action ID for reference by wait nodes */}
        <div className="mt-2 text-xs text-gray-400 text-center">
          ID: {id.slice(0, 8)}
        </div>
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

ActionNode.displayName = 'ActionNode'