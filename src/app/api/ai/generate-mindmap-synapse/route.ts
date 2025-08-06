import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface NodeData {
  id: string
  type: string
  position: { x: number; y: number }
  data: any
  style?: any
  width?: number
  height?: number
}

interface EdgeData {
  id: string
  source: string
  target: string
  type?: string
  style?: any
}

// Node type configurations
const NODE_CONFIGS = {
  central: {
    type: 'headline',
    width: 450,
    height: 120,
    fontSize: 40,
    color: '#4F46E5'
  },
  headline: {
    type: 'headline', 
    width: 350,
    height: 90,
    fontSize: 28,
    color: '#7C3AED'
  },
  synapse: {
    type: 'synapse',
    width: 200,
    height: 200
  },
  keyPoint: {
    type: 'sticky',
    width: 240,
    height: 90,
    color: '#FEF3C7'
  },
  text: {
    type: 'text',
    width: 300,
    height: 200
  }
}

class SynapseLayoutEngine {
  private nodes: NodeData[] = []
  private edges: EdgeData[] = []
  private subCanvases: Map<string, { nodes: NodeData[], edges: EdgeData[] }> = new Map()
  
  generateMindMap(analysis: any): { nodes: NodeData[], edges: EdgeData[], subCanvases: any[] } {
    const { metadata, structure } = analysis
    
    // 1. Create central theme node
    const centralId = this.createCentralNode(metadata)
    
    // 2. Create synapse nodes for main headlines
    this.createHeadlineSynapses(structure.headlines, centralId)
    
    // 3. Convert sub-canvases to the format needed for creation
    const subCanvasesArray = Array.from(this.subCanvases.entries()).map(([synapseId, content]) => ({
      synapseId,
      nodes: content.nodes,
      edges: content.edges
    }))
    
    return { 
      nodes: this.nodes, 
      edges: this.edges,
      subCanvases: subCanvasesArray
    }
  }
  
  private createCentralNode(metadata: any): string {
    const nodeId = uuidv4()
    const config = NODE_CONFIGS.central
    
    const node: NodeData = {
      id: nodeId,
      type: config.type,
      position: { x: 0, y: 0 },
      data: {
        text: metadata.centralTheme,
        fontSize: config.fontSize,
        color: config.color,
        align: 'text-center'
      },
      width: config.width,
      height: config.height
    }
    
    this.nodes.push(node)
    return nodeId
  }
  
  private createHeadlineSynapses(headlines: any[], centralId: string) {
    const positions = this.calculateCircularPositions(headlines.length, 500)
    
    headlines.forEach((headline, index) => {
      // Create a synapse node for each headline
      const synapseId = uuidv4()
      const position = positions[index]
      
      // Create synapse node
      const synapseNode: NodeData = {
        id: synapseId,
        type: 'synapse',
        position: position,
        data: {
          label: headline.title,
          canvasId: null, // Will be set when canvas is created
          nodeCount: 0
        },
        style: NODE_CONFIGS.synapse
      }
      
      this.nodes.push(synapseNode)
      
      // Connect central to synapse
      this.edges.push({
        id: uuidv4(),
        source: centralId,
        target: synapseId,
        style: {
          stroke: '#7C3AED',
          strokeWidth: 3
        }
      })
      
      // Create sub-canvas content for this synapse
      this.createSubCanvasContent(synapseId, headline)
    })
  }
  
  private createSubCanvasContent(synapseId: string, headline: any) {
    const subNodes: NodeData[] = []
    const subEdges: EdgeData[] = []
    
    // Create headline node in sub-canvas
    const headlineNodeId = uuidv4()
    const headlineNode: NodeData = {
      id: headlineNodeId,
      type: 'headline',
      position: { x: 0, y: 0 },
      data: {
        text: headline.title,
        fontSize: NODE_CONFIGS.headline.fontSize,
        color: NODE_CONFIGS.headline.color,
        align: 'text-center'
      },
      width: NODE_CONFIGS.headline.width,
      height: NODE_CONFIGS.headline.height
    }
    subNodes.push(headlineNode)
    
    // Create sections as text nodes or nested synapses
    if (headline.sections && headline.sections.length > 0) {
      const sectionPositions = this.calculateCircularPositions(headline.sections.length, 400)
      
      headline.sections.forEach((section: any, idx: number) => {
        if (section.details && Object.keys(section.details).length > 2) {
          // Complex section - create as synapse
          const sectionSynapseId = uuidv4()
          const sectionSynapse: NodeData = {
            id: sectionSynapseId,
            type: 'synapse',
            position: sectionPositions[idx],
            data: {
              label: section.title,
              canvasId: null,
              nodeCount: 0
            },
            style: NODE_CONFIGS.synapse
          }
          subNodes.push(sectionSynapse)
          
          // Connect headline to section synapse
          subEdges.push({
            id: uuidv4(),
            source: headlineNodeId,
            target: sectionSynapseId,
            style: {
              stroke: '#EC4899',
              strokeWidth: 2
            }
          })
          
          // Create nested content for this section
          this.createSectionSubCanvas(sectionSynapseId, section)
        } else {
          // Simple section - create as text node
          const sectionId = uuidv4()
          const sectionNode: NodeData = {
            id: sectionId,
            type: 'text',
            position: sectionPositions[idx],
            data: {
              text: this.formatSectionContent(section),
              format: 'bullet'
            },
            width: NODE_CONFIGS.text.width,
            height: NODE_CONFIGS.text.height
          }
          subNodes.push(sectionNode)
          
          // Connect headline to section
          subEdges.push({
            id: uuidv4(),
            source: headlineNodeId,
            target: sectionId,
            style: {
              stroke: '#3B82F6',
              strokeWidth: 2
            }
          })
        }
      })
    }
    
    // Add any key insights or quotes as sticky notes
    if (headline.insights || headline.quotes) {
      const extraItems = [...(headline.insights || []), ...(headline.quotes || [])]
      extraItems.forEach((item, idx) => {
        const stickyId = uuidv4()
        const stickyNode: NodeData = {
          id: stickyId,
          type: 'sticky',
          position: {
            x: -400 + (idx % 2) * 800,
            y: 300 + Math.floor(idx / 2) * 150
          },
          data: {
            text: typeof item === 'string' ? item : item.text,
            color: '#FEF3C7'
          },
          width: NODE_CONFIGS.keyPoint.width,
          height: NODE_CONFIGS.keyPoint.height
        }
        subNodes.push(stickyNode)
      })
    }
    
    // Store sub-canvas content
    this.subCanvases.set(synapseId, { nodes: subNodes, edges: subEdges })
  }
  
