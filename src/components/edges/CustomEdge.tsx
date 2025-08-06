import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow'
import React, { useState } from 'react'

interface CustomEdgeData {
  ballColor?: string
  flowDirection?: 'forward' | 'reverse' | 'both'
  lineStyle?: 'solid' | 'dashed' | 'dotted'
  lineColor?: string
  flowSpeed?: number
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
  const reactFlow = useReactFlow()
  
  // Edge customization state
  const ballColor = data.ballColor || '#ef4444'
  const flowDirection = data.flowDirection || 'forward'
  const lineStyle = data.lineStyle || 'dashed'
  const lineColor = data.lineColor || '#6b7280'
  const flowSpeed = data.flowSpeed || 3

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

  // Initialize menu position when it first opens
  const initializeMenuPosition = () => {
    if (menuPosition.x === 0 && menuPosition.y === 0) {
      setMenuPosition({
        x: labelX + 50,
        y: Math.max(10, labelY - 150)
      })
    }
  }

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
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    setMenuPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    })
  }

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false)
  }

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
  }, [isDragging, dragOffset])

  // Initialize menu position when settings open
  React.useEffect(() => {
    if (showSettings) {
      initializeMenuPosition()
    }
  }, [showSettings, labelX, labelY])

  return (
    <>
      {/* Glow effect for selected edge */}
      {selected && (
        <path
          style={{
            ...style,
            stroke: lineColor,
            strokeWidth: 6,
            opacity: 0.3,
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
          setShowSettings(!showSettings)
        }}
      />
      
      {/* Clickable area for better interaction */}
      <path
        style={{
          stroke: 'transparent',
          strokeWidth: 20,
          ...style,
        }}
        className="cursor-pointer"
        d={edgePath}
        fill="none"
        onClick={(e) => {
          e.stopPropagation()
          setShowSettings(!showSettings)
        }}
      />
      
      {/* Animated dots along the path */}
      {flowDirection !== 'both' && (
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
      {flowDirection === 'both' && (
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
          height={320}
          className="overflow-visible"
          style={{ zIndex: 9999 }}
        >
          <div 
            className={`bg-white rounded-lg shadow-xl border-2 border-gray-200 ${isDragging ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'}`}
            style={{ 
              position: 'relative', 
              zIndex: 9999,
              pointerEvents: 'auto',
              isolation: 'isolate',
              padding: '8px',
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
              />
            </div>
            </div>
          </div>
        </foreignObject>
      )}
    </>
  )
}