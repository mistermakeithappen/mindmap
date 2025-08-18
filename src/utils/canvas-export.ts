import { Node, Edge } from 'reactflow'
import { v4 as uuidv4 } from 'uuid'

export interface CanvasExportData {
  version: string
  metadata: {
    name: string
    description?: string
    exportedAt: string
    originalCanvasId: string
  }
  nodes: Node[]
  edges: Edge[]
  settings?: {
    background?: string
    theme?: string
  }
  _platform?: {
    name: string
    url: string
    shareUrl?: string
    readme: string
  }
}

/**
 * Export canvas data to JSON format
 */
export function exportCanvas(
  canvasId: string,
  name: string,
  description: string | undefined,
  nodes: Node[],
  edges: Edge[]
): CanvasExportData {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mindgrid.app'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'MindGrid'
  
  const exportData: CanvasExportData = {
    version: '1.0',
    metadata: {
      name,
      description,
      exportedAt: new Date().toISOString(),
      originalCanvasId: canvasId,
    },
    nodes: nodes.map(node => ({
      ...node,
      // Remove any runtime-specific properties
      selected: false,
      dragging: false,
    })),
    edges: edges.map(edge => ({
      ...edge,
      // Remove any runtime-specific properties
      selected: false,
    })),
    settings: {
      background: 'dots',
      theme: 'light',
    },
    _platform: {
      name: appName,
      url: appUrl,
      shareUrl: `${appUrl}/share/${canvasId}`,
      readme: `This mind map was created with ${appName}. To view and edit this mind map, visit ${appUrl} and import this file, or share it directly at ${appUrl}/share/${canvasId}`
    }
  }

  return exportData
}

/**
 * Download canvas as JSON file
 */
export function downloadCanvasAsJSON(exportData: CanvasExportData) {
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${exportData.metadata.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.mindgrid.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Download canvas as HTML file with auto-redirect
 */
export function downloadCanvasAsHTML(exportData: CanvasExportData) {
  const appUrl = exportData._platform?.url || 'https://mindgrid.app'
  const appName = exportData._platform?.name || 'MindGrid'
  const shareUrl = exportData._platform?.shareUrl || appUrl
  
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exportData.metadata.name} - ${appName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .container {
            text-align: center;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            margin: 0 0 10px;
            font-size: 2.5em;
            font-weight: 700;
        }
        .subtitle {
            opacity: 0.9;
            margin-bottom: 30px;
            font-size: 1.2em;
        }
        .info {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 15px 30px;
            margin: 10px;
            background: white;
            color: #667eea;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
        }
        .button.primary {
            background: #fbbf24;
            color: #1f2937;
        }
        .metadata {
            margin-top: 30px;
            font-size: 0.9em;
            opacity: 0.8;
        }
        .loading {
            margin-top: 20px;
            font-size: 0.9em;
            opacity: 0.7;
        }
        code {
            background: rgba(0, 0, 0, 0.2);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${exportData.metadata.name}</h1>
        <div class="subtitle">Mind Map created with ${appName}</div>
        
        <div class="info">
            <p><strong>📊 ${exportData.nodes.length}</strong> nodes</p>
            <p><strong>🔗 ${exportData.edges.length}</strong> connections</p>
            ${exportData.metadata.description ? `<p>${exportData.metadata.description}</p>` : ''}
        </div>
        
        <div>
            <a href="${shareUrl}" class="button primary">View Mind Map</a>
            <a href="${appUrl}" class="button">Visit ${appName}</a>
        </div>
        
        <div class="loading">Redirecting to ${appName} in <span id="countdown">5</span> seconds...</div>
        
        <div class="metadata">
            <p>Exported: ${new Date(exportData.metadata.exportedAt).toLocaleDateString()}</p>
            <p>Canvas ID: <code>${exportData.metadata.originalCanvasId}</code></p>
        </div>
    </div>
    
    <script type="application/json" id="mindmap-data">
${JSON.stringify(exportData, null, 2)}
    </script>
    
    <script>
        // Countdown and redirect
        let seconds = 5;
        const countdownEl = document.getElementById('countdown');
        const redirectUrl = '${shareUrl}';
        
        const interval = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(interval);
                window.location.href = redirectUrl;
            }
        }, 1000);
        
        // Allow user to cancel redirect by pressing any key
        document.addEventListener('keydown', () => {
            clearInterval(interval);
            const loadingEl = document.querySelector('.loading');
            if (loadingEl) {
                loadingEl.innerHTML = 'Auto-redirect cancelled. Click the button above to view your mind map.';
            }
        });
    </script>
</body>
</html>`
  
  const htmlBlob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(htmlBlob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${exportData.metadata.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.html`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * Validate imported canvas data
 */
export function validateCanvasImport(data: any): { valid: boolean; error?: string } {
  try {
    // Check basic structure
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Invalid JSON structure' }
    }

    // Check version
    if (!data.version || typeof data.version !== 'string') {
      return { valid: false, error: 'Missing or invalid version' }
    }

    // Check metadata
    if (!data.metadata || typeof data.metadata !== 'object') {
      return { valid: false, error: 'Missing or invalid metadata' }
    }

    if (!data.metadata.name || typeof data.metadata.name !== 'string') {
      return { valid: false, error: 'Missing canvas name' }
    }

    // Check nodes
    if (!Array.isArray(data.nodes)) {
      return { valid: false, error: 'Invalid nodes array' }
    }

    // Validate each node has required properties
    for (const node of data.nodes) {
      if (!node.id || !node.type || !node.position) {
        return { valid: false, error: 'Invalid node structure' }
      }
      if (typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        return { valid: false, error: 'Invalid node position' }
      }
    }

    // Check edges
    if (!Array.isArray(data.edges)) {
      return { valid: false, error: 'Invalid edges array' }
    }

    // Validate each edge has required properties
    for (const edge of data.edges) {
      if (!edge.id || !edge.source || !edge.target) {
        return { valid: false, error: 'Invalid edge structure' }
      }
    }

    return { valid: true }
  } catch (error) {
    return { valid: false, error: 'Failed to validate import data' }
  }
}

/**
 * Transform imported data for use in the application
 */
export function transformImportedCanvas(data: CanvasExportData): {
  name: string
  description?: string
  nodes: Node[]
  edges: Edge[]
} {
  // Generate new IDs to avoid conflicts
  const idMap = new Map<string, string>()
  
  // Map old IDs to new IDs for nodes
  data.nodes.forEach(node => {
    idMap.set(node.id, uuidv4())
  })

  // Transform nodes with new IDs
  const transformedNodes = data.nodes.map(node => ({
    ...node,
    id: idMap.get(node.id)!,
    // Update parentId if it exists
    parentId: node.parentId ? idMap.get(node.parentId) : undefined,
    // Ensure data object exists
    data: node.data || {},
  }))

  // Transform edges with new IDs
  const transformedEdges = data.edges.map(edge => ({
    ...edge,
    id: uuidv4(),
    source: idMap.get(edge.source)!,
    target: idMap.get(edge.target)!,
  }))

  return {
    name: `${data.metadata.name} (Imported)`,
    description: data.metadata.description,
    nodes: transformedNodes,
    edges: transformedEdges,
  }
}

/**
 * Parse uploaded file and extract canvas data
 */
export async function parseCanvasFile(file: File): Promise<CanvasExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        resolve(data)
      } catch (error) {
        reject(new Error('Failed to parse JSON file'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsText(file)
  })
}