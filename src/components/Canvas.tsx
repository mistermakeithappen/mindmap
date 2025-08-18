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
  const { screenToFlowPosition, getNodes, getNode } = useReactFlow()
  const [hoveredSynapseId, setHoveredSynapseId] = useState<string | null>(null)
  const [toolsPanelPosition, setToolsPanelPosition] = useState({ x: 20, y: 80 })
  const [isDraggingTools, setIsDraggingTools] = useState(false)
  const [toolsDragOffset, setToolsDragOffset] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ node: Node | null; position: { x: number; y: number } }>({
    node: null,
    position: { x: 0, y: 0 }
  })
  const [synapseContextMenu, setSynapseContextMenu] = useState<{ node: Node | null; position: { x: number; y: number } }>({
    node: null,
    position: { x: 0, y: 0 }
  })
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

  // Handle node drag to detect when dragging over synapse
  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
    const allNodes = getNodes()
    const synapseNodes = allNodes.filter(n => n.type === 'synapse')
    
    // Check if dragging over any synapse node
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
  }, [getNodes])

  // Handle node drag stop to nest nodes into synapse
  const onNodeDragStop: NodeDragHandler = useCallback(async (event, node, nodes) => {
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
    
    if (readOnly) return
    
    // Check if it's a synapse node
    if (node.type === 'synapse') {
      setSynapseContextMenu({
        node,
        position: { x: event.clientX, y: event.clientY }
      })
    } else {
      setContextMenu({
        node,
        position: { x: event.clientX, y: event.clientY }
      })
    }
  }, [readOnly])

  // Duplicate node function
  const duplicateNode = useCallback((node: Node) => {
    const newNode: Node = {
      id: uuidv4(),
      type: node.type,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: { ...node.data },
      style: { ...node.style },
      width: node.width,
      height: node.height,
    }
    
    addNode(newNode)
    console.log('Duplicated node:', node.id, 'as', newNode.id)
  }, [addNode])

  // Delete node function (wrapper for existing deleteNode)
  const handleDeleteNode = useCallback((nodeId: string) => {
    deleteNode(nodeId)
    console.log('Deleted node:', nodeId)
  }, [deleteNode])

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
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodesWithDragTarget}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        isValidConnection={isValidConnection}
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={readOnly ? undefined : onDragOver}
        onNodeDrag={readOnly ? undefined : onNodeDrag}
        onNodeDragStop={readOnly ? undefined : onNodeDragStop}
        onNodeContextMenu={readOnly ? undefined : onNodeContextMenu}
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
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        zoomActivationKeyCode={null}
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
      {contextMenu.node && (
        <NodeContextMenu
          node={contextMenu.node}
          position={contextMenu.position}
          onClose={() => setContextMenu({ node: null, position: { x: 0, y: 0 } })}
          onDuplicate={duplicateNode}
          onDelete={handleDeleteNode}
        />
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