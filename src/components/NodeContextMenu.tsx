import { useEffect, useRef, useState } from 'react'
import { Node } from 'reactflow'
import { useNodeGroupsStore } from '@/lib/store/node-groups-store'

interface NodeContextMenuProps {
  nodes: Node[]  // Changed from single node to array of nodes
  position: { x: number; y: number }
  onClose: () => void
  onCopy: (nodes: Node[]) => void
  onDuplicate: (nodes: Node[]) => void
  onDelete: (nodeIds: string[]) => void
}

export function NodeContextMenu({ 
  nodes, 
  position, 
  onClose, 
  onCopy,
  onDuplicate, 
  onDelete 
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [deleteClickCount, setDeleteClickCount] = useState(0)
  const deleteTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const { createGroup, removeNodesFromGroup, areNodesGrouped } = useNodeGroupsStore()
  const nodeIds = nodes.map(n => n.id)
  const isGrouped = areNodesGrouped(nodeIds)

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

  if (!nodes || nodes.length === 0) return null

  const nodeCount = nodes.length
  const nodeText = nodeCount === 1 ? 'node' : `${nodeCount} nodes`

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
          onCopy(nodes)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" 
          />
        </svg>
        Copy {nodeText}
      </button>

      <button
        onClick={() => {
          onDuplicate(nodes)
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
          />
        </svg>
        Duplicate {nodeText}
      </button>

      {/* Group/Ungroup option - only show for multiple nodes */}
      {nodeCount > 1 && (
        <>
          <div className="border-t border-gray-200 my-1"></div>
          <button
            onClick={() => {
              if (isGrouped) {
                removeNodesFromGroup(nodeIds)
              } else {
                createGroup(nodeIds)
              }
              onClose()
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            {isGrouped ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                  />
                </svg>
                Ungroup {nodeText}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
                Group {nodeText}
              </>
            )}
          </button>
        </>
      )}

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
            // Second click - delete the nodes
            clearTimeout(deleteTimeoutRef.current)
            onDelete(nodes.map(n => n.id))
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
        {deleteClickCount > 0 ? `Click again to delete ${nodeText}` : `Delete ${nodeText}`}
      </button>
    </div>
  )
}