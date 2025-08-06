import { Node, Edge } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'

export interface GroupCreationResult {
  groupNode: Node
  subCanvasId: string
  nodesToMove: Node[]
  edgesToMove: Edge[]
  edgesToUpdate: Edge[]
}

export function calculateGroupBounds(nodes: Node[]): { x: number, y: number, width: number, height: number } {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 400, height: 300 }
  }

  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  nodes.forEach(node => {
    const nodeWidth = node.width || 200
    const nodeHeight = node.height || 100
    
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + nodeWidth)
    maxY = Math.max(maxY, node.position.y + nodeHeight)
  })

  const padding = 60
  const width = Math.max(400, maxX - minX + padding * 2)
  const height = Math.max(300, maxY - minY + padding * 2)

  return {
    x: minX - padding,
    y: minY - padding,
    width,
    height
  }
}

export function createGroupFromSelection(
  selectedNodes: Node[],
  allNodes: Node[],
  allEdges: Edge[],
  groupName: string = 'New Group'
): GroupCreationResult {
  const bounds = calculateGroupBounds(selectedNodes)
  const groupId = uuidv4()
  const subCanvasId = uuidv4()

  // Create the group node
  const groupNode: Node = {
    id: groupId,
    type: 'nestedGroup',
    position: { x: bounds.x, y: bounds.y },
    data: {
      label: groupName,
      color: 'bg-blue-100 border-blue-400',
      subCanvasId: subCanvasId,
      nodeCount: selectedNodes.length,
      lastModified: new Date().toISOString()
    },
    width: bounds.width,
    height: bounds.height,
    style: {
      width: bounds.width,
      height: bounds.height
    }
  }

  // Calculate relative positions for nodes that will move to sub-canvas
  const nodesToMove = selectedNodes.map(node => ({
    ...node,
    position: {
      x: node.position.x - bounds.x,
      y: node.position.y - bounds.y
    }
  }))

  // Find edges that connect selected nodes (will move to sub-canvas)
  const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
  const edgesToMove = allEdges.filter(edge => 
    selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
  )

  // Find edges that connect to selected nodes from outside (will connect to group)
  const edgesToUpdate = allEdges.filter(edge => {
    const sourceInGroup = selectedNodeIds.has(edge.source)
    const targetInGroup = selectedNodeIds.has(edge.target)
    return sourceInGroup !== targetInGroup // XOR - one in, one out
  }).map(edge => {
    if (selectedNodeIds.has(edge.source)) {
      // Edge goes from inside to outside - update source
      return {
        ...edge,
        source: groupId,
        sourceHandle: edge.sourceHandle || undefined
      }
    } else {
      // Edge goes from outside to inside - update target
      return {
        ...edge,
        target: groupId,
        targetHandle: edge.targetHandle || undefined
      }
    }
  })

  return {
    groupNode,
    subCanvasId,
    nodesToMove,
    edgesToMove,
    edgesToUpdate
  }
}

export function ungroupNodes(
  groupNode: Node,
  subCanvasNodes: Node[],
  subCanvasEdges: Edge[],
  parentCanvasPosition: { x: number, y: number }
): { nodes: Node[], edges: Edge[] } {
  // Convert nodes back to parent canvas coordinates
  const nodes = subCanvasNodes.map(node => ({
    ...node,
    position: {
      x: node.position.x + parentCanvasPosition.x,
      y: node.position.y + parentCanvasPosition.y
    },
    parentNode: undefined,
    extent: undefined
  }))

  // Edges stay the same as they reference node IDs
  return { nodes, edges: subCanvasEdges }
}