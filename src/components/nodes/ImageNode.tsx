import { memo, useState, useRef } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'
import Image from 'next/image'

interface ImageNodeData {
  url?: string
  caption?: string
}

export const ImageNode = memo(({ id, data, selected, dragging }: NodeProps<ImageNodeData>) => {
  const [url, setUrl] = useState(data.url || '')
  const [caption, setCaption] = useState(data.caption || '')
  const [mode, setMode] = useState<'url' | 'upload' | 'generate' | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<ImageNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const handleUrlSubmit = () => {
    if (url) {
      updateNodeData({ url })
      setMode(null)
      setError('')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload file')
      }

      setUrl(data.url)
      updateNodeData({ url: data.url })
      setMode(null)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image')
      }

      setUrl(data.url)
      updateNodeData({ url: data.url })
      setMode(null)
      setPrompt('')
    } catch (error) {
      console.error('Generation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate image')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} w-[300px]`}>
      <NodeHandles />
      <div className="relative h-[200px] bg-gray-100 flex items-center justify-center">
        {url && !mode ? (
          <>
            <Image 
              src={url} 
              alt={caption || 'Image'} 
              fill
              className="object-cover"
              sizes="(max-width: 300px) 100vw, 300px"
            />
            <button
              onClick={() => setMode('url')}
              className="absolute top-2 right-2 px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded shadow hover:bg-opacity-100 transition-all"
              style={{ opacity: dragging ? 0.1 : 1, pointerEvents: dragging ? 'none' : 'auto' }}
            >
              Change
            </button>
          </>
        ) : (
          <div className="w-full p-4">
            {!mode && (
              <div className="space-y-2">
                <button
                  onClick={() => setMode('url')}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                >
                  Enter Image URL
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                >
                  Upload from Computer
                </button>
                <button
                  onClick={() => setMode('generate')}
                  className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors text-sm"
                >
                  Generate with AI
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {mode === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  placeholder="Enter image URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setMode(null)
                      setError('')
                    }}
                    className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {mode === 'generate' && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Describe the image..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                  disabled={isLoading}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isLoading || !prompt.trim()}
                    className="flex-1 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300 transition-colors text-sm"
                  >
                    {isLoading ? 'Generating...' : 'Generate'}
                  </button>
                  <button
                    onClick={() => {
                      setMode(null)
                      setPrompt('')
                      setError('')
                    }}
                    disabled={isLoading}
                    className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isLoading && mode === 'upload' && (
              <div className="text-center text-sm text-gray-600">Uploading...</div>
            )}

            {error && (
              <div className="mt-2 text-xs text-red-600 text-center">{error}</div>
            )}
          </div>
        )}
      </div>
      <div className="p-2">
        <input
          type="text"
          placeholder="Add caption..."
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value)
            updateNodeData({ caption: e.target.value })
          }}
          className="w-full text-sm outline-none"
        />
      </div>
    </div>
  )
})

ImageNode.displayName = 'ImageNode'