import { create } from 'zustand'
import { Node, Edge } from 'reactflow'

interface CanvasData {
  id: string
  name: string
  nodes: Node[]
  edges: Edge[]
  parentCanvasId?: string
  parentNodeId?: string
  depth: number
}

interface BreadcrumbItem {
  canvasId: string
  canvasName: string
  parentNodeId?: string | null
  depth: number
}

interface NestedCanvasStore {
  // Current canvas state
  currentCanvasId: string | null
  currentCanvas: CanvasData | null
  
  // Navigation state
  navigationHistory: string[] // Stack of canvas IDs
  breadcrumbs: BreadcrumbItem[]
  
  // Canvas cache for quick switching
  canvasCache: Map<string, CanvasData>
  
  // Actions
  setCurrentCanvas: (canvasId: string | null) => void
  enterGroupNode: (nodeId: string, subCanvasId: string) => void
  exitToParentCanvas: () => void
  navigateToCanvas: (canvasId: string) => void
  updateCanvasInCache: (canvasId: string, updates: Partial<CanvasData>) => void
  clearCache: () => void
  
  // Breadcrumb management
  loadBreadcrumbs: (canvasId: string) => Promise<void>
}

export const useNestedCanvasStore = create<NestedCanvasStore>((set, get) => ({
  currentCanvasId: null,
  currentCanvas: null,
  navigationHistory: [],
  breadcrumbs: [],
  canvasCache: new Map(),
  
  setCurrentCanvas: (canvasId) => {
    set({ currentCanvasId: canvasId })
    if (canvasId) {
      // Load breadcrumbs for this canvas
      get().loadBreadcrumbs(canvasId)
    }
  },
  
  enterGroupNode: async (nodeId, subCanvasId) => {
    const { currentCanvasId, navigationHistory, canvasCache } = get()
    
    if (!currentCanvasId) return
    
    // Add current canvas to navigation history
    const newHistory = [...navigationHistory, currentCanvasId]
    
    // Load sub-canvas (this would be an API call in real implementation)
    // For now, we'll assume it's already in cache or will be loaded separately
    const subCanvas = canvasCache.get(subCanvasId)
    
    if (subCanvas) {
      set({
        currentCanvasId: subCanvasId,
        currentCanvas: subCanvas,
        navigationHistory: newHistory
      })
      
      // Update breadcrumbs
      await get().loadBreadcrumbs(subCanvasId)
    }
  },
  
  exitToParentCanvas: async () => {
    const { navigationHistory, canvasCache } = get()
    
    if (navigationHistory.length === 0) return
    
    // Pop the last canvas from history
    const newHistory = [...navigationHistory]
    const parentCanvasId = newHistory.pop()
    
    if (parentCanvasId) {
      const parentCanvas = canvasCache.get(parentCanvasId)
      
      if (parentCanvas) {
        set({
          currentCanvasId: parentCanvasId,
          currentCanvas: parentCanvas,
          navigationHistory: newHistory
        })
        
        // Breadcrumbs will update on next page load
      }
    }
  },
  
  navigateToCanvas: async (canvasId) => {
    const { canvasCache, currentCanvasId, navigationHistory } = get()
    
    // If navigating to a canvas in our history, pop back to it
    const historyIndex = navigationHistory.indexOf(canvasId)
    if (historyIndex !== -1) {
      const newHistory = navigationHistory.slice(0, historyIndex)
      const canvas = canvasCache.get(canvasId)
      
      if (canvas) {
        set({
          currentCanvasId: canvasId,
          currentCanvas: canvas,
          navigationHistory: newHistory
        })
      }
    } else {
      // Otherwise, treat it as entering a new canvas
      const canvas = canvasCache.get(canvasId)
      if (canvas && currentCanvasId) {
        set({
          currentCanvasId: canvasId,
          currentCanvas: canvas,
          navigationHistory: [...navigationHistory, currentCanvasId]
        })
      }
    }
    
    // Breadcrumbs will update on next page load
  },
  
  updateCanvasInCache: (canvasId, updates) => {
    const { canvasCache, currentCanvas, currentCanvasId } = get()
    
    const canvas = canvasCache.get(canvasId)
    if (canvas) {
      const updatedCanvas = { ...canvas, ...updates }
      canvasCache.set(canvasId, updatedCanvas)
      
      // If updating current canvas, update state
      if (canvasId === currentCanvasId) {
        set({
          currentCanvas: updatedCanvas,
          canvasCache
        })
      } else {
        set({ canvasCache })
      }
    }
  },
  
  clearCache: () => {
    set({
      canvasCache: new Map()
    })
  },
  
  loadBreadcrumbs: async (canvasId) => {
    try {
      const response = await fetch(`/api/canvas/${canvasId}/breadcrumbs`)
      if (response.ok) {
        const { breadcrumbs } = await response.json()
        set({ breadcrumbs })
      }
    } catch (error) {
      console.error('Failed to load breadcrumbs:', error)
      // Fallback to single breadcrumb
      const mockBreadcrumbs: BreadcrumbItem[] = [
        { canvasId, canvasName: 'Canvas', parentNodeId: null, depth: 0 }
      ]
      set({ breadcrumbs: mockBreadcrumbs })
    }
  }
}))

// Helper hooks for common operations
export const useCurrentCanvas = () => {
  const store = useNestedCanvasStore()
  return {
    canvas: store.currentCanvas,
    nodes: store.currentCanvas?.nodes || [],
    edges: store.currentCanvas?.edges || [],
    canvasId: store.currentCanvasId
  }
}

export const useCanvasNavigation = () => {
  const store = useNestedCanvasStore()
  return {
    enterGroup: store.enterGroupNode,
    exitToParent: store.exitToParentCanvas,
    navigateTo: store.navigateToCanvas,
    canGoBack: store.navigationHistory.length > 0,
    breadcrumbs: store.breadcrumbs
  }
}