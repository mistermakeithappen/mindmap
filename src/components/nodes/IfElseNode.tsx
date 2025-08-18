import { memo, useState, useRef, useEffect } from 'react'
import { NodeProps, useReactFlow, Handle, Position } from 'reactflow'

interface IfElseNodeData {
  condition?: string
  branches?: string[]
}

export const IfElseNode = memo(({ id, data, selected }: NodeProps<IfElseNodeData>) => {
  const [condition, setCondition] = useState(data.condition || '')
  const [branches, setBranches] = useState<string[]>(data.branches || ['True', 'False'])
  const [isEditingCondition, setIsEditingCondition] = useState(false)
  const [editingBranchIndex, setEditingBranchIndex] = useState<number | null>(null)
  const conditionInputRef = useRef<HTMLInputElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<IfElseNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  useEffect(() => {
    if (isEditingCondition && conditionInputRef.current) {
      conditionInputRef.current.focus()
      conditionInputRef.current.select()
    }
  }, [isEditingCondition])

  const addBranch = () => {
    const newBranches = [...branches, `Branch ${branches.length + 1}`]
    setBranches(newBranches)
    updateNodeData({ branches: newBranches })
  }

  const removeBranch = (index: number) => {
    if (branches.length <= 2) return // Keep at least 2 branches
    const newBranches = branches.filter((_, i) => i !== index)
    setBranches(newBranches)
    updateNodeData({ branches: newBranches })
  }

  const updateBranch = (index: number, value: string) => {
    const newBranches = [...branches]
    newBranches[index] = value
    setBranches(newBranches)
    updateNodeData({ branches: newBranches })
  }

  return (
    <div 
      className={`bg-white rounded-lg shadow-md border-2 ${
        selected ? 'border-purple-500' : 'border-gray-300'
      } w-[250px] overflow-hidden`}
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
      <div className="bg-gradient-to-r from-purple-400 to-purple-500 text-white px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-lg">🔀</span>
          <div className="text-xs font-semibold uppercase tracking-wide">
            If/Else
          </div>
        </div>
      </div>

      {/* Condition field */}
      <div className="p-3 border-b border-gray-200">
        <label className="text-xs text-gray-600 block mb-1">Condition</label>
        {isEditingCondition ? (
          <input
            ref={conditionInputRef}
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            onBlur={() => {
              updateNodeData({ condition })
              setIsEditingCondition(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateNodeData({ condition })
                setIsEditingCondition(false)
              }
              if (e.key === 'Escape') {
                setCondition(data.condition || '')
                setIsEditingCondition(false)
              }
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-purple-500"
            placeholder="Enter condition..."
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div 
            className="text-sm text-gray-800 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded min-h-[28px]"
            onDoubleClick={() => setIsEditingCondition(true)}
          >
            {condition || <span className="italic text-gray-400">Double-click to set condition</span>}
          </div>
        )}
      </div>

      {/* Branches */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-600">Branches</label>
          <button
            onClick={addBranch}
            className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 transition-colors"
          >
            + Add Branch
          </button>
        </div>

        {branches.map((branch, index) => (
          <div key={index} className="relative flex items-center gap-2">
            {/* Branch output handle */}
            <Handle
              type="source"
              position={Position.Bottom}
              id={`branch-${index}`}
              className="!bg-white !w-3 !h-3 !border-2 !border-black !static !transform-none !inline-block"
              style={{ position: 'relative', top: 'auto', bottom: 'auto', transform: 'none' }}
            />
            
            {editingBranchIndex === index ? (
              <input
                type="text"
                value={branch}
                onChange={(e) => {
                  const newBranches = [...branches]
                  newBranches[index] = e.target.value
                  setBranches(newBranches)
                }}
                onBlur={() => {
                  updateBranch(index, branch)
                  setEditingBranchIndex(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    updateBranch(index, branch)
                    setEditingBranchIndex(null)
                  }
                  if (e.key === 'Escape') {
                    setBranches(data.branches || ['True', 'False'])
                    setEditingBranchIndex(null)
                  }
                }}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-purple-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div 
                className="flex-1 text-xs bg-gray-100 rounded px-2 py-1 cursor-pointer hover:bg-gray-200"
                onDoubleClick={() => setEditingBranchIndex(index)}
              >
                {branch}
              </div>
            )}

            {branches.length > 2 && (
              <button
                onClick={() => removeBranch(index)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Dynamic bottom handles for each branch */}
      <div className="relative h-4">
        {branches.map((_, index) => (
          <Handle
            key={`bottom-${index}`}
            type="source"
            position={Position.Bottom}
            id={`bottom-${index}`}
            className="!bg-white !w-3 !h-3 !border-2 !border-black"
            style={{ 
              bottom: -6,
              left: `${(100 / branches.length) * index + (100 / branches.length / 2)}%`,
              transform: 'translateX(-50%)'
            }}
          />
        ))}
      </div>
    </div>
  )
})

IfElseNode.displayName = 'IfElseNode'