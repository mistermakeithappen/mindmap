'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { 
  parseCanvasFile, 
  validateCanvasImport, 
  transformImportedCanvas,
  CanvasExportData 
} from '@/utils/canvas-export'

interface ImportCanvasModalProps {
  isOpen: boolean
  onClose: () => void
  folderId?: string | null
}

export function ImportCanvasModal({ isOpen, onClose, folderId }: ImportCanvasModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<CanvasExportData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file type
    if (!selectedFile.name.endsWith('.json') && !selectedFile.name.endsWith('.mindgrid.json')) {
      setError('Please select a valid MindGrid JSON file')
      return
    }

    setFile(selectedFile)
    setError(null)

    // Parse and preview the file
    try {
      const data = await parseCanvasFile(selectedFile)
      const validation = validateCanvasImport(data)
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid file format')
        setPreviewData(null)
        return
      }

      setPreviewData(data)
    } catch (err) {
      setError('Failed to read file')
      setPreviewData(null)
    }
  }

  const handleImport = async () => {
    if (!previewData) return

    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      // Transform the imported data
      const transformed = transformImportedCanvas(previewData)

      // Create new canvas
      const canvasId = uuidv4()
      const { error: canvasError } = await supabase
        .from('canvases')
        .insert({
          id: canvasId,
          name: transformed.name,
          description: transformed.description || `Imported from ${previewData.metadata.name}`,
          user_id: user.id,
          folder_id: folderId || null,
        })

      if (canvasError) {
        throw canvasError
      }

      // Insert nodes
      if (transformed.nodes.length > 0) {
        const nodesToInsert = transformed.nodes.map(node => ({
          id: node.id,
          canvas_id: canvasId,
          type: node.type,
          position: node.position,
          data: node.data || {},
          style: node.style || {},
          width: node.width,
          height: node.height,
          parent_node: node.parentId || null,
          extent: node.extent || null,
          z_index: node.zIndex || 0,
        }))

        const { error: nodesError } = await supabase
          .from('nodes')
          .insert(nodesToInsert)

        if (nodesError) {
          // Try to clean up the canvas if nodes fail
          await supabase.from('canvases').delete().eq('id', canvasId)
          throw nodesError
        }
      }

      // Insert edges
      if (transformed.edges.length > 0) {
        const edgesToInsert = transformed.edges.map(edge => ({
          id: edge.id,
          canvas_id: canvasId,
          source: edge.source,
          target: edge.target,
          source_handle: edge.sourceHandle || null,
          target_handle: edge.targetHandle || null,
          type: edge.type || 'default',
          label: edge.label || null,
          style: edge.style || {},
          data: edge.data || {},
        }))

        const { error: edgesError } = await supabase
          .from('edges')
          .insert(edgesToInsert)

        if (edgesError) {
          console.warn('Error inserting edges:', edgesError)
          // Don't fail the import if edges have issues
        }
      }

      // Navigate to the new canvas
      router.push(`/canvas/${canvasId}`)
    } catch (err) {
      console.error('Import error:', err)
      setError('Failed to import canvas. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setPreviewData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Mind Map</h2>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select MindGrid JSON File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.mindgrid.json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                {file ? file.name : 'Click to select or drag and drop'}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                Choose File
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Preview */}
          {previewData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Preview</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Name:</dt>
                  <dd className="font-medium text-gray-900">{previewData.metadata.name}</dd>
                </div>
                {previewData.metadata.description && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Description:</dt>
                    <dd className="text-gray-900">{previewData.metadata.description}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Nodes:</dt>
                  <dd className="text-gray-900">{previewData.nodes.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Connections:</dt>
                  <dd className="text-gray-900">{previewData.edges.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Exported:</dt>
                  <dd className="text-gray-900">
                    {new Date(previewData.metadata.exportedAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>

              {/* Node Types */}
              {previewData.nodes.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Node Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(previewData.nodes.map(n => n.type))).map(type => (
                      <span key={type} className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!previewData || loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Importing...' : 'Import Canvas'}
          </button>
        </div>
      </div>
    </div>
  )
}