'use client'

import { useEffect, useRef } from 'react'

interface Node {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  type: 'text' | 'image' | 'synapse' | 'sticky'
  color: string
  size: number
  label: string
  icon: string
}

interface Connection {
  source: string
  target: string
}

export function AnimatedMindMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const nodesRef = useRef<Node[]>([])
  const connectionsRef = useRef<Connection[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)

    // Initialize nodes
    const nodeTypes = [
      { type: 'text', color: '#8b5cf6', icon: '📝', label: 'Ideas' },
      { type: 'image', color: '#10b981', icon: '🖼️', label: 'Visuals' },
      { type: 'synapse', color: '#6366f1', icon: '🌀', label: 'Connect' },
      { type: 'sticky', color: '#f59e0b', icon: '📌', label: 'Notes' },
      { type: 'text', color: '#ec4899', icon: '💡', label: 'Insights' },
      { type: 'image', color: '#14b8a6', icon: '📊', label: 'Data' },
      { type: 'synapse', color: '#8b5cf6', icon: '🔗', label: 'Link' },
      { type: 'sticky', color: '#ef4444', icon: '🎯', label: 'Goals' },
    ]

    nodesRef.current = nodeTypes.map((nodeType, i) => ({
      id: `node-${i}`,
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      type: nodeType.type as Node['type'],
      color: nodeType.color,
      size: 30 + Math.random() * 20,
      label: nodeType.label,
      icon: nodeType.icon,
    }))

    // Create connections
    connectionsRef.current = [
      { source: 'node-0', target: 'node-1' },
      { source: 'node-1', target: 'node-2' },
      { source: 'node-2', target: 'node-3' },
      { source: 'node-3', target: 'node-4' },
      { source: 'node-4', target: 'node-5' },
      { source: 'node-5', target: 'node-6' },
      { source: 'node-6', target: 'node-7' },
      { source: 'node-7', target: 'node-0' },
      { source: 'node-2', target: 'node-5' },
      { source: 'node-1', target: 'node-6' },
    ]

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    canvas.addEventListener('mousemove', handleMouseMove)

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0)'
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      // Update node positions
      nodesRef.current.forEach((node) => {
        // Add some physics
        node.vx *= 0.99 // Friction
        node.vy *= 0.99

        // Mouse repulsion
        const dx = mouseRef.current.x - node.x
        const dy = mouseRef.current.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.5
          node.vx -= (dx / dist) * force
          node.vy -= (dy / dist) * force
        }

        // Update position
        node.x += node.vx
        node.y += node.vy

        // Bounce off walls
        if (node.x < node.size || node.x > canvas.offsetWidth - node.size) {
          node.vx *= -1
          node.x = Math.max(node.size, Math.min(canvas.offsetWidth - node.size, node.x))
        }
        if (node.y < node.size || node.y > canvas.offsetHeight - node.size) {
          node.vy *= -1
          node.y = Math.max(node.size, Math.min(canvas.offsetHeight - node.size, node.y))
        }

        // Add small random movement
        node.vx += (Math.random() - 0.5) * 0.1
        node.vy += (Math.random() - 0.5) * 0.1

        // Limit velocity
        const maxSpeed = 2
        const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy)
        if (speed > maxSpeed) {
          node.vx = (node.vx / speed) * maxSpeed
          node.vy = (node.vy / speed) * maxSpeed
        }
      })

      // Draw connections
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)'
      ctx.lineWidth = 2
      connectionsRef.current.forEach((connection) => {
        const source = nodesRef.current.find(n => n.id === connection.source)
        const target = nodesRef.current.find(n => n.id === connection.target)
        if (source && target) {
          ctx.beginPath()
          ctx.moveTo(source.x, source.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
        }
      })

      // Draw nodes
      nodesRef.current.forEach((node) => {
        // Draw glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 2)
        gradient.addColorStop(0, node.color + '40')
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Draw node circle
        ctx.fillStyle = node.color + '20'
        ctx.strokeStyle = node.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Draw icon
        ctx.font = `${node.size * 0.8}px Arial`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.icon, node.x, node.y)

        // Draw label
        ctx.fillStyle = node.color
        ctx.font = '12px Inter'
        ctx.fillText(node.label, node.x, node.y + node.size + 15)
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', updateCanvasSize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
    />
  )
}