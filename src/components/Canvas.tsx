'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  Panel,
  useReactFlow,
  Node,
  Edge,
  NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { v4 as uuidv4 } from 'uuid'
import { useCanvasStore } from '@/lib/store/canvas-store'
import { useClipboardStore } from '@/lib/store/clipboard-store'
import { useNodeGroupsStore } from '@/lib/store/node-groups-store'
import { TextNode } from './nodes/TextNode'
import { ImageNode } from './nodes/ImageNode'
import { LinkNode } from './nodes/LinkNode'
import { HeadlineNode } from './nodes/HeadlineNode'
import { StickyNode } from './nodes/StickyNode'
import { SynapseNode } from './nodes/SynapseNode'
import { EmojiNode } from './nodes/EmojiNode'
import { VideoNode } from './nodes/VideoNode'
import { FileNode } from './nodes/FileNode'
import { GroupNode } from './nodes/GroupNode'
import { AutomationContainerNode } from './nodes/AutomationContainerNode'
import { TriggerNode } from './nodes/TriggerNode'
import { ActionNode } from './nodes/ActionNode'
import { WaitNode } from './nodes/WaitNode'
import { IfElseNode } from './nodes/IfElseNode'
import { CanvasHeadlineNode } from './nodes/CanvasHeadlineNode'
import { CanvasParagraphNode } from './nodes/CanvasParagraphNode'
import { CustomEdge } from './edges/CustomEdge'
import { AutomationEdge } from './edges/AutomationEdge'
import { NodeContextMenu } from './NodeContextMenu'
import { SynapseNodeContextMenu } from './SynapseNodeContextMenu'
import { CanvasContextMenu } from './CanvasContextMenu'

// Define nodeTypes outside component to prevent React Flow warnings
const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  link: LinkNode,
  headline: HeadlineNode,
  sticky: StickyNode,
  emoji: EmojiNode, // Keep for backward compatibility
  synapse: SynapseNode,
  video: VideoNode,
  file: FileNode,
  group: GroupNode,
  automationContainer: AutomationContainerNode,
  trigger: TriggerNode,
  action: ActionNode,
  wait: WaitNode,
  ifElse: IfElseNode,
  canvasHeadline: CanvasHeadlineNode,
  canvasParagraph: CanvasParagraphNode,
}

const edgeTypes = {
  default: CustomEdge,
  automation: AutomationEdge,
}

interface CanvasProps {
  canvasId: string
  readOnly?: boolean
}

