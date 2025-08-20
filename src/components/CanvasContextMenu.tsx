import { useEffect, useRef } from 'react'

interface CanvasContextMenuProps {
  position: { x: number; y: number }
  onClose: () => void
  onPaste: () => void
  hasCopiedNodes: boolean
  copiedNodesCount?: number
}

export function CanvasContextMenu({ 
  position, 
  onClose, 
  onPaste,
  hasCopiedNodes,
  copiedNodesCount = 0
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

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
    }
  }, [onClose])

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
          onPaste()
          onClose()
        }}
        disabled={!hasCopiedNodes}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
          hasCopiedNodes 
            ? 'hover:bg-gray-100' 
            : 'opacity-50 cursor-not-allowed'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
          />
        </svg>
        <span>
          Paste
          {hasCopiedNodes && copiedNodesCount > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              ({copiedNodesCount} {copiedNodesCount === 1 ? 'node' : 'nodes'})
            </span>
          )}
        </span>
      </button>
    </div>
  )
}