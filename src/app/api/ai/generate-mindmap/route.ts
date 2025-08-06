import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface NodeData {
  id: string
  type: string
  position: { x: number; y: number }
  data: any
  parentNode?: string
  extent?: string
  style?: any
  width?: number
  height?: number
  zIndex?: number
}

interface EdgeData {
  id: string
  source: string
  target: string
  type?: string
  data?: any
  style?: any
}

// Node type configurations with updated styling
const NODE_CONFIGS = {
  central: {
    type: 'headline',
    width: 450,
    height: 120,
    fontSize: 40,
    color: '#4F46E5',
    zIndex: 1000
  },
  headline: {
    type: 'headline', 
    width: 350,
    height: 90,
    fontSize: 28,
    color: '#7C3AED',
    zIndex: 900
  },
  section: {
    type: 'headline',
    width: 280,
    height: 70,
    fontSize: 20,
    color: '#EC4899',
    zIndex: 800
  },
  keyPoint: {
    type: 'sticky',
    width: 240,
    height: 90,
    color: '#FEF3C7',
    zIndex: 700
  },
  example: {
    type: 'text',
    width: 200,
    height: 70,
    fontSize: 14,
    color: '#10B981',
    style: { backgroundColor: '#F0FDF4', padding: '8px', borderRadius: '6px' },
    zIndex: 600
  },
  data: {
    type: 'text',
    width: 180,
    height: 60,
    fontSize: 14,
    color: '#3B82F6',
    style: { backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '6px' },
    zIndex: 600
  },
  quote: {
    type: 'sticky',
    width: 280,
    height: 100,
    color: '#E9D5FF',
    style: { fontStyle: 'italic' },
    zIndex: 600
  },
  actionItem: {
    type: 'sticky',
    width: 250,
    height: 80,
    color: '#FEE2E2',
    zIndex: 600
  },
  insight: {
    type: 'sticky',
    width: 300,
    height: 100,
    color: '#D1FAE5',
    zIndex: 850
  },
  theme: {
    type: 'group',
    width: 400,
    height: 200,
    zIndex: 50
  }
}

class HierarchicalLayoutEngine {
  private nodes: NodeData[] = []
  private edges: EdgeData[] = []
  private nodePositions: Map<string, { x: number, y: number }> = new Map()
  
