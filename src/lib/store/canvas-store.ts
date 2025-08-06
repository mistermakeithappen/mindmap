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
    const edgeWithId = {
      ...connection,
      id: uuidv4(),
      type: 'default',
      data: {},
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
      },
      style: {
        stroke: '#6b7280',
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
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id)
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
    set({
      edges: get().edges.filter((edge) => edge.id !== id)
    })
  },
  
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  
  setSelectedEdgeId: (id) => set({ selectedEdgeId: id })
}))