function CanvasInner({ canvasId, readOnly = false }: CanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, getNodes, getNode, getEdges, setNodes } = useReactFlow()
  const [hoveredSynapseId, setHoveredSynapseId] = useState<string | null>(null)
  const [toolsPanelPosition, setToolsPanelPosition] = useState({ x: 20, y: 80 })
  const [isDraggingTools, setIsDraggingTools] = useState(false)
  const [toolsDragOffset, setToolsDragOffset] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ nodes: Node[]; position: { x: number; y: number } }>({
    nodes: [],
    position: { x: 0, y: 0 }
  })
  const [synapseContextMenu, setSynapseContextMenu] = useState<{ node: Node | null; position: { x: number; y: number } }>({
    node: null,
    position: { x: 0, y: 0 }
  })
  const [canvasContextMenu, setCanvasContextMenu] = useState<{ show: boolean; position: { x: number; y: number } }>({
    show: false,
    position: { x: 0, y: 0 }
  })
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map())
  
  // Use global clipboard store
  const { copiedNodes, copiedEdges, setCopiedNodes, setCopiedEdges } = useClipboardStore()
  // Use node groups store
  const { getGroupedNodes, getNodeGroup } = useNodeGroupsStore()
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    updateNode,
    removeEdge,
  } = useCanvasStore()

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const dataStr = event.dataTransfer.getData('application/reactflow')
      if (!dataStr) return

      let nodeData: any
      let type: string
      
      try {
        // Try to parse as JSON (new format for automation nodes)
        nodeData = JSON.parse(dataStr)
        type = nodeData.type
      } catch {
        // Fall back to simple string (old format for regular nodes)
        type = dataStr
        nodeData = { type, isAutomation: false, requiresContainer: false }
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Check if this is an automation node that requires a container
      let parentId: string | undefined = undefined
      let extent: 'parent' | undefined = undefined
      let expandParent = false
      
      if (nodeData.requiresContainer) {
        // Find which container (if any) the node is being dropped into
        const containerNodes = nodes.filter(n => n.type === 'automationContainer')
        let insideContainer = false
        let targetContainer = null

        for (const container of containerNodes) {
          const containerLeft = container.position.x
          const containerRight = container.position.x + (container.width || 400)
          const containerTop = container.position.y
          const containerBottom = container.position.y + (container.height || 400)

          if (
            position.x >= containerLeft &&
            position.x <= containerRight &&
            position.y >= containerTop &&
            position.y <= containerBottom
          ) {
            insideContainer = true
            targetContainer = container
            break
          }
        }

        if (!insideContainer) {
          // Show error message or notification
          alert('Automation nodes must be placed inside a container!')
          return
        }

        // Set parent-child relationship
        if (targetContainer) {
          parentId = targetContainer.id
          extent = 'parent'
          expandParent = true
          
          // Adjust position to be relative to the container
          position.x = position.x - targetContainer.position.x
          position.y = position.y - targetContainer.position.y - 50 // Account for header height
        }
      }

      const newNode: Node = {
        id: uuidv4(),
        type,
        position,
        data: {},
        ...(parentId && { parentId }),
        ...(extent && { extent }),
        ...(expandParent && { expandParent }),
      }

      // Set default dimensions based on node type
      switch (type) {
        case 'text':
          newNode.width = 300
          newNode.height = 200
          newNode.style = { width: 300, height: 200 }
          break
        case 'image':
          newNode.style = { width: 300, height: 250 }
          break
        case 'group':
          newNode.style = { width: 400, height: 300 }
          newNode.data = { label: 'New Group', color: 'bg-blue-100 border-blue-400' }
          break
        case 'sticky':
          newNode.style = { width: 200, height: 200 }
          break
        case 'headline':
          newNode.style = { width: 300, height: 80 }
          break
        case 'emoji':
          newNode.style = { width: 100, height: 100 }
          break
        case 'synapse':
          newNode.style = { width: 200, height: 200 }
          newNode.data = { canvasId }
          break
        case 'link':
          newNode.style = { width: 250, height: 120 }
          break
        case 'video':
          newNode.style = { width: 400, height: 300 }
          break
        case 'file':
          newNode.style = { width: 250, height: 150 }
          break
        case 'automationContainer':
          newNode.style = { width: 400, height: 400 }
          newNode.data = { label: 'New Automation', expanded: true }
          break
        case 'trigger':
          newNode.style = { width: 200, height: 180 }
          break
        case 'action':
          newNode.style = { width: 200, height: 180 }
          break
        case 'wait':
          newNode.style = { width: 200, height: 160 }
          break
        case 'ifElse':
          newNode.style = { width: 250, height: 200 }
          newNode.data = { branches: ['True', 'False'] }
          break
        case 'canvasHeadline':
          newNode.style = { width: 400, height: 60 }
          newNode.data = { text: 'Heading', fontSize: 32, fontWeight: '700' }
          break
        case 'canvasParagraph':
          newNode.style = { width: 500, height: 120 }
          newNode.data = { text: 'Start typing your paragraph here...', fontSize: 16, lineHeight: 1.6 }
          break
      }

      addNode(newNode)
    },
    [addNode, canvasId, nodes, screenToFlowPosition]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle node drag start to store initial positions
  const onNodeDragStart: NodeDragHandler = useCallback((event, node) => {
    // Get all grouped nodes
    const groupedNodeIds = getGroupedNodes(node.id)
    console.log('onNodeDragStart - node:', node.id, 'grouped with:', groupedNodeIds)
    
    if (groupedNodeIds.length > 0) {
      const allNodes = getNodes()
      const positions = new Map<string, { x: number; y: number }>()
      
      // Store initial positions of all grouped nodes INCLUDING the dragged node
      groupedNodeIds.forEach(nodeId => {
        const groupedNode = allNodes.find(n => n.id === nodeId)
        if (groupedNode) {
          positions.set(nodeId, { x: groupedNode.position.x, y: groupedNode.position.y })
          console.log('Storing initial position for', nodeId, ':', groupedNode.position)
        }
      })
      
      setDragStartPositions(positions)
    } else {
      // Clear positions if not grouped
      setDragStartPositions(new Map())
    }
  }, [getNodes, getGroupedNodes])

  // Handle node drag to detect when dragging over synapse and move grouped nodes
  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
    const allNodes = getNodes()
    
    // Handle grouped node movement
    const groupedNodeIds = getGroupedNodes(node.id)
    if (groupedNodeIds.length > 0 && dragStartPositions.size > 0) {
      // Calculate the delta from the dragged node's start position
      const startPos = dragStartPositions.get(node.id)
      if (startPos) {
        const deltaX = node.position.x - startPos.x
        const deltaY = node.position.y - startPos.y
        
        // Update all grouped nodes positions including the one being dragged
        setNodes((nodes) => 
          nodes.map((n) => {
            // Update all grouped nodes
            if (groupedNodeIds.includes(n.id)) {
              const originalPos = dragStartPositions.get(n.id)
              if (originalPos) {
                return {
                  ...n,
                  position: {
                    x: originalPos.x + deltaX,
                    y: originalPos.y + deltaY
                  }
                }
              }
            }
            return n
          })
        )
      }
    }
    
    // Check if dragging over synapse
    const synapseNodes = allNodes.filter(n => n.type === 'synapse')
    let foundSynapse = false
    for (const synapse of synapseNodes) {
      if (synapse.id === node.id) continue // Skip if dragging the synapse itself
      
      const synapseLeft = synapse.position.x
      const synapseRight = synapse.position.x + (synapse.width || 200)
      const synapseTop = synapse.position.y
      const synapseBottom = synapse.position.y + (synapse.height || 200)
      
      const nodeLeft = node.position.x
      const nodeRight = node.position.x + (node.width || 100)
      const nodeTop = node.position.y
      const nodeBottom = node.position.y + (node.height || 100)
      
      // Check if node overlaps with synapse
      if (
        nodeLeft < synapseRight &&
        nodeRight > synapseLeft &&
        nodeTop < synapseBottom &&
        nodeBottom > synapseTop
      ) {
        setHoveredSynapseId(synapse.id)
        foundSynapse = true
        break
      }
    }
    
    if (!foundSynapse) {
      setHoveredSynapseId(null)
    }
  }, [getNodes, getGroupedNodes, dragStartPositions, setNodes])

  // Handle node drag stop to nest nodes into synapse
  const onNodeDragStop: NodeDragHandler = useCallback(async (event, node, nodes) => {
    // Clear drag start positions
    setDragStartPositions(new Map())
    
    if (hoveredSynapseId) {
      const synapseNode = getNode(hoveredSynapseId)
      if (synapseNode) {
        try {
          // First, ensure the synapse has a sub-canvas
          let subCanvasId = synapseNode.data.subCanvasId
          
          if (!subCanvasId) {
            // Create sub-canvas if it doesn't exist
            const { createClient } = await import('@/utils/supabase/client')
            const supabase = createClient()
            const { data: userData } = await supabase.auth.getUser()
            
            if (!userData.user) {
              console.error('User not authenticated')
              return
            }
            
            subCanvasId = uuidv4()
            const { error: canvasError } = await supabase.from('canvases').insert({
              id: subCanvasId,
              name: `${synapseNode.data.label || 'Synapse'} - Sub Canvas`,
              description: `Nested canvas from ${synapseNode.data.label || 'Synapse'}`,
              user_id: userData.user.id,
              parent_canvas_id: canvasId,
            })
            
            if (canvasError) {
              console.error('Error creating sub-canvas:', canvasError)
              return
            }
            
            // Update synapse node with sub-canvas ID
            updateNode(hoveredSynapseId, {
              data: {
                ...synapseNode.data,
                subCanvasId: subCanvasId
              }
            })
          }
          
          // Get all selected nodes (for multi-select drag)
          const selectedNodes = nodes.filter(n => n.selected || n.id === node.id)
          const selectedNodeIds = selectedNodes.map(n => n.id)
          
          // Get edges between selected nodes
          const edgesToMove = edges.filter(
            edge => selectedNodeIds.includes(edge.source) && selectedNodeIds.includes(edge.target)
          )
          
          // Move nodes to sub-canvas by updating their canvas_id
          const { createClient } = await import('@/utils/supabase/client')
          const supabase = createClient()
          
          // Update nodes in database
          const { error: nodesError } = await supabase
            .from('nodes')
            .update({ canvas_id: subCanvasId })
            .in('id', selectedNodeIds)
          
          if (nodesError) {
            console.error('Error moving nodes:', nodesError)
            return
          }
          
          // Update edges in database
          if (edgesToMove.length > 0) {
            const { error: edgesError } = await supabase
              .from('edges')
              .update({ canvas_id: subCanvasId })
              .in('id', edgesToMove.map(e => e.id))
            
            if (edgesError) {
              console.error('Error moving edges:', edgesError)
            }
          }
          
          // Remove nodes and edges from current canvas
          selectedNodeIds.forEach(id => deleteNode(id))
          onEdgesChange(
            edgesToMove.map(edge => ({ type: 'remove', id: edge.id }))
          )
          
          // Update synapse node count
          updateNode(hoveredSynapseId, {
            data: {
              ...synapseNode.data,
              nodeCount: (synapseNode.data.nodeCount || 0) + selectedNodes.length
            }
          })
          
          console.log(`Moved ${selectedNodes.length} nodes to synapse ${hoveredSynapseId}`)
        } catch (error) {
          console.error('Error moving nodes to synapse:', error)
        }
      }
      setHoveredSynapseId(null)
    }
  }, [hoveredSynapseId, getNode, deleteNode, updateNode, edges, onEdgesChange, canvasId])

  // Handle right-click on nodes
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    event.stopPropagation()
    
    console.log('=== onNodeContextMenu triggered ===')
    
    if (readOnly) {
      console.log('Read only mode, returning')
      return
    }
    
    // Check if it's a synapse node first
    if (node.type === 'synapse') {
      console.log('Synapse node clicked')
      setContextMenu({ nodes: [], position: { x: 0, y: 0 } })
      setCanvasContextMenu({ show: false, position: { x: 0, y: 0 } })
      setSynapseContextMenu({
        node,
        position: { x: event.clientX, y: event.clientY }
      })
      return
    }
    
    // Use setTimeout to ensure ReactFlow has updated selection state
    setTimeout(() => {
      // Get fresh selection state
      const currentNodes = getNodes()
      const selectedNodes = currentNodes.filter(n => n.selected)
      
      console.log('After timeout - Selected nodes:', selectedNodes.length, selectedNodes.map(n => n.id))
      
      // Clear other menus
      setSynapseContextMenu({ node: null, position: { x: 0, y: 0 } })
      setCanvasContextMenu({ show: false, position: { x: 0, y: 0 } })
      
      // If multiple nodes are selected (including synapse nodes), show menu for all
      // Only filter out synapse nodes for individual selection
      if (selectedNodes.length > 1) {
        console.log(`Showing menu for ${selectedNodes.length} selected nodes (including synapses)`)
        setContextMenu({
          nodes: selectedNodes, // Include all selected nodes, even synapses
          position: { x: event.clientX, y: event.clientY }
        })
      } else if (selectedNodes.length === 1) {
        // If one node selected, use it (unless it's a synapse, which was handled above)
        console.log('Showing menu for single selected node')
        setContextMenu({
          nodes: selectedNodes,
          position: { x: event.clientX, y: event.clientY }
        })
      } else {
        // No nodes selected, show menu for clicked node
        console.log('No selection, showing menu for clicked node:', node.id)
        setContextMenu({
          nodes: [node],
          position: { x: event.clientX, y: event.clientY }
        })
      }
    }, 0) // Minimal delay to let ReactFlow update
  }, [readOnly, getNodes])

  // Handle right-click on canvas background
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    console.log('=== onPaneContextMenu triggered ===')
    
    if (readOnly) {
      console.log('Read only mode, returning')
      return
    }
    
    // Check if there are selected nodes first
    const allNodes = getNodes()
    const selectedNodes = allNodes.filter(n => n.selected) // Include all selected nodes, even synapses
    
    console.log('Total nodes:', allNodes.length)
    console.log('Selected nodes (including synapses):', selectedNodes.length)
    
    if (selectedNodes.length > 0) {
      console.log('Showing context menu for', selectedNodes.length, 'selected nodes')
      // Show context menu for selected nodes instead of canvas menu
      setContextMenu({
        nodes: selectedNodes,
        position: { x: event.clientX, y: event.clientY }
      })
      setSynapseContextMenu({ node: null, position: { x: 0, y: 0 } })
      setCanvasContextMenu({ show: false, position: { x: 0, y: 0 } })
      return
    }
    
    // Close other context menus
    setContextMenu({ nodes: [], position: { x: 0, y: 0 } })
    setSynapseContextMenu({ node: null, position: { x: 0, y: 0 } })
    
    // Show canvas context menu
    setCanvasContextMenu({
      show: true,
      position: { x: event.clientX, y: event.clientY }
    })
    
    // Update mouse position for paste
    setMousePosition({ x: event.clientX, y: event.clientY })
  }, [readOnly, getNodes])

  // Copy nodes function
  const handleCopyNodes = useCallback((nodesToCopy: Node[]) => {
    setCopiedNodes(nodesToCopy)
    // Store edges between copied nodes
    const nodeIds = new Set(nodesToCopy.map(n => n.id))
    const connectedEdges = edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )
    setCopiedEdges(connectedEdges)
    console.log('Copied', nodesToCopy.length, 'nodes to global clipboard')
  }, [edges, setCopiedNodes, setCopiedEdges])

  // Duplicate nodes function
  const duplicateNodes = useCallback((nodesToDuplicate: Node[]) => {
    // Calculate center and offset for duplicates
    const minX = Math.min(...nodesToDuplicate.map(n => n.position.x))
    const minY = Math.min(...nodesToDuplicate.map(n => n.position.y))
    
    // Create ID mapping for edges
    const idMap = new Map<string, string>()
    
    // Duplicate each node with offset
    const newNodes = nodesToDuplicate.map(node => {
      const newId = uuidv4()
      idMap.set(node.id, newId)
      
      const newNode: Node = {
        id: newId,
        type: node.type,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data },
        style: { ...node.style },
        width: node.width,
        height: node.height,
        selected: false,
      }
      
      return newNode
    })
    
    // Add all new nodes
    newNodes.forEach(node => addNode(node))
    
    // Duplicate edges between nodes
    const nodeIds = new Set(nodesToDuplicate.map(n => n.id))
    const edgesToDuplicate = edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    )
    
    edgesToDuplicate.forEach(edge => {
      onConnect({
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
      })
    })
    
    console.log('Duplicated', nodesToDuplicate.length, 'nodes')
  }, [addNode, edges, onConnect])

  // Delete nodes function
  const handleDeleteNodes = useCallback((nodeIds: string[]) => {
    nodeIds.forEach(id => deleteNode(id))
    console.log('Deleted', nodeIds.length, 'nodes')
  }, [deleteNode])

  // Paste nodes at specific position
  const handlePasteAtPosition = useCallback(() => {
    if (copiedNodes.length === 0) return
    
    // Calculate the center of copied nodes
    const minX = Math.min(...copiedNodes.map(n => n.position.x))
    const minY = Math.min(...copiedNodes.map(n => n.position.y))
    const maxX = Math.max(...copiedNodes.map(n => n.position.x + (n.width || 200)))
    const maxY = Math.max(...copiedNodes.map(n => n.position.y + (n.height || 100)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    // Get paste position (canvas context menu position in flow coordinates)
    const pastePosition = screenToFlowPosition({
      x: canvasContextMenu.position.x,
      y: canvasContextMenu.position.y,
    })
    
    // Calculate offset from center to paste position
    const offsetX = pastePosition.x - centerX
    const offsetY = pastePosition.y - centerY
    
    // Create new nodes with new IDs and adjusted positions
    const idMap = new Map<string, string>()
    const newNodes = copiedNodes.map(node => {
      const newId = uuidv4()
      idMap.set(node.id, newId)
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: false,
      }
    })
    
    // Create new edges with mapped IDs
    const newEdges = copiedEdges.map(edge => ({
      ...edge,
      id: uuidv4(),
      source: idMap.get(edge.source) || edge.source,
      target: idMap.get(edge.target) || edge.target,
    }))
    
    // Add nodes and edges
    newNodes.forEach(node => addNode(node))
    newEdges.forEach(edge => {
      onConnect({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || null,
        targetHandle: edge.targetHandle || null,
      })
    })
    
    console.log('Pasted', newNodes.length, 'nodes at context menu position')
  }, [copiedNodes, copiedEdges, canvasContextMenu.position, addNode, onConnect, screenToFlowPosition])

  // Handle synapse rename
  const handleSynapseRename = useCallback(() => {
    const synapseNode = synapseContextMenu.node
    if (synapseNode && synapseNode.data?.handleRename) {
      synapseNode.data.handleRename()
    }
  }, [synapseContextMenu.node])

  // Handle synapse delete with sub-canvas cleanup
  const handleSynapseDelete = useCallback(async (nodeId: string, subCanvasId?: string) => {
    console.log('Deleting synapse node:', nodeId, 'with sub-canvas:', subCanvasId)
    
    // If there's a sub-canvas, delete it from the database
    if (subCanvasId) {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        
        // Delete the sub-canvas (CASCADE will handle nested content)
        const { error } = await supabase
          .from('canvases')
          .delete()
          .eq('id', subCanvasId)
        
        if (error) {
          console.error('Error deleting sub-canvas:', error)
        } else {
          console.log('Successfully deleted sub-canvas:', subCanvasId)
        }
      } catch (error) {
        console.error('Error deleting sub-canvas:', error)
      }
    }
    
    // Delete the synapse node from the current canvas
    deleteNode(nodeId)
    console.log('Deleted synapse node:', nodeId)
  }, [deleteNode])

  // Tools panel drag handlers
  const handleToolsMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.tools-content')) return // Don't drag if clicking on tool buttons
    
    setIsDraggingTools(true)
    setToolsDragOffset({
      x: e.clientX - toolsPanelPosition.x,
      y: e.clientY - toolsPanelPosition.y
    })
    e.preventDefault()
  }

  const handleToolsMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingTools) return
    
    setToolsPanelPosition({
      x: Math.max(0, Math.min(window.innerWidth - 250, e.clientX - toolsDragOffset.x)),
      y: Math.max(0, Math.min(window.innerHeight - 400, e.clientY - toolsDragOffset.y))
    })
  }, [isDraggingTools, toolsDragOffset])

  const handleToolsMouseUp = useCallback(() => {
    setIsDraggingTools(false)
  }, [])

  // Add/remove global mouse event listeners for tools panel
  useEffect(() => {
    if (isDraggingTools) {
      document.addEventListener('mousemove', handleToolsMouseMove)
      document.addEventListener('mouseup', handleToolsMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleToolsMouseMove)
        document.removeEventListener('mouseup', handleToolsMouseUp)
      }
    }
  }, [isDraggingTools, handleToolsMouseMove, handleToolsMouseUp])

  // Track mouse position for paste location
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (reactFlowWrapper.current && reactFlowWrapper.current.contains(e.target as HTMLElement)) {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Handle copy and paste and context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in the canvas and not in an input field
      if (!reactFlowWrapper.current?.contains(document.activeElement)) return
      
      // Context menu for selected nodes (M key for menu, or Shift + Right Arrow)
      if (e.key === 'm' || e.key === 'M' || e.key === 'ContextMenu' || (e.shiftKey && e.key === 'ArrowRight')) {
        e.preventDefault()
        const selectedNodes = nodes.filter(node => node.selected) // Include all selected nodes, even synapses
        console.log('=== Keyboard shortcut for context menu ===')
        console.log('Selected nodes (including synapses):', selectedNodes.length)
        
        if (selectedNodes.length > 0) {
          // Open context menu at the center of the viewport
          const rect = reactFlowWrapper.current?.getBoundingClientRect()
          if (rect) {
            const position = { 
              x: rect.left + rect.width / 2, 
              y: rect.top + rect.height / 2 
            }
            console.log('Opening context menu at:', position)
            setContextMenu({
              nodes: selectedNodes,
              position
            })
            // Also close other menus
            setSynapseContextMenu({ node: null, position: { x: 0, y: 0 } })
            setCanvasContextMenu({ show: false, position: { x: 0, y: 0 } })
          }
        } else {
          console.log('No nodes selected for context menu')
        }
      }
      
      // Copy (Cmd/Ctrl + C)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && !readOnly) {
        e.preventDefault()
        const selectedNodes = nodes.filter(node => node.selected)
        if (selectedNodes.length > 0) {
          // Store selected nodes
          setCopiedNodes(selectedNodes)
          // Store edges between selected nodes
          const selectedNodeIds = new Set(selectedNodes.map(n => n.id))
          const connectedEdges = edges.filter(edge => 
            selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
          )
          setCopiedEdges(connectedEdges)
          console.log('Copied', selectedNodes.length, 'nodes and', connectedEdges.length, 'edges')
        }
      }
      
      // Paste (Cmd/Ctrl + V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && !readOnly) {
        e.preventDefault()
        if (copiedNodes.length > 0) {
          // Calculate the center of copied nodes
          const minX = Math.min(...copiedNodes.map(n => n.position.x))
          const minY = Math.min(...copiedNodes.map(n => n.position.y))
          const maxX = Math.max(...copiedNodes.map(n => n.position.x + (n.width || 200)))
          const maxY = Math.max(...copiedNodes.map(n => n.position.y + (n.height || 100)))
          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2
          
          // Get paste position (mouse position in flow coordinates)
          const pastePosition = screenToFlowPosition({
            x: mousePosition.x,
            y: mousePosition.y,
          })
          
          // Calculate offset from center to paste position
          const offsetX = pastePosition.x - centerX
          const offsetY = pastePosition.y - centerY
          
          // Create new nodes with new IDs and adjusted positions
          const idMap = new Map<string, string>()
          const newNodes = copiedNodes.map(node => {
            const newId = uuidv4()
            idMap.set(node.id, newId)
            return {
              ...node,
              id: newId,
              position: {
                x: node.position.x + offsetX,
                y: node.position.y + offsetY,
              },
              selected: false,
            }
          })
          
          // Create new edges with mapped IDs
          const newEdges = copiedEdges.map(edge => ({
            ...edge,
            id: uuidv4(),
            source: idMap.get(edge.source) || edge.source,
            target: idMap.get(edge.target) || edge.target,
          }))
          
          // Add nodes and edges
          newNodes.forEach(node => addNode(node))
          newEdges.forEach(edge => {
            onConnect({
              source: edge.source,
              target: edge.target,
              sourceHandle: edge.sourceHandle || null,
              targetHandle: edge.targetHandle || null,
            })
          })
          
          console.log('Pasted', newNodes.length, 'nodes and', newEdges.length, 'edges at', pastePosition)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nodes, edges, copiedNodes, copiedEdges, mousePosition, readOnly, addNode, onConnect, screenToFlowPosition, setCopiedNodes, setCopiedEdges])

  // Validation function for connections
  const isValidConnection = useCallback((connection: any) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    // Allow connections between nodes with the same parentId (inside same container)
    if (sourceNode?.parentId && targetNode?.parentId) {
      return sourceNode.parentId === targetNode.parentId
    }
    
    // Allow connections between nodes without parents (top-level nodes)
    if (!sourceNode?.parentId && !targetNode?.parentId) {
      return true
    }
    
    // Prevent connections between nodes inside and outside containers
    return false
  }, [nodes])

  // Update nodes to add drag-target class to hovered synapse
  const nodesWithDragTarget = nodes.map(node => ({
    ...node,
    className: node.id === hoveredSynapseId ? 'drag-target' : ''
  }))

  return (
    <div 
      className="w-full h-full" 
      ref={reactFlowWrapper}
      style={{ userSelect: 'none' }}
    >
      <ReactFlow
        nodes={nodesWithDragTarget}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        isValidConnection={isValidConnection}
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={readOnly ? undefined : onDragOver}
        onNodeDragStart={readOnly ? undefined : onNodeDragStart}
        onNodeDrag={readOnly ? undefined : onNodeDrag}
        onNodeDragStop={readOnly ? undefined : onNodeDragStop}
        onNodeContextMenu={readOnly ? undefined : onNodeContextMenu}
        onPaneContextMenu={readOnly ? undefined : onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        nodeOrigin={[0, 0]}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        deleteKeyCode={null}
        selectNodesOnDrag={false}
        nodeDragThreshold={1}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        zoomActivationKeyCode={null}
        selectionOnDrag={true}
        panOnScroll={false}
        panOnDrag={true}
        minZoom={0.1}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap />
        
        {/* Define arrow marker for edges */}
        <svg width="0" height="0">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>
        </svg>
        
        
        {/* Draggable Tools Panel - Only show if not read-only */}
        {!readOnly && (
          <div 
            className={`fixed bg-white rounded-lg shadow-lg border border-gray-200 max-w-xs ${isDraggingTools ? 'cursor-grabbing shadow-2xl' : 'cursor-grab'}`}
            style={{
              left: toolsPanelPosition.x,
              top: toolsPanelPosition.y,
              zIndex: 1000,
            }}
            onMouseDown={handleToolsMouseDown}
          >
            {/* Drag handle header */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-t-lg border-b border-gray-200">
              <span className="text-gray-400">⋮⋮</span>
              <h3 className="font-semibold text-gray-800 text-sm flex-1">Tools</h3>
            </div>
            
            <div className="tools-content p-3 space-y-3">
              {/* Regular Nodes */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Mind Map Nodes</h4>
                <div className="grid grid-cols-3 gap-2">
                  <DraggableNode type="text" label="Text" icon="📝" />
                  <DraggableNode type="headline" label="Title" icon="📰" />
                  <DraggableNode type="sticky" label="Sticky" icon="🗒️" />
                  <DraggableNode type="image" label="Image" icon="🖼️" />
                  <DraggableNode type="link" label="Link" icon="🔗" />
                  <DraggableNode type="synapse" label="Synapse" icon="🌀" />
                  <DraggableNode type="video" label="Video" icon="🎬" />
                  <DraggableNode type="file" label="File" icon="📎" />
                  <DraggableNode type="group" label="Group" icon="📁" />
                </div>
              </div>
              
              {/* Type to Canvas */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Type to Canvas</h4>
                <div className="grid grid-cols-2 gap-2">
                  <DraggableNode type="canvasHeadline" label="Headline" icon="🔤" />
                  <DraggableNode type="canvasParagraph" label="Paragraph" icon="📄" />
                </div>
              </div>
              
              {/* Automation Nodes */}
              <div>
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Automation Nodes</h4>
                <div className="grid grid-cols-3 gap-2">
                  <DraggableNode type="automationContainer" label="Container" icon="📦" isAutomation={true} />
                  <DraggableNode type="trigger" label="Trigger" icon="▶️" isAutomation={true} requiresContainer={true} />
                  <DraggableNode type="action" label="Action" icon="⚙️" isAutomation={true} requiresContainer={true} />
                  <DraggableNode type="wait" label="Wait" icon="⏳" isAutomation={true} requiresContainer={true} />
                  <DraggableNode type="ifElse" label="If/Else" icon="🔀" isAutomation={true} requiresContainer={true} />
                </div>
              </div>
            </div>
          </div>
        )}
      </ReactFlow>
      
      {/* Context Menu */}
      {contextMenu.nodes.length > 0 && (
        <>
          {console.log('Rendering NodeContextMenu with', contextMenu.nodes.length, 'nodes at position', contextMenu.position)}
          <NodeContextMenu
            nodes={contextMenu.nodes}
            position={contextMenu.position}
            onClose={() => setContextMenu({ nodes: [], position: { x: 0, y: 0 } })}
            onCopy={handleCopyNodes}
            onDuplicate={duplicateNodes}
            onDelete={handleDeleteNodes}
          />
        </>
      )}
      
      {/* Synapse Context Menu */}
      {synapseContextMenu.node && (
        <SynapseNodeContextMenu
          node={synapseContextMenu.node}
          position={synapseContextMenu.position}
          onClose={() => setSynapseContextMenu({ node: null, position: { x: 0, y: 0 } })}
          onRename={handleSynapseRename}
          onDelete={handleSynapseDelete}
        />
      )}
      
      {/* Canvas Context Menu */}
      {canvasContextMenu.show && (
        <CanvasContextMenu
          position={canvasContextMenu.position}
          onClose={() => setCanvasContextMenu({ show: false, position: { x: 0, y: 0 } })}
          onPaste={handlePasteAtPosition}
          hasCopiedNodes={copiedNodes.length > 0}
          copiedNodesCount={copiedNodes.length}
        />
      )}
    </div>
  )
}

export function Canvas({ canvasId, readOnly = false }: CanvasProps) {
  return <CanvasInner canvasId={canvasId} readOnly={readOnly} />
}

interface DraggableNodeProps {
  type: string
  label: string
  icon: string
  isAutomation?: boolean
  requiresContainer?: boolean
}

function DraggableNode({ type, label, icon, isAutomation = false, requiresContainer = false }: DraggableNodeProps) {
  const { nodes } = useCanvasStore()
  
  // Check if there's at least one container on the canvas
  const hasContainer = nodes.some(node => node.type === 'automationContainer')
  
  // Disable dragging if it requires a container but none exists
  const isDisabled = requiresContainer && !hasContainer
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    if (isDisabled) {
      event.preventDefault()
      return
    }
    
    // Store both the type and metadata about the node
    const nodeData = JSON.stringify({
      type: nodeType,
      isAutomation,
      requiresContainer
    })
    event.dataTransfer.setData('application/reactflow', nodeData)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all border ${
        isDisabled 
          ? 'bg-gray-100 opacity-50 cursor-not-allowed border-gray-200' 
          : 'bg-gray-50 hover:bg-gray-100 cursor-move hover:shadow-md border-gray-200 hover:border-gray-300'
      }`}
      onDragStart={(event) => onDragStart(event, type)}
      draggable={!isDisabled}
      title={isDisabled ? 'Add a container first' : ''}
    >
      <span className="text-2xl mb-1">{icon}</span>
      <span className="text-xs text-gray-600">{label}</span>
    </div>
  )
}