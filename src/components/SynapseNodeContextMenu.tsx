import { useEffect, useRef, useState } from 'react'
import { Node } from 'reactflow'

interface SynapseNodeContextMenuProps {
  node: Node | null
  position: { x: number; y: number }
  onClose: () => void
  onRename: () => void
  onDelete: (nodeId: string, subCanvasId?: string) => void
}

export function SynapseNodeContextMenu({ 
  node, 
  position, 
  onClose, 
  onRename,
  onDelete 
}: SynapseNodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [deleteClickCount, setDeleteClickCount] = useState(0)
  const deleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as HTMLElement)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      // Clean up the delete timeout if component unmounts
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current)
      }
    }
  }, [onClose])

  if (!node) return null

  const subCanvasId = node.data?.subCanvasId || node.data?.actualSubCanvasId
  const hasSubCanvas = !!subCanvasId
  const nodeCount = node.data?.nodeCount || 0

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999] min-w-[180px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <button
        onClick={() => {
          onRename()
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
          />
        </svg>
        Rename
      </button>

      <div className="border-t border-gray-200 my-1"></div>

      <button
        onClick={() => {
          if (deleteClickCount === 0) {
            // First click - start timer and increment count
            setDeleteClickCount(1)
            
            // Reset after 3 seconds if no second click
            deleteTimeoutRef.current = setTimeout(() => {
              setDeleteClickCount(0)
            }, 3000)
          } else {
            // Second click - delete the node and sub-canvas
            clearTimeout(deleteTimeoutRef.current)
            onDelete(node.id, subCanvasId)
            onClose()
          }
        }}
        className={`w-full px-4 py-2 text-left text-sm transition-colors ${
          deleteClickCount > 0 
            ? 'bg-red-100 text-red-700 font-medium' 
            : 'hover:bg-red-50 text-red-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
            />
          </svg>
          <div className="flex-1">
            {deleteClickCount > 0 ? (
              <div>
                <div>Click again to delete</div>
                {hasSubCanvas && (
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ This will delete all nested content
                    {nodeCount > 0 && ` (${nodeCount} nodes)`}
                  </div>
                )}
              </div>
            ) : (
              'Delete'
            )}
          </div>
        </div>
      </button>
    </div>
  )
}