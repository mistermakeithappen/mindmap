import { useEffect, useRef, useState } from 'react'
import { Node } from 'reactflow'

interface NodeContextMenuProps {
  node: Node | null
  position: { x: number; y: number }
  onClose: () => void
  onDuplicate: (node: Node) => void
  onDelete: (nodeId: string) => void
}

export function NodeContextMenu({ 
  node, 
  position, 
  onClose, 
  onDuplicate, 
  onDelete 
}: NodeContextMenuProps) {
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

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999] min-w-[160px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <button
        onClick={() => {
          onDuplicate(node)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
          />
        </svg>
        Duplicate
      </button>

      <div className="border-t border-gray-200 my-1"></div>

      <button
        onClick={() => {
          if (deleteClickCount === 0) {
            // First click - start timer and increment count
            setDeleteClickCount(1)
            
            // Reset after 2 seconds if no second click
            deleteTimeoutRef.current = setTimeout(() => {
              setDeleteClickCount(0)
            }, 2000)
          } else {
            // Second click - delete the node
            clearTimeout(deleteTimeoutRef.current)
            onDelete(node.id)
            onClose()
          }
        }}
        className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
          deleteClickCount > 0 
            ? 'bg-red-100 text-red-700 font-medium' 
            : 'hover:bg-red-50 text-red-600'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
          />
        </svg>
        {deleteClickCount > 0 ? 'Click again to delete' : 'Delete'}
      </button>
    </div>
  )
}