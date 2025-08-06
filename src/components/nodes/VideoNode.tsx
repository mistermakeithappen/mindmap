import { memo, useState } from 'react'
import { NodeProps, useReactFlow } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface VideoNodeData {
  url?: string
  title?: string
}

export const VideoNode = memo(({ id, data, selected }: NodeProps<VideoNodeData>) => {
  const [url, setUrl] = useState(data.url || '')
  const [title, setTitle] = useState(data.title || '')
  const [isEditingUrl, setIsEditingUrl] = useState(!url)
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
            <iframe
              src={getEmbedUrl(url)}
              className="w-full h-full"
              allowFullScreen
              title={title || 'Video'}
            />
            <button
              onClick={() => setIsEditingUrl(true)}
              className="absolute top-2 right-2 px-2 py-1 bg-white bg-opacity-90 text-gray-800 text-xs rounded shadow hover:bg-opacity-100 transition-all"
            >
              Change URL
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <div className="w-full max-w-sm">
              <input
                type="url"
                placeholder="Enter video URL (YouTube, Vimeo, etc.)"
                value={url}
                onChange={handleUrlChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url) {
                    setIsEditingUrl(false)
                  }
                }}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-800 rounded placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {url && (
                <button
                  onClick={() => setIsEditingUrl(false)}
                  className="mt-2 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Load Video
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

VideoNode.displayName = 'VideoNode'