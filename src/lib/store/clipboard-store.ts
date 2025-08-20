import { create } from 'zustand'
import { Node, Edge } from 'reactflow'

interface ClipboardStore {
  copiedNodes: Node[]
  copiedEdges: Edge[]
  setCopiedNodes: (nodes: Node[]) => void
  setCopiedEdges: (edges: Edge[]) => void
  clearClipboard: () => void
}

export const useClipboardStore = create<ClipboardStore>((set) => ({
  copiedNodes: [],
  copiedEdges: [],
  
  setCopiedNodes: (nodes) => set({ copiedNodes: nodes }),
  
  setCopiedEdges: (edges) => set({ copiedEdges: edges }),
  
  clearClipboard: () => set({ copiedNodes: [], copiedEdges: [] }),
}))