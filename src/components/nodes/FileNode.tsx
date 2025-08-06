import { memo, useState } from 'react'
import { NodeProps } from 'reactflow'
import { NodeHandles } from './NodeHandles'

interface FileNodeData {
  fileName?: string
  fileSize?: string
  fileType?: string
}

export const FileNode = memo(({ id, data, selected }: NodeProps<FileNodeData>) => {
  const [fileName, setFileName] = useState(data.fileName || 'Untitled')
  const [fileType, setFileType] = useState(data.fileType || 'document')

  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf': return '📄'
      case 'image': return '🖼️'
      case 'video': return '🎬'
      case 'audio': return '🎵'
      case 'code': return '💻'
      default: return '📎'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 border-2 ${selected ? 'border-blue-500' : 'border-gray-200'} w-[250px]`}>
      <NodeHandles />
      <div className="flex items-center gap-3">
        <span className="text-4xl">{getFileIcon()}</span>
        <div className="flex-1">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full font-semibold outline-none"
          />
          <div className="text-sm text-gray-500 mt-1">
            {data.fileSize || 'File'}
          </div>
        </div>
      </div>
    </div>
  )
})

FileNode.displayName = 'FileNode'