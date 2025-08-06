import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's API key
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check if table exists (migration not run)
    if (settingsError) {
      console.error('Settings error:', settingsError)
      if (settingsError.code === '42P01' || settingsError.code === 'PGRST204') {
        return NextResponse.json({ 
          error: 'Database not configured. Please run the user_settings migration in Supabase.' 
        }, { status: 500 })
      }
    }

    if (!settings?.openai_api_key) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add your API key in settings.' 
      }, { status: 400 })
    }

    // Get request body
    const { prompt, size = '1024x1024', quality = 'standard' } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to generate image' 
      }, { status: response.status })
    }

    const data = await response.json()
    const imageUrl = data.data[0].url
    const revisedPrompt = data.data[0].revised_prompt
    
    // Download the image from OpenAI
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image')
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' })
    
    // Upload to Supabase storage
    const fileName = `ai-generated-${Date.now()}.png`
    const filePath = `${user.id}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('canvas-files')
      .upload(filePath, imageBlob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error('Failed to upload image to storage')
    }
    
    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('canvas-files')
      .getPublicUrl(filePath)
    
    // Return the Supabase storage URL instead of OpenAI URL
    return NextResponse.json({ 
      url: publicUrl,
      revised_prompt: revisedPrompt 
    })

  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}