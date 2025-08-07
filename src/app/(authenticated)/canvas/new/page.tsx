'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface Folder {
  id: string
  name: string
  color: string
}

export default function NewCanvas() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [folderId, setFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const loadFolders = useCallback(async () => {
    const { data } = await supabase
      .from('folders')
      .select('*')
      .order('name')
    
    if (data) {
      setFolders(data)
    }
  }, [supabase])

  useEffect(() => {
    loadFolders()
    }, [loadFolders])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Get user data
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // First check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle()

      let organizationId = profile?.organization_id

      // If no organization exists, we'll create the canvas without organization
      // The dashboard will handle organization creation
      
      // Create canvas
      const { data: canvas, error: canvasError } = await supabase
        .from('canvases')
        .insert({
          name,
          description: description || null,
          organization_id: organizationId || null,
          created_by: user.id,
          user_id: user.id, // Add user_id field for RLS policy
          folder_id: folderId
        })
        .select()
        .single()

      if (canvasError) throw canvasError

      router.push(`/canvas/${canvas.id}`)
    } catch (err: any) {
      console.error('Canvas creation error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Canvas</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Canvas Name
            </label>
            <input
              type="text"
              id="name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Thought Map"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your canvas..."
            />
          </div>

          <div>
            <label htmlFor="folder" className="block text-sm font-medium text-gray-700">
              Folder (optional)
            </label>
            <select
              id="folder"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
            >
              <option value="">No folder (root)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Canvas'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}