  private createSectionSubCanvas(sectionSynapseId: string, section: any) {
    const subNodes: NodeData[] = []
    const subEdges: EdgeData[] = []
    
    // Create section title node
    const titleId = uuidv4()
    const titleNode: NodeData = {
      id: titleId,
      type: 'headline',
      position: { x: 0, y: 0 },
      data: {
        text: section.title,
        fontSize: 24,
        color: '#EC4899',
        align: 'text-center'
      },
      width: 300,
      height: 70
    }
    subNodes.push(titleNode)
    
    // Add details as different node types
    const details = section.details || {}
    let nodeCount = 0
    
    // Key Points as text node
    if (details.keyPoints && details.keyPoints.length > 0) {
      const keyPointsId = uuidv4()
      const keyPointsNode: NodeData = {
        id: keyPointsId,
        type: 'text',
        position: { x: -300, y: 150 },
        data: {
          text: details.keyPoints.join('\n'),
          format: 'bullet'
        },
        width: 250,
        height: 150 + details.keyPoints.length * 20
      }
      subNodes.push(keyPointsNode)
      subEdges.push({
        id: uuidv4(),
        source: titleId,
        target: keyPointsId,
        style: { stroke: '#F59E0B', strokeWidth: 2 }
      })
      nodeCount++
    }
    
    // Examples as sticky notes
    if (details.examples && details.examples.length > 0) {
      details.examples.forEach((example: string, idx: number) => {
        const exampleId = uuidv4()
        const exampleNode: NodeData = {
          id: exampleId,
          type: 'sticky',
          position: { 
            x: 300, 
            y: 100 + idx * 120 
          },
          data: {
            text: example,
            color: '#D1FAE5'
          },
          width: 200,
          height: 100
        }
        subNodes.push(exampleNode)
        nodeCount++
      })
    }
    
    // Action items as sticky notes
    if (details.actionItems && details.actionItems.length > 0) {
      details.actionItems.forEach((action: string, idx: number) => {
        const actionId = uuidv4()
        const actionNode: NodeData = {
          id: actionId,
          type: 'sticky',
          position: { 
            x: 0, 
            y: 250 + idx * 100 
          },
          data: {
            text: `🎯 ${action}`,
            color: '#FEE2E2'
          },
          width: 250,
          height: 80
        }
        subNodes.push(actionNode)
        nodeCount++
      })
    }
    
    // Store nested sub-canvas
    this.subCanvases.set(sectionSynapseId, { nodes: subNodes, edges: subEdges })
  }
  
  private formatSectionContent(section: any): string {
    const parts = [section.title]
    const details = section.details || {}
    
    if (details.keyPoints && details.keyPoints.length > 0) {
      parts.push('\nKey Points:')
      details.keyPoints.forEach((point: string) => {
        parts.push(`• ${point}`)
      })
    }
    
    if (details.examples && details.examples.length > 0) {
      parts.push('\nExamples:')
      details.examples.forEach((example: string) => {
        parts.push(`• ${example}`)
      })
    }
    
    return parts.join('\n')
  }
  
  private calculateCircularPositions(count: number, radius: number): { x: number, y: number }[] {
    const positions: { x: number, y: number }[] = []
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      })
    }
    
    return positions
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const analysis = await request.json()

    if (!analysis.structure) {
      return NextResponse.json({ error: 'Analysis structure is required' }, { status: 400 })
    }

    // Use the new synapse-based layout engine
    const layoutEngine = new SynapseLayoutEngine()
    const { nodes, edges, subCanvases } = layoutEngine.generateMindMap(analysis)

    // The subCanvases will need to be handled by the client
    // It will create the actual sub-canvases after the main canvas is created
    return NextResponse.json({
      nodes,
      edges,
      subCanvases, // Array of { synapseId, nodes, edges }
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        totalSubCanvases: subCanvases.length,
        generatedAt: new Date().toISOString(),
        layoutStrategy: 'synapse-hierarchical',
        structure: {
          headlines: analysis.structure.headlines?.length || 0,
          totalSynapses: nodes.filter(n => n.type === 'synapse').length
        }
      }
    })
  } catch (error) {
    console.error('Mind map generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate mind map' },
      { status: 500 }
    )
  }
}