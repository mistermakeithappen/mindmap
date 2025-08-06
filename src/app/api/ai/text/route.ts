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
    const { data: settings } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single()

    if (!settings?.openai_api_key) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured. Please add your API key in settings.' 
      }, { status: 400 })
    }

    // Get request body
    const { text, action, context } = await request.json()

    if (!text && action !== 'generate') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Prepare system message based on action
    let systemMessage = ''
    let userMessage = ''

    switch (action) {
      case 'improve':
        systemMessage = 'You are a helpful writing assistant. Improve the following text while maintaining its core meaning and tone. Make it clearer, more concise, and more engaging.'
        userMessage = text
        break
      
      case 'expand':
        systemMessage = 'You are a helpful writing assistant. Expand the following text with more detail and context while maintaining the original tone and intent.'
        userMessage = text
        break
      
      case 'summarize':
        systemMessage = 'You are a helpful writing assistant. Summarize the following text concisely while preserving the key points.'
        userMessage = text
        break
      
      case 'fix-grammar':
        systemMessage = 'You are a grammar and spelling checker. Fix any grammatical errors, spelling mistakes, and punctuation issues in the following text. Only make necessary corrections.'
        userMessage = text
        break
      
      case 'generate':
        systemMessage = 'You are a helpful writing assistant. Generate text based on the following prompt or context.'
        userMessage = context || 'Write something interesting and relevant.'
        break
      
      case 'make-professional':
        systemMessage = 'You are a professional writing assistant. Rewrite the following text in a more professional and formal tone suitable for business communication.'
        userMessage = text
        break
      
      case 'make-casual':
        systemMessage = 'You are a friendly writing assistant. Rewrite the following text in a more casual and conversational tone.'
        userMessage = text
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to process text' 
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Return the generated/improved text
    return NextResponse.json({ 
      text: data.choices[0].message.content,
      usage: data.usage
    })

  } catch (error) {
    console.error('Error processing text:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}