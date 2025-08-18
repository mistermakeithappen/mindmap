import { EdgeProps, getBezierPath } from 'reactflow'
import React, { useState, useEffect } from 'react'

interface AutomationEdgeData {
  isAnimating?: boolean
  animationDelay?: number
  onAnimationComplete?: () => void
}

export function AutomationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data = {},
}: EdgeProps<AutomationEdgeData>) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [laserPosition, setLaserPosition] = useState(0)

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Handle animation trigger from data prop
  useEffect(() => {
    if (data.isAnimating && !isAnimating) {
      // Start animation after delay if specified
      const delay = data.animationDelay || 0
      const timer = setTimeout(() => {
        setIsAnimating(true)
        setLaserPosition(0)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [data.isAnimating, data.animationDelay, isAnimating])

  // Handle animation progression
  useEffect(() => {
    if (isAnimating) {
      const animationDuration = 1000 // 1 second for laser to travel
      const steps = 100
      const stepDuration = animationDuration / steps
      let currentStep = 0

      const interval = setInterval(() => {
        currentStep++
        setLaserPosition(currentStep / steps)

        if (currentStep >= steps) {
          clearInterval(interval)
          setIsAnimating(false)
          setLaserPosition(0)
          // Notify parent that animation is complete
          if (data.onAnimationComplete) {
            data.onAnimationComplete()
          }
        }
      }, stepDuration)

      return () => clearInterval(interval)
    }
  }, [isAnimating, data])

  return (
    <g>
      {/* Background glow effect */}
      <path
        style={{
          stroke: isAnimating ? '#00ffff' : '#8b5cf6',
          strokeWidth: isAnimating ? 8 : 4,
          opacity: isAnimating ? 0.3 : 0.1,
          filter: 'blur(8px)',
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
      />
      
      {/* Main edge path */}
      <path
        id={id}
        style={{
          stroke: isAnimating ? '#00ffff' : '#8b5cf6',
          strokeWidth: isAnimating ? 3 : 2,
          opacity: isAnimating ? 1 : 0.6,
          strokeDasharray: isAnimating ? '0' : '5, 5',
          filter: isAnimating ? 'drop-shadow(0 0 6px #00ffff)' : 'none',
          transition: 'all 0.3s ease',
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        fill="none"
      />

      {/* Laser beam animation */}
      {isAnimating && (
        <>
          {/* Laser head (bright core) */}
          <circle r="10" fill="#ffffff" filter="url(#laserGlow)">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
            />
          </circle>
          
          {/* Primary glow */}
          <circle r="8" fill="#00ffff" opacity="0.9" filter="url(#laserGlow)">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
              begin="0.02s"
            />
          </circle>
          
          {/* Laser trail 1 */}
          <circle r="6" fill="#00ffff" opacity="0.7">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
              begin="0.05s"
            />
          </circle>
          
          {/* Laser trail 2 */}
          <circle r="5" fill="#8b5cf6" opacity="0.6">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
              begin="0.08s"
            />
          </circle>
          
          {/* Laser trail 3 */}
          <circle r="4" fill="#8b5cf6" opacity="0.4">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
              begin="0.12s"
            />
          </circle>
          
          {/* Energy sparks */}
          <circle r="2" fill="#ffffff" opacity="0.8">
            <animateMotion
              dur="1s"
              repeatCount="1"
              path={edgePath}
              begin="0s"
            />
            <animate
              attributeName="r"
              values="2;4;2"
              dur="0.3s"
              repeatCount="3"
            />
          </circle>
        </>
      )}

      {/* SVG filter for glow effect */}
      <defs>
        <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feFlood flood-color="#00ffff" flood-opacity="0.5"/>
          <feComposite in2="coloredBlur" operator="in"/>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Pulse animation at source when idle */}
      {!isAnimating && (
        <circle
          cx={sourceX}
          cy={sourceY}
          r="4"
          fill="#8b5cf6"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            values="4;8;4"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </g>
  )
}