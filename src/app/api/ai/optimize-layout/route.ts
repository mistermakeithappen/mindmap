import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface Node {
  id: string
  type: string
  position: { x: number; y: number }
  data: any
  parentNode?: string
  extent?: string
  width?: number
  height?: number
}

interface Edge {
  id: string
  source: string
  target: string
}

// Force-directed layout algorithm
function optimizeLayout(nodes: Node[], edges: Edge[]): Node[] {
  // Create adjacency map
  const adjacency = new Map<string, string[]>()
  edges.forEach(edge => {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    if (!adjacency.has(edge.target)) adjacency.set(edge.target, [])
    adjacency.get(edge.source)!.push(edge.target)
    adjacency.get(edge.target)!.push(edge.source)
  })

  // Group nodes by parent
  const nodeGroups = new Map<string | undefined, Node[]>()
  nodes.forEach(node => {
    const parent = node.parentNode
    if (!nodeGroups.has(parent)) nodeGroups.set(parent, [])
    nodeGroups.get(parent)!.push(node)
  })

  // Optimize root nodes first
  const rootNodes = nodeGroups.get(undefined) || []
  if (rootNodes.length > 0) {
    // Find central node (usually the title/headline)
    const centralNode = rootNodes.find(n => n.type === 'headline') || rootNodes[0]
    
    // Position other root nodes in a circle around the central node
    const otherNodes = rootNodes.filter(n => n.id !== centralNode.id)
    const radius = 400
    otherNodes.forEach((node, index) => {
      const angle = (index / otherNodes.length) * 2 * Math.PI
      node.position = {
        x: centralNode.position.x + Math.cos(angle) * radius,
        y: centralNode.position.y + Math.sin(angle) * radius
      }
    })
  }

  // Apply force-directed adjustments
  const iterations = 50
  const repulsionForce = 5000
  const attractionForce = 0.1
  const damping = 0.8

  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>()
    
    // Initialize forces
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 })
    })

    // Calculate repulsion forces (all nodes repel each other)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i]
        const nodeB = nodes[j]
        
        // Skip if nodes are in different groups
        if (nodeA.parentNode !== nodeB.parentNode) continue

        const dx = nodeB.position.x - nodeA.position.x
        const dy = nodeB.position.y - nodeA.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0) {
          const force = repulsionForce / (distance * distance)
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          
          forces.get(nodeA.id)!.x -= fx
          forces.get(nodeA.id)!.y -= fy
          forces.get(nodeB.id)!.x += fx
          forces.get(nodeB.id)!.y += fy
        }
      }
    }

    // Calculate attraction forces (connected nodes attract)
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source)
      const targetNode = nodes.find(n => n.id === edge.target)
      
      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x
        const dy = targetNode.position.y - sourceNode.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 0) {
          const force = distance * attractionForce
          const fx = (dx / distance) * force
          const fy = (dy / distance) * force
          
          forces.get(sourceNode.id)!.x += fx
          forces.get(sourceNode.id)!.y += fy
          forces.get(targetNode.id)!.x -= fx
          forces.get(targetNode.id)!.y -= fy
        }
      }
    })

    // Apply forces with damping
    nodes.forEach(node => {
      // Skip nodes that are children of groups (they have relative positioning)
      if (node.parentNode) return
      
      const force = forces.get(node.id)!
      node.position.x += force.x * damping
      node.position.y += force.y * damping
    })
  }

  // Optimize nodes within groups
  nodeGroups.forEach((groupNodes, parentId) => {
    if (!parentId) return // Skip root nodes, already optimized

    // Find the parent group node
    const parentNode = nodes.find(n => n.id === parentId)
    if (!parentNode) return

    // Arrange child nodes in a grid within the group
    const cols = Math.ceil(Math.sqrt(groupNodes.length))
    const nodeSpacing = 150

    groupNodes.forEach((node, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      
      node.position = {
        x: col * nodeSpacing + 50,
        y: row * nodeSpacing + 50
      }
    })

    // Update group size to fit all children
    if (groupNodes.length > 0) {
      const maxX = Math.max(...groupNodes.map(n => (n.position.x + (n.width || 200))))
      const maxY = Math.max(...groupNodes.map(n => (n.position.y + (n.height || 100))))
      
      parentNode.width = maxX + 50
      parentNode.height = maxY + 50
    }
  })

  // Center the entire layout
  const allX = nodes.filter(n => !n.parentNode).map(n => n.position.x)
  const allY = nodes.filter(n => !n.parentNode).map(n => n.position.y)
  const minX = Math.min(...allX)
  const maxX = Math.max(...allX)
  const minY = Math.min(...allY)
  const maxY = Math.max(...allY)
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  // Translate to center
  nodes.forEach(node => {
    if (!node.parentNode) {
      node.position.x -= centerX
      node.position.y -= centerY
    }
  })

  return nodes
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { nodes, edges } = await request.json()

    if (!nodes || !edges) {
      return NextResponse.json({ error: 'Nodes and edges are required' }, { status: 400 })
    }

    // Optimize the layout
    const optimizedNodes = optimizeLayout(nodes, edges)

    return NextResponse.json({
      nodes: optimizedNodes,
      edges,
      metadata: {
        optimizedAt: new Date().toISOString(),
        layoutAlgorithm: 'force-directed'
      }
    })
  } catch (error) {
    console.error('Layout optimization error:', error)
    return NextResponse.json(
      { error: 'Failed to optimize layout' },
      { status: 500 }
    )
  }
}