import { memo } from 'react'

interface DragHandleProps {
  position?: 'top' | 'left' | 'right' | 'bottom'
  className?: string
  showIcon?: boolean
}

export const DragHandle = memo(({ 
  position = 'top', 
  className = '',
  showIcon = true
}: DragHandleProps) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-0 left-0 right-0 h-6 cursor-move'
      case 'bottom':
        return 'bottom-0 left-0 right-0 h-6 cursor-move'
      case 'left':
        return 'left-0 top-0 bottom-0 w-6 cursor-move'
      case 'right':
        return 'right-0 top-0 bottom-0 w-6 cursor-move'
      default:
        return 'top-0 left-0 right-0 h-6 cursor-move'
    }
  }

  return (
    <div 
      className={`drag-handle absolute z-10 bg-transparent hover:bg-gray-100 hover:bg-opacity-10 transition-colors ${getPositionClasses()} ${className}`}
    >
      {showIcon && (
        <div className="flex items-center justify-center h-full w-full">
          <svg 
            className="w-4 h-4 text-gray-400 opacity-50"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            {position === 'left' || position === 'right' ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
            )}
          </svg>
        </div>
      )}
    </div>
  )
})

DragHandle.displayName = 'DragHandle'