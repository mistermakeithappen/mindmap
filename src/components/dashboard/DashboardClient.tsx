'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { v4 as uuidv4 } from 'uuid'
import { AIMindMapModal } from './AIMindMapModal'

interface Canvas {
  id: string
  name: string
  description?: string
  created_at: string
  folder_id?: string | null
}

interface Folder {
  id: string
  name: string
}

interface DashboardClientProps {
  user: any
  initialCanvases: Canvas[]
  initialFolders: Folder[]
}

export function DashboardClient({ user, initialCanvases, initialFolders }: DashboardClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [canvases, setCanvases] = useState(initialCanvases)
  const [folders, setFolders] = useState(initialFolders)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [draggedCanvasId, setDraggedCanvasId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; canvasId: string } | null>(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [copiedCanvasId, setCopiedCanvasId] = useState<string | null>(null)
  
  const supabase = createClient()

  // Copy share link functionality
  const copyShareLink = async (canvasId: string) => {
    try {
      // First, make the canvas public
      const { error } = await supabase
        .from('canvases')
        .update({ is_public: true })
        .eq('id', canvasId)
      
      if (error) {
        console.error('Error making canvas public:', error)
        alert('Failed to make canvas public. Please try again.')
        return
      }
      
      // Create the share URL
      const shareUrl = `${window.location.origin}/share/${canvasId}`
      
      // Try to copy to clipboard with fallback
      try {
        await navigator.clipboard.writeText(shareUrl)
        // Show success feedback
        setCopiedCanvasId(canvasId)
        setTimeout(() => setCopiedCanvasId(null), 2000)
      } catch (clipboardError) {
        // Fallback: create a temporary textarea and copy
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        try {
          document.execCommand('copy')
          // Show success feedback
          setCopiedCanvasId(canvasId)
          setTimeout(() => setCopiedCanvasId(null), 2000)
        } catch (fallbackError) {
          // If all else fails, show the URL to the user
          prompt('Copy this link to share your mind map:', shareUrl)
        } finally {
          document.body.removeChild(textArea)
        }
      }
      
    } catch (error) {
      console.error('Error copying share link:', error)
      alert('Failed to create share link. Please try again.')
    }
  }

  // Filter canvases based on search and selected folder
  const filteredCanvases = canvases.filter(canvas => {
    const matchesSearch = canvas.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      canvas.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (selectedFolderId === 'uncategorized') {
      return matchesSearch && !canvas.folder_id
    } else if (selectedFolderId) {
      return matchesSearch && canvas.folder_id === selectedFolderId
    }
    
    return matchesSearch
  })

  // Create new folder
  const createFolder = async () => {
    if (!newFolderName.trim()) return

    const { data, error } = await supabase
      .from('folders')
      .insert({
        id: uuidv4(),
        name: newFolderName.trim(),
        user_id: user.id
      })
      .select()
      .single()

    if (!error && data) {
      setFolders([...folders, data])
      setNewFolderName('')
      setIsCreatingFolder(false)
    }
  }

  // Update folder name
  const updateFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) return

    const { error } = await supabase
      .from('folders')
      .update({ name: editingFolderName.trim() })
      .eq('id', folderId)

    if (!error) {
      setFolders(folders.map(f => 
        f.id === folderId ? { ...f, name: editingFolderName.trim() } : f
      ))
      setEditingFolderId(null)
    }
  }

  // Delete folder
  const deleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? Canvases will be moved to uncategorized.')) {
      return
    }

    // First, update all canvases in this folder to have no folder
    await supabase
      .from('canvases')
      .update({ folder_id: null })
      .eq('folder_id', folderId)

    // Then delete the folder
    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)

    if (!error) {
      setFolders(folders.filter(f => f.id !== folderId))
      setCanvases(canvases.map(c => 
        c.folder_id === folderId ? { ...c, folder_id: null } : c
      ))
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null)
      }
    }
  }

  // Handle drag start
  const handleDragStart = (canvasId: string) => {
    setDraggedCanvasId(canvasId)
  }

  // Handle drop on folder
  const handleDropOnFolder = async (folderId: string | null) => {
    if (!draggedCanvasId) return

    const { error } = await supabase
      .from('canvases')
      .update({ folder_id: folderId })
      .eq('id', draggedCanvasId)

    if (!error) {
      setCanvases(canvases.map(c => 
        c.id === draggedCanvasId ? { ...c, folder_id: folderId } : c
      ))
    }

    setDraggedCanvasId(null)
  }

  // Count canvases in each folder
  const getCanvasCount = (folderId: string | null) => {
    if (folderId === 'uncategorized') {
      return canvases.filter(c => !c.folder_id).length
    }
    return canvases.filter(c => c.folder_id === folderId).length
  }

  // Delete canvas
  const deleteCanvas = async (canvasId: string) => {
    const canvas = canvases.find(c => c.id === canvasId)
    if (!canvas) return

    if (!confirm(`Are you sure you want to delete "${canvas.name}"? This action cannot be undone.`)) {
      return
    }

    // First delete all nodes in this canvas
    await supabase
      .from('nodes')
      .delete()
      .eq('canvas_id', canvasId)

    // Delete all edges in this canvas
    await supabase
      .from('edges')
      .delete()
      .eq('canvas_id', canvasId)

    // Delete the canvas itself
    const { error } = await supabase
      .from('canvases')
      .delete()
      .eq('id', canvasId)

    if (!error) {
      setCanvases(canvases.filter(c => c.id !== canvasId))
    }
  }

  // Handle right click on canvas
  const handleContextMenu = (e: React.MouseEvent, canvasId: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      canvasId
    })
  }

  // Close context menu when clicking outside
  const handleClickOutside = () => {
    setContextMenu(null)
  }

  return (
    <div className="flex h-screen bg-gray-50" onClick={handleClickOutside}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Folders</h2>
        
        {/* All Canvases */}
        <div
          className={`mb-2 p-2 rounded cursor-pointer transition-colors ${
            !selectedFolderId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
          }`}
          onClick={() => setSelectedFolderId(null)}
          onDrop={() => handleDropOnFolder(null)}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              All Canvases
            </span>
            <span className="text-sm text-gray-500">{canvases.length}</span>
          </div>
        </div>

        {/* Uncategorized */}
        <div
          className={`mb-2 p-2 rounded cursor-pointer transition-colors ${
            selectedFolderId === 'uncategorized' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
          }`}
          onClick={() => setSelectedFolderId('uncategorized')}
          onDrop={() => handleDropOnFolder(null)}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Uncategorized
            </span>
            <span className="text-sm text-gray-500">{getCanvasCount('uncategorized')}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 my-3"></div>

        {/* Folders */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`mb-2 p-2 rounded cursor-pointer transition-colors group ${
              selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
            }`}
            onClick={() => setSelectedFolderId(folder.id)}
            onDrop={() => handleDropOnFolder(folder.id)}
            onDragOver={(e) => e.preventDefault()}
          >
            {editingFolderId === folder.id ? (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onBlur={() => updateFolder(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      updateFolder(folder.id)
                    } else if (e.key === 'Escape') {
                      setEditingFolderId(null)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-1 py-0.5 text-sm border rounded"
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="flex items-center flex-1">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="truncate">{folder.name}</span>
                </span>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingFolderId(folder.id)
                      setEditingFolderName(folder.name)
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFolder(folder.id)
                    }}
                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <span className="text-sm text-gray-500 ml-2">{getCanvasCount(folder.id)}</span>
              </div>
            )}
          </div>
        ))}

        {/* New Folder */}
        {isCreatingFolder ? (
          <div className="mt-2 p-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onBlur={() => {
                if (newFolderName.trim()) {
                  createFolder()
                } else {
                  setIsCreatingFolder(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createFolder()
                } else if (e.key === 'Escape') {
                  setIsCreatingFolder(false)
                  setNewFolderName('')
                }
              }}
              placeholder="Folder name"
              className="w-full px-2 py-1 text-sm border rounded"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="mt-2 w-full p-2 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Folder
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">
            {selectedFolderId === 'uncategorized' 
              ? 'Uncategorized Canvases' 
              : selectedFolderId 
                ? folders.find(f => f.id === selectedFolderId)?.name || 'My Canvases'
                : 'All Canvases'
            }
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Mind Map
            </button>
            <Link
              href="/canvas/new"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Create New Canvas
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search canvases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCanvases.map((canvas) => {
            const folder = folders.find(f => f.id === canvas.folder_id)
            const showFolderTag = !selectedFolderId && (canvas.folder_id || !folder)
            
            return (
              <div
                key={canvas.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-move relative"
                draggable
                onDragStart={() => handleDragStart(canvas.id)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  handleContextMenu(e, canvas.id)
                }}
              >
                {showFolderTag && (
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      folder 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d={folder 
                            ? "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" 
                            : "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          } 
                        />
                      </svg>
                      {folder ? folder.name : 'Uncategorized'}
                    </span>
                  </div>
                )}
                
                {/* Share button */}
                <div className="absolute top-3 left-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyShareLink(canvas.id)
                    }}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      copiedCanvasId === canvas.id 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600'
                    }`}
                    title={copiedCanvasId === canvas.id ? 'Link copied!' : 'Copy share link'}
                  >
                    {copiedCanvasId === canvas.id ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Canvas content - clickable area */}
                <Link 
                  href={`/canvas/${canvas.id}`}
                  className="block"
                  onClick={(e) => {
                    // Prevent navigation if right-clicking
                    if (e.button === 2) {
                      e.preventDefault()
                    }
                  }}
                >
                  <h2 className="text-xl font-semibold mb-2 pr-24 pl-12">{canvas.name}</h2>
                  {canvas.description && (
                    <p className="text-gray-600 mb-4 pl-12">{canvas.description}</p>
                  )}
                  <p className="text-sm text-gray-500 pl-12">
                    Created {new Date(canvas.created_at).toLocaleDateString()}
                  </p>
                </Link>
              </div>
            )
          })}
        </div>

        {filteredCanvases.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'No canvases found matching your search.' : 'No canvases in this folder.'}
            </p>
            <Link
              href="/canvas/new"
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Create a new canvas
            </Link>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              deleteCanvas(contextMenu.canvasId)
              setContextMenu(null)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Canvas
          </button>
        </div>
      )}

      {/* AI Mind Map Modal */}
      <AIMindMapModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        selectedFolderId={selectedFolderId}
      />
    </div>
  )
}