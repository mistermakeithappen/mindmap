import { memo, useState, useRef } from 'react'
import { NodeProps, useReactFlow, NodeResizer } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface FileNodeData {
  url?: string
  fileName?: string
  fileSize?: number
  fileType?: string
}

export const FileNode = memo(({ id, data, selected, dragging }: NodeProps<FileNodeData>) => {
  const [url, setUrl] = useState(data.url || '')
  const [fileName, setFileName] = useState(data.fileName || '')
  const [fileSize, setFileSize] = useState(data.fileSize || 0)
  const [fileType, setFileType] = useState(data.fileType || '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reactFlow = useReactFlow()

  const updateNodeData = (updates: Partial<FileNodeData>) => {
    reactFlow.setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
      )
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError('')

    try {
      // For local preview of certain file types
      if (file.type.startsWith('image/') || file.type === 'application/pdf' || file.type.startsWith('video/')) {
        const localUrl = URL.createObjectURL(file)
        setUrl(localUrl)
        setFileName(file.name)
        setFileSize(file.size)
        setFileType(file.type)
        updateNodeData({ 
          url: localUrl, 
          fileName: file.name, 
          fileSize: file.size, 
          fileType: file.type 
        })
      } else {
        // For other files, upload to server
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
        setFileName(data.fileName)
        setFileSize(data.fileSize)
        setFileType(data.fileType)
        updateNodeData({ 
          url: data.url, 
          fileName: data.fileName, 
          fileSize: data.fileSize, 
          fileType: data.fileType 
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError(error instanceof Error ? error.message : 'Failed to upload file')
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.startsWith('video/')) return '🎬'
    if (fileType.startsWith('audio/')) return '🎵'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('document') || fileType.includes('word')) return '📝'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📊'
    if (fileType.includes('text')) return '📃'
    if (fileType.includes('zip') || fileType.includes('archive')) return '📦'
    return '📎'
  }

  const renderFilePreview = () => {
    if (!url) return null

    // PDF files
    if (fileType === 'application/pdf') {
      return (
        <iframe
          src={url}
          className="w-full h-full"
          title={fileName}
          style={{ border: 'none' }}
        />
      )
    }

    // Image files
    if (fileType.startsWith('image/')) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={fileName}
          className="w-full h-full object-contain"
        />
      )
    }

    // Video files
    if (fileType.startsWith('video/')) {
      return (
        <video
          src={url}
          controls
          className="w-full h-full object-contain"
          title={fileName}
        />
      )
    }

    // Audio files
    if (fileType.startsWith('audio/')) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <span className="text-6xl mb-4">{getFileIcon()}</span>
          <audio
            src={url}
            controls
            className="w-full"
            title={fileName}
          />
          <p className="mt-2 text-sm text-gray-600">{fileName}</p>
        </div>
      )
    }

    // Other files - show info and download link
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <span className="text-6xl mb-4">{getFileIcon()}</span>
        <p className="font-semibold text-gray-800 text-center">{fileName}</p>
        <p className="text-sm text-gray-500 mt-1">{formatFileSize(fileSize)}</p>
        <a
          href={url}
          download={fileName}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          Download File
        </a>
      </div>
    )
  }

  return (
    <>
      <NodeResizer 
        isVisible={selected}
        minWidth={300}
        minHeight={200}
        color="#3b82f6"
        handleStyle={{ width: '10px', height: '10px' }}
      />
      <NodeHandles />
      <div className={`relative bg-white rounded-lg shadow-md border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} w-full h-full flex flex-col overflow-hidden`}>
        {/* Header with file info */}
        {url && (
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg">{getFileIcon()}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 bg-white text-gray-700 text-xs rounded border hover:bg-gray-100 transition-colors"
              style={{ opacity: dragging ? 0.1 : 1, pointerEvents: dragging ? 'none' : 'auto' }}
            >
              Change
            </button>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          {url ? (
            renderFilePreview()
          ) : (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <span className="text-6xl mb-4 block">{getFileIcon()}</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Choose File'}
                </button>
                {error && (
                  <p className="text-red-500 text-sm mt-2">{error}</p>
                )}
                <p className="text-gray-500 text-xs mt-2">
                  Supports all file types
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="*"
        />
      </div>
    </>
  )
})

FileNode.displayName = 'FileNode'