'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface AIMindMapModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFolderId?: string | null
}

export function AIMindMapModal({ isOpen, onClose, selectedFolderId }: AIMindMapModalProps) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')
  const router = useRouter()
  const supabase = createClient()

  if (!isOpen) return null

  const handleGenerate = async () => {
    if (!content.trim()) {
      setError('Please paste your conversation or transcript')
      return
    }

    if (!title.trim()) {
      setError('Please provide a title for your mind map')
      return
    }

    setError('')
    setIsAnalyzing(true)
    setProgress('Analyzing content...')

    try {
      // Step 1: Analyze the content
      const analyzeResponse = await fetch('/api/ai/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      })

      const analyzeData = await analyzeResponse.json()

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData.error || 'Failed to analyze content')
      }

      setProgress('Generating mind map structure...')
      setIsGenerating(true)

      // Step 2: Generate mind map with synapse nodes
      const mindmapResponse = await fetch('/api/ai/generate-mindmap-synapse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyzeData)
      })

      const mindmapData = await mindmapResponse.json()

      if (!mindmapResponse.ok) {
        throw new Error(mindmapData.error || 'Failed to generate mind map')
      }

      setProgress('Creating canvas...')

      // Step 3: Create canvas with the generated nodes and edges
      const createResponse = await fetch('/api/canvas/create-from-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title,
          description: `AI-generated mind map from: ${title}`,
          nodes: mindmapData.nodes,
          edges: mindmapData.edges,
          folder_id: selectedFolderId === 'uncategorized' ? null : selectedFolderId,
          metadata: mindmapData.metadata
        })
      })

      const createData = await createResponse.json()

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create canvas')
      }

      // Navigate to the new canvas
      router.push(`/canvas/${createData.id}`)
    } catch (error) {
      console.error('Error generating mind map:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
      setIsGenerating(false)
      setProgress('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Generate AI Mind Map</h2>
          <p className="text-gray-600 mt-1">
            Paste a conversation or transcript to automatically create an organized mind map
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title for your mind map
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Meeting Notes, Project Planning Session"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAnalyzing || isGenerating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Paste your conversation or transcript
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your conversation, meeting transcript, or any text content here..."
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                disabled={isAnalyzing || isGenerating}
              />
              <p className="text-sm text-gray-500 mt-1">
                The AI will analyze your content and create a structured mind map with main topics, 
                subtopics, and key points organized using synapse nodes.
              </p>
            </div>
          </div>

          {progress && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-purple-600 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-purple-700">{progress}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isAnalyzing || isGenerating}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isAnalyzing || isGenerating || !content.trim() || !title.trim()}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(isAnalyzing || isGenerating) ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate Mind Map
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}