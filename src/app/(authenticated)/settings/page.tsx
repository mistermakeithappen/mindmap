'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('openai_api_key')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        // 42P01 = undefined_table, meaning migration hasn't been run
        if (error.code === '42P01') {
          console.error('user_settings table does not exist. Migration needs to be run.')
          setMessage({ type: 'error', text: 'Database not configured. Please run the user_settings migration in Supabase.' })
        } else if (error.code !== 'PGRST116') {
          console.error('Error loading settings:', error)
          setMessage({ type: 'error', text: 'Failed to load settings' })
        }
      } else if (data) {
        setApiKey(data.openai_api_key || '')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          openai_api_key: apiKey || null,
        }, {
          onConflict: 'user_id'
        })

      if (error) {
        console.error('Error saving settings:', error)
        setMessage({ type: 'error', text: 'Failed to save settings' })
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully!' })
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

          <div className="space-y-6">
            {/* OpenAI API Key Section */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Features</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add your OpenAI API key to unlock AI-powered features like image generation, text improvements, and creating mind maps from conversations.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Your API key is encrypted and stored securely. Get your API key from{' '}
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      OpenAI Platform
                    </a>
                  </p>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>

            {/* Feature Status */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Available AI Features</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">AI Image Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">Text Generation & Improvement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">Smart Writing Assistance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-600">Create MindMap from Conversations (GPT-4o)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}