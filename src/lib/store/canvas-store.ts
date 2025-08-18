import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, OnNodesChange, OnEdgesChange, Connection, addEdge } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: (connection: Connection) => void
  addNode: (node: Node) => void
  updateNode: (id: string, data: Partial<Node>) => void
  deleteNode: (id: string) => void
  updateEdge: (id: string, data: Partial<Edge>) => void
  removeEdge: (id: string) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  selectedEdgeId: string | null
  setSelectedEdgeId: (id: string | null) => void
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes)
    })
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    })
  },
  
  onConnect: (connection) => {
    // Check if this is an automation connection
    const nodes = get().nodes
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    const automationNodeTypes = ['trigger', 'action', 'ifElse', 'wait']
    const isAutomationConnection = 
      sourceNode && targetNode &&
      automationNodeTypes.includes(sourceNode.type || '') &&
      automationNodeTypes.includes(targetNode.type || '')
    
    const edgeWithId = {
      ...connection,
      id: uuidv4(),
      type: isAutomationConnection ? 'automation' : 'default',
      data: {
        isAutomationType: isAutomationConnection,
      },
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
      },
      style: {
        stroke: isAutomationConnection ? '#8b5cf6' : '#6b7280',
        strokeWidth: 2,
      },
    }
    set({
      edges: addEdge(edgeWithId, get().edges)
    })
  },
  
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node]
    })
  },
  
  updateNode: (id, data) => {
    set({
      nodes: get().nodes.map((node) => 
        node.id === id ? { ...node, ...data } : node
      )
    })
  },
  
  deleteNode: (id) => {
    const nodes = get().nodes
    const nodeToDelete = nodes.find(n => n.id === id)
    
    // Log synapse deletion for debugging
    if (nodeToDelete?.type === 'synapse') {
      console.log('Deleting synapse node:', {
        id: nodeToDelete.id,
        subCanvasId: nodeToDelete.data?.subCanvasId,
        label: nodeToDelete.data?.label
      })
    }
    
    // Find all child nodes (nodes that have this node as parent)
    const getDescendants = (parentId: string): string[] => {
      const children = nodes.filter(n => n.parentId === parentId)
      const descendantIds = children.map(c => c.id)
      
      // Recursively find descendants of children
      children.forEach(child => {
        descendantIds.push(...getDescendants(child.id))
      })
      
      return descendantIds
    }
    
    // Get all nodes to delete (the node itself and all its descendants)
    const nodesToDelete = [id, ...getDescendants(id)]
    console.log(`Deleting node ${id} and its ${nodesToDelete.length - 1} descendants`)
    
    // Filter out deleted nodes and their associated edges
    set({
      nodes: nodes.filter((node) => !nodesToDelete.includes(node.id)),
      edges: get().edges.filter((edge) => 
        !nodesToDelete.includes(edge.source) && !nodesToDelete.includes(edge.target)
      )
    })
  },
  
  updateEdge: (id, data) => {
    set({
      edges: get().edges.map((edge) => 
        edge.id === id ? { ...edge, ...data } : edge
      )
    })
  },
  
  removeEdge: (id) => {
    const currentEdges = get().edges
    const newEdges = currentEdges.filter((edge) => edge.id !== id)
    console.log(`Removing edge ${id}. Before: ${currentEdges.length} edges, After: ${newEdges.length} edges`)
    set({
      edges: newEdges
    })
  },
  
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id })
}))