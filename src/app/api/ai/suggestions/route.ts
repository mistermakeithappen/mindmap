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
    const { text, instructions } = await request.json()

    if (!instructions) {
      return NextResponse.json({ error: 'Instructions are required' }, { status: 400 })
    }

    // Create system message for generating suggestions
    const systemMessage = `You are a helpful writing assistant. The user will provide some text (which may be empty) and instructions for how they want to modify or create text.

Your task is to generate 3 different suggestions that follow the user's instructions. Each suggestion should be a complete piece of text that could replace the current text.

Return your response as a JSON object with a "suggestions" key containing an array of exactly 3 objects, each containing:
- "suggestion": the suggested text
- "explanation": a brief explanation of what changes were made or why this suggestion was created (1-2 sentences)

Example format:
{
  "suggestions": [
    {
      "suggestion": "Your suggested text here",
      "explanation": "This version emphasizes clarity and conciseness."
    },
    {
      "suggestion": "Another suggested text",
      "explanation": "This approach takes a more formal tone."
    },
    {
      "suggestion": "Third suggested text",
      "explanation": "This option adds more detail and context."
    }
  ]
}`

    const userMessage = `Current text: "${text || '[Empty - please create new text]'}"

Instructions: ${instructions}`

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
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI API error:', error)
      return NextResponse.json({ 
        error: error.error?.message || 'Failed to generate suggestions' 
      }, { status: response.status })
    }

    const data = await response.json()
    
    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(data.choices[0].message.content)
      
      // Extract suggestions array from the response
      const suggestions = parsedResponse.suggestions || parsedResponse
      
      // Ensure we have an array with suggestions
      if (!Array.isArray(suggestions)) {
        throw new Error('Invalid response format')
      }
      
      return NextResponse.json({ suggestions })
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return NextResponse.json({ 
        error: 'Failed to parse AI suggestions' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}