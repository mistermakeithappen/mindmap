import { create } from 'zustand'

interface NodeGroup {
  id: string
  nodeIds: Set<string>
  color?: string // Optional color for visual distinction
}

interface NodeGroupsStore {
  groups: Map<string, NodeGroup>
  nodeToGroup: Map<string, string> // Maps node ID to group ID for quick lookup
  
  // Create a new group from selected nodes
  createGroup: (nodeIds: string[]) => string
  
  // Add nodes to existing group
  addNodesToGroup: (groupId: string, nodeIds: string[]) => void
  
  // Remove nodes from their group
  removeNodesFromGroup: (nodeIds: string[]) => void
  
  // Delete an entire group
  deleteGroup: (groupId: string) => void
  
  // Get all nodes in the same group as the given node
  getGroupedNodes: (nodeId: string) => string[]
  
  // Check if nodes are in the same group
  areNodesGrouped: (nodeIds: string[]) => boolean
  
  // Get group for a node
  getNodeGroup: (nodeId: string) => NodeGroup | undefined
}

export const useNodeGroupsStore = create<NodeGroupsStore>((set, get) => ({
  groups: new Map(),
  nodeToGroup: new Map(),
  
  createGroup: (nodeIds: string[]) => {
    const groupId = `group-${Date.now()}`
    const newGroup: NodeGroup = {
      id: groupId,
      nodeIds: new Set(nodeIds),
      color: `hsl(${Math.random() * 360}, 70%, 50%)` // Random color for visual distinction
    }
    
    set((state) => {
      const newGroups = new Map(state.groups)
      const newNodeToGroup = new Map(state.nodeToGroup)
      
      // Remove nodes from any existing groups
      nodeIds.forEach(nodeId => {
        const existingGroupId = state.nodeToGroup.get(nodeId)
        if (existingGroupId) {
          const existingGroup = state.groups.get(existingGroupId)
          if (existingGroup) {
            existingGroup.nodeIds.delete(nodeId)
            if (existingGroup.nodeIds.size === 0) {
              newGroups.delete(existingGroupId)
            }
          }
        }
        newNodeToGroup.set(nodeId, groupId)
      })
      
      newGroups.set(groupId, newGroup)
      
      return {
        groups: newGroups,
        nodeToGroup: newNodeToGroup
      }
    })
    
    return groupId
  },
  
  addNodesToGroup: (groupId: string, nodeIds: string[]) => {
    set((state) => {
      const group = state.groups.get(groupId)
      if (!group) return state
      
      const newGroups = new Map(state.groups)
      const newNodeToGroup = new Map(state.nodeToGroup)
      const updatedGroup = { ...group, nodeIds: new Set(group.nodeIds) }
      
      nodeIds.forEach(nodeId => {
        // Remove from existing group if any
        const existingGroupId = state.nodeToGroup.get(nodeId)
        if (existingGroupId && existingGroupId !== groupId) {
          const existingGroup = newGroups.get(existingGroupId)
          if (existingGroup) {
            const updatedExisting = { ...existingGroup, nodeIds: new Set(existingGroup.nodeIds) }
            updatedExisting.nodeIds.delete(nodeId)
            if (updatedExisting.nodeIds.size === 0) {
              newGroups.delete(existingGroupId)
            } else {
              newGroups.set(existingGroupId, updatedExisting)
            }
          }
        }
        
        updatedGroup.nodeIds.add(nodeId)
        newNodeToGroup.set(nodeId, groupId)
      })
      
      newGroups.set(groupId, updatedGroup)
      
      return {
        groups: newGroups,
        nodeToGroup: newNodeToGroup
      }
    })
  },
  
  removeNodesFromGroup: (nodeIds: string[]) => {
    set((state) => {
      const newGroups = new Map(state.groups)
      const newNodeToGroup = new Map(state.nodeToGroup)
      
      nodeIds.forEach(nodeId => {
        const groupId = state.nodeToGroup.get(nodeId)
        if (groupId) {
          const group = newGroups.get(groupId)
          if (group) {
            const updatedGroup = { ...group, nodeIds: new Set(group.nodeIds) }
            updatedGroup.nodeIds.delete(nodeId)
            
            if (updatedGroup.nodeIds.size === 0) {
              newGroups.delete(groupId)
            } else {
              newGroups.set(groupId, updatedGroup)
            }
          }
          newNodeToGroup.delete(nodeId)
        }
      })
      
      return {
        groups: newGroups,
        nodeToGroup: newNodeToGroup
      }
    })
  },
  
  deleteGroup: (groupId: string) => {
    set((state) => {
      const group = state.groups.get(groupId)
      if (!group) return state
      
      const newGroups = new Map(state.groups)
      const newNodeToGroup = new Map(state.nodeToGroup)
      
      group.nodeIds.forEach(nodeId => {
        newNodeToGroup.delete(nodeId)
      })
      
      newGroups.delete(groupId)
      
      return {
        groups: newGroups,
        nodeToGroup: newNodeToGroup
      }
    })
  },
  
  getGroupedNodes: (nodeId: string) => {
    const state = get()
    const groupId = state.nodeToGroup.get(nodeId)
    if (!groupId) return []
    
    const group = state.groups.get(groupId)
    if (!group) return []
    
    return Array.from(group.nodeIds)
  },
  
  areNodesGrouped: (nodeIds: string[]) => {
    if (nodeIds.length < 2) return false
    
    const state = get()
    const firstNodeGroup = state.nodeToGroup.get(nodeIds[0])
    if (!firstNodeGroup) return false
    
    return nodeIds.every(nodeId => state.nodeToGroup.get(nodeId) === firstNodeGroup)
  },
  
  getNodeGroup: (nodeId: string) => {
    const state = get()
    const groupId = state.nodeToGroup.get(nodeId)
    if (!groupId) return undefined
    
    return state.groups.get(groupId)
  }
}))