  generateMindMap(analysis: any): { nodes: NodeData[], edges: EdgeData[] } {
    const { metadata, structure, layout } = analysis
    
    // 1. Create central theme node
    const centralId = this.createCentralNode(metadata)
    
    // 2. Layout headlines based on strategy
    this.layoutHeadlines(structure.headlines, centralId, layout.layoutRules)
    
    // 3. Add cross-cutting elements
    this.addCrossCuttingElements(structure.crossCutting, centralId, layout.layoutRules)
    
    // 4. Optimize and finalize
    this.optimizeLayout()
    this.centerAndScale()
    
    return { nodes: this.nodes, edges: this.edges }
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
        color: config.color
      },
      width: config.width,
      height: config.height,
      zIndex: config.zIndex
    }
    
    this.nodes.push(node)
    this.nodePositions.set(nodeId, { x: 0, y: 0 })
    return nodeId
  }
  
  private layoutHeadlines(headlines: any[], centralId: string, layoutRules: any) {
    const placement = layoutRules.headlinePlacement || 'circular'
    
    // Calculate positions for headlines
    const headlinePositions = this.calculateMainPositions(headlines.length, placement, 600)
    
    headlines.forEach((headline, index) => {
      const headlineId = uuidv4()
      const position = headlinePositions[index]
      
      // Create headline node
      this.createHeadlineNode(headline, headlineId, position)
      this.connectNodes(centralId, headlineId, NODE_CONFIGS.headline.color, 3)
      
      // Process sections for this headline
      this.layoutSections(headline.sections || [], headlineId, position, layoutRules)
    })
  }
  
  private createHeadlineNode(headline: any, nodeId: string, position: { x: number, y: number }) {
    const config = NODE_CONFIGS.headline
    
    const node: NodeData = {
      id: nodeId,
      type: config.type,
      position: position,
      data: {
        text: headline.title,
        fontSize: config.fontSize,
        color: config.color
      },
      width: config.width,
      height: config.height,
      zIndex: config.zIndex
    }
    
    this.nodes.push(node)
    this.nodePositions.set(nodeId, position)
  }
  
  private layoutSections(sections: any[], headlineId: string, headlinePos: { x: number, y: number }, layoutRules: any) {
    const arrangement = layoutRules.sectionArrangement || 'hierarchical'
    const headlineNode = this.nodes.find(n => n.id === headlineId)
    
    if (sections.length === 0) return
    
    // Calculate section positions
    const sectionPositions = this.calculateSubPositions(
      sections.length,
      headlinePos,
      arrangement,
      350
    )
    
    sections.forEach((section, index) => {
      const sectionId = uuidv4()
      const position = sectionPositions[index]
      
      // Create section node
      this.createSectionNode(section, sectionId, position)
      this.connectNodes(headlineId, sectionId, NODE_CONFIGS.section.color, 2)
      
      // Layout details for this section
      this.layoutSectionDetails(section, sectionId, position, layoutRules)
    })
  }
  
  private createSectionNode(section: any, nodeId: string, position: { x: number, y: number }) {
    const config = NODE_CONFIGS.section
    
    const node: NodeData = {
      id: nodeId,
      type: config.type,
      position: position,
      data: {
        text: section.title,
        fontSize: config.fontSize,
        color: config.color
      },
      width: config.width,
      height: config.height,
      zIndex: config.zIndex
    }
    
    this.nodes.push(node)
    this.nodePositions.set(nodeId, position)
  }
  
  private layoutSectionDetails(section: any, sectionId: string, sectionPos: { x: number, y: number }, layoutRules: any) {
    const details = section.details || {}
    const detailsDisplay = layoutRules.detailsDisplay || 'nested'
    
    let currentY = sectionPos.y + 120
    let detailIndex = 0
    
    // Key Points
    if (details.keyPoints && details.keyPoints.length > 0) {
      const keyPointsGroup = this.createDetailGroup('Key Points', sectionPos.x - 150, currentY)
      
      details.keyPoints.forEach((point: string, idx: number) => {
        const pointId = uuidv4()
        this.createDetailNode(
          point,
          pointId,
          'keyPoint',
          { x: 20, y: 60 + idx * 100 },
          keyPointsGroup
        )
      })
      
      this.connectNodes(sectionId, keyPointsGroup, '#F59E0B', 1)
      currentY += 100 + details.keyPoints.length * 100
    }
    
    // Examples
    if (details.examples && details.examples.length > 0) {
      details.examples.forEach((example: string, idx: number) => {
        const exampleId = uuidv4()
        const position = {
          x: sectionPos.x + 300,
          y: sectionPos.y + idx * 80
        }
        
        this.createDetailNode(
          `Example: ${example}`,
          exampleId,
          'example',
          position
        )
        
        this.connectNodes(sectionId, exampleId, '#10B981', 1, '3,3')
      })
    }
    
    // Data Points
    if (details.data && details.data.length > 0) {
      details.data.forEach((dataPoint: string, idx: number) => {
        const dataId = uuidv4()
        const position = {
          x: sectionPos.x + 150,
          y: currentY + idx * 70
        }
        
        this.createDetailNode(
          dataPoint,
          dataId,
          'data',
          position
        )
        
        this.connectNodes(sectionId, dataId, '#3B82F6', 1, '2,2')
      })
    }
    
    // Quotes
    if (details.quotes && details.quotes.length > 0) {
      details.quotes.forEach((quote: any, idx: number) => {
        const quoteId = uuidv4()
        const position = {
          x: sectionPos.x - 350,
          y: sectionPos.y + 150 + idx * 120
        }
        
        this.createDetailNode(
          `"${quote.text}"\n— ${quote.speaker}`,
          quoteId,
          'quote',
          position
        )
        
        this.connectNodes(sectionId, quoteId, '#8B5CF6', 1, '5,5')
      })
    }
    
    // Action Items
    if (details.actionItems && details.actionItems.length > 0) {
      const actionsGroup = this.createDetailGroup('Actions', sectionPos.x, currentY + 100)
      
      details.actionItems.forEach((action: string, idx: number) => {
        const actionId = uuidv4()
        this.createDetailNode(
          action,
          actionId,
          'actionItem',
          { x: 20, y: 60 + idx * 90 },
          actionsGroup
        )
      })
      
      this.connectNodes(sectionId, actionsGroup, '#EF4444', 1)
    }
  }
  
  private createDetailGroup(label: string, x: number, y: number): string {
    const groupId = uuidv4()
    
    this.nodes.push({
      id: groupId,
      type: 'group',
      position: { x, y },
      data: {
        label: label,
        color: '#F3F4F6'
      },
      style: {
        width: 300,
        height: 150
      },
      zIndex: 100
    })
    
    return groupId
  }
  
  private createDetailNode(
    text: string,
    nodeId: string,
    nodeType: keyof typeof NODE_CONFIGS,
    position: { x: number, y: number },
    parentNode?: string
  ) {
    const config = NODE_CONFIGS[nodeType]
    
    const node: NodeData = {
      id: nodeId,
      type: config.type,
      position: position,
      data: {
        text: text,
        fontSize: (config as any).fontSize,
        color: (config as any).color || '#000000'
      },
      width: config.width,
      height: config.height,
      style: (config as any).style,
      zIndex: config.zIndex,
      ...(parentNode && { parentNode, extent: 'parent' as const })
    }
    
    this.nodes.push(node)
    if (!parentNode) {
      this.nodePositions.set(nodeId, position)
    }
  }
  
  private addCrossCuttingElements(crossCutting: any, centralId: string, layoutRules: any) {
    if (!crossCutting) return
    
    // Position zones for cross-cutting elements
    const zones = {
      insights: { x: -800, y: -600 },
      themes: { x: 800, y: -600 },
      globalActions: { x: 0, y: 800 }
    }
    
    // Add Insights
    if (crossCutting.insights && crossCutting.insights.length > 0) {
      const insightsGroup = this.createCrossCuttingGroup(
        '💡 Key Insights',
        zones.insights,
        crossCutting.insights.length
      )
      
      crossCutting.insights.forEach((insight: any, idx: number) => {
        const insightId = uuidv4()
        this.createDetailNode(
          insight.text,
          insightId,
          'insight',
          { x: 20, y: 80 + idx * 120 },
          insightsGroup
        )
      })
      
      this.connectNodes(centralId, insightsGroup, '#10B981', 2, '10,5')
    }
    
    // Add Themes
    if (crossCutting.themes && crossCutting.themes.length > 0) {
      crossCutting.themes.forEach((theme: any, idx: number) => {
        const themeId = uuidv4()
        const position = {
          x: zones.themes.x,
          y: zones.themes.y + idx * 250
        }
        
        this.nodes.push({
          id: themeId,
          type: 'group',
          position: position,
          data: {
            label: theme.name,
            color: '#FEF3C7'
          },
          style: {
            width: 350,
            height: 150,
            backgroundColor: '#FEF9C3',
            border: '2px solid #F59E0B'
          },
          zIndex: NODE_CONFIGS.theme.zIndex
        })
        
        // Add theme description inside
        const descId = uuidv4()
        this.nodes.push({
          id: descId,
          type: 'text',
          position: { x: 20, y: 60 },
          parentNode: themeId,
          extent: 'parent',
          data: {
            text: theme.description,
            fontSize: 12,
            color: '#92400E'
          },
          width: 310,
          height: 70
        })
        
        this.connectNodes(centralId, themeId, '#F59E0B', 2, '8,4')
      })
    }
    
    // Add Global Actions
    if (crossCutting.globalActions && crossCutting.globalActions.length > 0) {
      const actionsGroup = this.createCrossCuttingGroup(
        '🎯 Global Action Items',
        zones.globalActions,
        crossCutting.globalActions.length
      )
      
      crossCutting.globalActions.forEach((action: any, idx: number) => {
        const actionId = uuidv4()
        const priority = action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢'
        
        this.createDetailNode(
          `${priority} ${action.action}\n${action.context || ''}`,
          actionId,
          'actionItem',
          { x: 20, y: 80 + idx * 100 },
          actionsGroup
        )
      })
      
      this.connectNodes(centralId, actionsGroup, '#EF4444', 2)
    }
  }
  
  private createCrossCuttingGroup(label: string, position: { x: number, y: number }, itemCount: number): string {
    const groupId = uuidv4()
    
    this.nodes.push({
      id: groupId,
      type: 'group',
      position: position,
      data: {
        label: label,
        color: '#F3F4F6'
      },
      style: {
        width: 400,
        height: 120 + itemCount * 120
      },
      zIndex: 100
    })
    
    return groupId
  }
  
  private connectNodes(
    sourceId: string,
    targetId: string,
    color: string,
    width: number,
    dashArray?: string
  ) {
    this.edges.push({
      id: uuidv4(),
      source: sourceId,
      target: targetId,
      type: 'default',
      style: {
        stroke: color,
        strokeWidth: width,
        ...(dashArray && { strokeDasharray: dashArray })
      }
    })
  }
  
  private calculateMainPositions(count: number, placement: string, radius: number): { x: number, y: number }[] {
    const positions: { x: number, y: number }[] = []
    
    switch (placement) {
      case 'circular':
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * 2 * Math.PI - Math.PI / 2
          positions.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
          })
        }
        break
        
      case 'horizontal':
        const hSpacing = 700
        const startX = -(count - 1) * hSpacing / 2
        for (let i = 0; i < count; i++) {
          positions.push({
            x: startX + i * hSpacing,
            y: 0
          })
        }
        break
        
      case 'vertical':
        const vSpacing = 500
        const startY = -(count - 1) * vSpacing / 2
        for (let i = 0; i < count; i++) {
          positions.push({
            x: 0,
            y: startY + i * vSpacing
          })
        }
        break
        
      case 'chronological':
        // Timeline layout
        const tSpacing = 600
        for (let i = 0; i < count; i++) {
          positions.push({
            x: -300 + i * tSpacing,
            y: 100
          })
        }
        break
        
      default:
        return this.calculateMainPositions(count, 'circular', radius)
    }
    
    return positions
  }
  
  private calculateSubPositions(
    count: number,
    parentPos: { x: number, y: number },
    arrangement: string,
    distance: number
  ): { x: number, y: number }[] {
    const positions: { x: number, y: number }[] = []
    
    switch (arrangement) {
      case 'hierarchical':
        const hSpacing = Math.max(280, 250 + (5 - count) * 30)
        const vOffset = 200
        const startX = parentPos.x - ((count - 1) * hSpacing) / 2
        
        for (let i = 0; i < count; i++) {
          positions.push({
            x: startX + i * hSpacing,
            y: parentPos.y + vOffset
          })
        }
        break
        
      case 'radial':
        const startAngle = -Math.PI
        const endAngle = 0
        const angleStep = (endAngle - startAngle) / (count - 1 || 1)
        
        for (let i = 0; i < count; i++) {
          const angle = startAngle + i * angleStep
          positions.push({
            x: parentPos.x + Math.cos(angle) * distance,
            y: parentPos.y + Math.sin(angle) * distance
          })
        }
        break
        
      case 'grouped':
        const cols = Math.ceil(Math.sqrt(count))
        const gSpacing = 300
        
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / cols)
          const col = i % cols
          positions.push({
            x: parentPos.x + (col - (cols - 1) / 2) * gSpacing,
            y: parentPos.y + 200 + row * 200
          })
        }
        break
        
      default:
        return this.calculateSubPositions(count, parentPos, 'hierarchical', distance)
    }
    
    return positions
  }
  
  private optimizeLayout() {
    const minDistance = 100
    const iterations = 8
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const node1 = this.nodes[i]
          const node2 = this.nodes[j]
          
          if (node1.parentNode || node2.parentNode) continue
          
          const dx = node2.position.x - node1.position.x
          const dy = node2.position.y - node1.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          const node1Width = node1.width || 200
          const node2Width = node2.width || 200
          
          const minRequiredDistance = (node1Width + node2Width) / 2 + minDistance
          
          if (distance < minRequiredDistance && distance > 0) {
            const pushDistance = (minRequiredDistance - distance) / 2
            const pushX = (dx / distance) * pushDistance
            const pushY = (dy / distance) * pushDistance
            
            node1.position.x -= pushX
            node1.position.y -= pushY
            node2.position.x += pushX
            node2.position.y += pushY
          }
        }
      }
    }
  }
  
  private centerAndScale() {
    if (this.nodes.length === 0) return
    
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    this.nodes.forEach(node => {
      if (node.parentNode) return
      
      const width = node.width || 200
      const height = node.height || 100
      
      minX = Math.min(minX, node.position.x - width / 2)
      maxX = Math.max(maxX, node.position.x + width / 2)
      minY = Math.min(minY, node.position.y - height / 2)
      maxY = Math.max(maxY, node.position.y + height / 2)
    })
    
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    
    this.nodes.forEach(node => {
      if (!node.parentNode) {
        node.position.x -= centerX
        node.position.y -= centerY
      }
    })
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

    // Use the new hierarchical layout engine
    const layoutEngine = new HierarchicalLayoutEngine()
    const { nodes, edges } = layoutEngine.generateMindMap(analysis)

    return NextResponse.json({
      nodes,
      edges,
      metadata: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        generatedAt: new Date().toISOString(),
        layoutStrategy: analysis.layout?.primaryLayout || 'hierarchical',
        analysisStages: analysis.metadata?.analysisStages || 5,
        structure: {
          headlines: analysis.structure.headlines?.length || 0,
          sections: analysis.structure.headlines?.reduce((sum: number, h: any) => 
            sum + (h.sections?.length || 0), 0) || 0,
          totalPoints: analysis.metadata?.extractedElements?.totalPoints || 0
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