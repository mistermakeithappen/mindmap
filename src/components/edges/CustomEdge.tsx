import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow'
import React, { useState } from 'react'
import { useCanvasStore } from '@/lib/store/canvas-store'

interface CustomEdgeData {
  ballColor?: string
  flowDirection?: 'forward' | 'reverse' | 'both'
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineColor?: string
  flowSpeed?: number
  animationEnabled?: boolean
}

const ballColors = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'White', value: '#ffffff' },
]

const lineStyles = [
  { name: 'Solid', value: 'solid', dashArray: '0' },
  { name: 'Dashed', value: 'dashed', dashArray: '5,5' },
  { name: 'Dotted', value: 'dotted', dashArray: '2,2' },
  { name: 'Long Dash', value: 'longdash', dashArray: '10,5' },
]

const lineColors = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Black', value: '#000000' },
]

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data = {},
}: EdgeProps<CustomEdgeData>) {
  const [showSettings, setShowSettings] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const reactFlow = useReactFlow()
  const { removeEdge } = useCanvasStore()
  
  // Edge customization state
  const ballColor = data.ballColor || '#ef4444'
  const flowDirection = data.flowDirection || 'forward'
  const lineStyle = data.lineStyle || 'dashed'
  const lineColor = data.lineColor || '#6b7280'
  const flowSpeed = data.flowSpeed || 3
  const animationEnabled = data.animationEnabled !== false // Default to true

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const updateEdgeData = (updates: Partial<CustomEdgeData>) => {
    const edges = reactFlow.getEdges()
    reactFlow.setEdges(
      edges.map((edge) =>
        edge.id === id ? { ...edge, data: { ...edge.data, ...updates } } : edge
      )
    )
  }

  const getDashArray = () => {
    const style = lineStyles.find(s => s.value === lineStyle)
    return style?.dashArray || '5,5'
  }

  // Find an open position for the menu that doesn't overlap with nodes
  const findOpenPosition = React.useCallback(() => {
    const nodes = reactFlow.getNodes()
    const menuWidth = 250
    const menuHeight = 400
    const padding = 20
    
    // Define candidate positions around the edge center
    const candidates = [
      { x: labelX + 50, y: labelY - menuHeight / 2 }, // Right
      { x: labelX - menuWidth - 50, y: labelY - menuHeight / 2 }, // Left
      { x: labelX - menuWidth / 2, y: labelY - menuHeight - 30 }, // Top
      { x: labelX - menuWidth / 2, y: labelY + 30 }, // Bottom
      { x: labelX + 100, y: labelY - menuHeight - 50 }, // Top-right
      { x: labelX - menuWidth - 100, y: labelY - menuHeight - 50 }, // Top-left
      { x: labelX + 100, y: labelY + 50 }, // Bottom-right
      { x: labelX - menuWidth - 100, y: labelY + 50 }, // Bottom-left
    ]
    
    // Check if a position overlaps with any node
    const checkCollision = (pos: { x: number, y: number }) => {
      const menuLeft = pos.x
      const menuRight = pos.x + menuWidth
      const menuTop = pos.y
      const menuBottom = pos.y + menuHeight
      
      for (const node of nodes) {
        const nodeLeft = (node.position?.x || 0) - padding
        const nodeRight = (node.position?.x || 0) + (node.width || 200) + padding
        const nodeTop = (node.position?.y || 0) - padding
        const nodeBottom = (node.position?.y || 0) + (node.height || 100) + padding
        
        // Check if rectangles overlap
        if (!(menuRight < nodeLeft || menuLeft > nodeRight || 
              menuBottom < nodeTop || menuTop > nodeBottom)) {
          return true // Collision detected
        }
      }
      return false // No collision
    }
    
    // Find the first position that doesn't collide
    for (const candidate of candidates) {
      // Ensure position is within viewport bounds
      const adjustedPos = {
        x: Math.max(10, Math.min(candidate.x, window.innerWidth - menuWidth - 10)),
        y: Math.max(10, Math.min(candidate.y, window.innerHeight - menuHeight - 10))
      }
      
      if (!checkCollision(adjustedPos)) {
        return adjustedPos
      }
    }
    
    // Fallback: position at top-right corner of viewport if no clear space found
    return {
      x: window.innerWidth - menuWidth - 20,
      y: 20
    }
  }, [labelX, labelY, reactFlow])

  // Initialize menu position when it first opens
  const initializeMenuPosition = React.useCallback(() => {
    if (menuPosition.x === 0 && menuPosition.y === 0) {
      const openPos = findOpenPosition()
      setMenuPosition(openPos)
    }
  }, [menuPosition.x, menuPosition.y, findOpenPosition])

  // Handle click outside to close menu
  React.useEffect(() => {
    if (!showSettings) return

    const handleClickOutside = (e: MouseEvent) => {
      // Check if click is outside the settings menu
      const target = e.target as HTMLElement
      const isSettingsMenu = target.closest('.edge-settings-menu')
      const isEdgePath = target.closest('.react-flow__edge-path')
      
      // Close if clicking outside the menu and not on the edge itself
      if (!isSettingsMenu && !isEdgePath) {
        setShowSettings(false)
      }
    }

    // Add listener with a small delay to avoid closing immediately on open
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showSettings])

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.menu-content')) return // Don't drag if clicking on controls
    
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - menuPosition.x,
      y: e.clientY - menuPosition.y
    })
    e.preventDefault()
  }

  // Handle drag move
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return
    
    setMenuPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }, [isDragging, dragOffset.x, dragOffset.y])

  // Handle drag end
  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove global mouse event listeners
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Initialize menu position when settings open
  React.useEffect(() => {
    if (showSettings) {
      initializeMenuPosition()
    }
  }, [showSettings, initializeMenuPosition])

  return (
    <>
      {/* Glow effect for selected or hovered edge */}
      {(selected || isHovered) && (
        <path
          style={{
            ...style,
            stroke: lineColor,
            strokeWidth: isHovered ? 4 : 6,
            opacity: isHovered ? 0.2 : 0.3,
            filter: 'blur(4px)',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          fill="none"
        />
      )}
      
      {/* Main edge path */}
      <path
        id={id}
        style={{
          stroke: selected ? lineColor : lineColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: getDashArray(),
          animation: lineStyle !== 'solid' ? 'dash 1s linear infinite' : 'none',
          ...style,
        }}
        className="react-flow__edge-path cursor-pointer"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
        onClick={(e) => {
          e.stopPropagation()
          if (!showSettings) {
            // Reset position to force recalculation
            setMenuPosition({ x: 0, y: 0 })
          }
          setShowSettings(!showSettings)
        }}
      />
      
      {/* Clickable area for better interaction - increased to 60px */}
      <path
        style={{
          stroke: 'transparent',
          strokeWidth: 60,
          ...style,
        }}
        className="cursor-pointer"
        d={edgePath}
        fill="none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          if (!showSettings) {
            // Reset position to force recalculation
            setMenuPosition({ x: 0, y: 0 })
          }
          setShowSettings(!showSettings)
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          removeEdge(id)
        }}
      />
      
      {/* Trash icon on hover */}
      {isHovered && (
        <foreignObject
          x={labelX - 20}
          y={labelY - 20}
          width={40}
          height={40}
          className="pointer-events-auto"
          style={{ overflow: 'visible', zIndex: 10000 }}
        >
          <div
            className="bg-white rounded-full p-2 shadow-xl border-2 border-red-200 hover:bg-red-50 hover:border-red-400 transition-all cursor-pointer group transform hover:scale-110"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={(e) => {
              e.stopPropagation()
              removeEdge(id)
            }}
            title="Delete connection"
          >
            <svg 
              className="w-6 h-6 text-red-500 group-hover:text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
              />
            </svg>
          </div>
        </foreignObject>
      )}
      
      {/* Animated dots along the path */}
      {animationEnabled && flowDirection !== 'both' && (
        <circle r="4" fill={ballColor}>
          <animateMotion 
            dur={`${flowSpeed}s`} 
            repeatCount="indefinite"
            keyPoints={flowDirection === 'reverse' ? '1;0' : '0;1'}
            keyTimes="0;1"
          >
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}
      
      {/* Bidirectional flow */}
      {animationEnabled && flowDirection === 'both' && (
        <>
          <circle r="4" fill={ballColor}>
            <animateMotion dur={`${flowSpeed}s`} repeatCount="indefinite">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
          <circle r="4" fill={ballColor}>
            <animateMotion 
              dur={`${flowSpeed}s`} 
              repeatCount="indefinite"
              keyPoints="1;0"
              keyTimes="0;1"
            >
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </>
      )}
      
      {/* Settings Panel */}
      {showSettings && (
        <foreignObject
          x={menuPosition.x}
          y={menuPosition.y}
          width={250}
          height={400}
          className="overflow-visible"
          style={{ 
            zIndex: 999999,
            position: 'relative',
            pointerEvents: 'auto'
          }}
        >
          <div 
            className={`edge-settings-menu bg-white rounded-lg shadow-2xl border-2 border-gray-300 ${isDragging ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab'}`}
            style={{ 
              position: 'relative', 
              zIndex: 999999,
              pointerEvents: 'auto',
              isolation: 'isolate',
              padding: '8px',
              transform: 'translateZ(0)',
              willChange: 'transform',
            }}
            onMouseDown={handleMouseDown}
          >
            {/* Drag handle header */}
            <div className="flex items-center justify-between mb-2 p-1 rounded bg-gray-50 border border-gray-200">
              <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1">
                <span className="text-gray-400">⋮⋮</span> Edge Settings
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowSettings(false)
                }}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="menu-content">
            {/* Ball Color */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Ball Color</label>
              <div className="grid grid-cols-4 gap-1">
                {ballColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => updateEdgeData({ ballColor: color.value })}
                    className={`h-6 rounded transition-transform hover:scale-105 ${
                      ballColor === color.value ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Flow Direction */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Flow Direction</label>
              <select
                value={flowDirection}
                onChange={(e) => updateEdgeData({ flowDirection: e.target.value as any })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="forward">Forward →</option>
                <option value="reverse">← Reverse</option>
                <option value="both">↔ Both</option>
              </select>
            </div>

            {/* Line Style */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Line Style</label>
              <select
                value={lineStyle}
                onChange={(e) => updateEdgeData({ lineStyle: e.target.value as any })}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {lineStyles.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Line Color */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">Line Color</label>
              <div className="grid grid-cols-3 gap-1">
                {lineColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => updateEdgeData({ lineColor: color.value })}
                    className={`h-6 rounded transition-transform hover:scale-105 ${
                      lineColor === color.value ? 'ring-1 ring-gray-800 ring-offset-1' : ''
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Flow Speed */}
            <div className="mb-3">
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Speed: {flowSpeed}s
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={flowSpeed}
                onChange={(e) => updateEdgeData({ flowSpeed: parseFloat(e.target.value) })}
                className="w-full h-2"
                disabled={!animationEnabled}
              />
            </div>
            
            {/* Animation Toggle */}
            <div className="mb-3">
              <button
                onClick={() => updateEdgeData({ animationEnabled: !animationEnabled })}
                className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                  animationEnabled 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {animationEnabled ? (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  ) : (
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                    />
                  )}
                </svg>
                {animationEnabled ? 'Animation On' : 'Animation Off'}
              </button>
            </div>
            
            {/* Delete Button */}
            <div className="pt-2 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to delete this connection?')) {
                    removeEdge(id)
                    setShowSettings(false)
                  }
                }}
                className="w-full px-3 py-1.5 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Connection
              </button>
            </div>
            </div>
          </div>
        </foreignObject>
      )}
    </>
  )
}