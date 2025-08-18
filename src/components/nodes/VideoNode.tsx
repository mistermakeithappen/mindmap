import { memo, useState, useRef } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface VideoNodeData {
  url?: string
  title?: string
}

export const VideoNode = memo(({ id, data, selected, dragging }: NodeProps<VideoNodeData>) => {
  const [url, setUrl] = useState(data.url || '')
  const [title, setTitle] = useState(data.title || '')
  const [isEditingUrl, setIsEditingUrl] = useState(!url)
  const [mode, setMode] = useState<'url' | 'upload' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<VideoNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const getEmbedUrl = (url: string) => {
    // Convert YouTube watch URLs to embed URLs
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    // Support YouTube short URLs
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    // Support Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
      return `https://player.vimeo.com/video/${videoId}`
    }
    return url
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    updateNodeData({ url: e.target.value })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create a local URL for the video
      const videoUrl = URL.createObjectURL(file)
      setUrl(videoUrl)
      updateNodeData({ url: videoUrl, title: file.name })
      setTitle(file.name)
      setMode(null)
      setIsEditingUrl(false)
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to load video')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
    updateNodeData({ title: e.target.value })
  }

  return (
    <div className={`relative bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} w-[400px]`}>
      <NodeHandles />
      <div className="p-3 bg-gray-100 border-b">
        <input
          type="text"
          placeholder="Video title"
          value={title}
          onChange={handleTitleChange}
          className="w-full text-gray-800 bg-transparent outline-none font-semibold placeholder-gray-500"
        />
      </div>
      <div className="relative h-[225px] bg-gray-100">
        {url && !isEditingUrl ? (
          <>
            {url.startsWith('blob:') ? (
              <video
                src={url}
                controls
                className="w-full h-full object-contain bg-black"
                title={title || 'Video'}
              />
            ) : (
              <iframe
                src={getEmbedUrl(url)}
                className="w-full h-full"
                allowFullScreen
                title={title || 'Video'}
              />
            )}
            <button
              onClick={() => {
                setIsEditingUrl(true)
                setMode(null)
              }}
              className="absolute top-2 right-2 px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded shadow hover:bg-opacity-100 transition-all"
              style={{ opacity: dragging ? 0.1 : 1, pointerEvents: dragging ? 'none' : 'auto' }}
            >
              Change
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="w-full max-w-sm">
              {!mode ? (
                <div className="space-y-2">
                  <button
                    onClick={() => setMode('url')}
                    className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                  >
                    Enter Video URL
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Upload from Computer'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {error && (
                    <div className="text-red-500 text-xs text-center mt-2">{error}</div>
                  )}
                </div>
              ) : mode === 'url' ? (
                <div>
                  <input
                    type="url"
                    placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                    value={url}
                    onChange={handleUrlChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && url) {
                        setIsEditingUrl(false)
                        setMode(null)
                      }
                      if (e.key === 'Escape') {
                        setMode(null)
                      }
                    }}
                    className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        if (url) {
                          setIsEditingUrl(false)
                          setMode(null)
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      disabled={!url}
                    >
                      Load Video
                    </button>
                    <button
                      onClick={() => setMode(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

VideoNode.displayName = 'VideoNode'