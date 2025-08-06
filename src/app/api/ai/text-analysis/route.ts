import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'

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

    const openai = new OpenAI({
      apiKey: settings.openai_api_key,
    })

    // Get request body
    const { text, instructions } = await request.json()

    if (!text || !instructions) {
      return NextResponse.json({ 
        error: 'Both text and instructions are required' 
      }, { status: 400 })
    }

    // Call OpenAI API to analyze text and generate options
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes text and generates multiple options based on user instructions.
          
          Your task:
          1. Analyze the provided text
          2. Follow the user's custom instructions
          3. Generate 3-5 different options/variations
          4. Each option should be distinct and valuable
          
          Return your response in JSON format:
          {
            "analysis": "Brief analysis of the original text",
            "options": [
              {
                "title": "Short descriptive title for this option",
                "content": "The generated content",
                "reasoning": "Why this option might be useful"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Text to analyze: "${text}"
          
          Instructions: ${instructions}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2000,
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error analyzing text:', error)
    return NextResponse.json({ 
      error: 'Failed to analyze text. Please try again.' 
    }, { status: 500 })
  }
}