import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's OpenAI API key
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single()

    if (settingsError || !settings?.openai_api_key) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add your API key in settings.' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: settings.openai_api_key,
    })

    const { content, title } = await request.json()

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Check if content appears to be console logs or error messages
    const consoleLogPatterns = [
      /Failed to load resource/gi,
      /console\.(log|error|warn)/gi,
      /react-dom.*\.js:\d+/gi,
      /Uncaught Error/gi,
      /npm ERR!/gi,
      /node_modules/gi,
      /webpack/gi,
      /Failed to compile/gi,
      /SyntaxError/gi,
      /TypeError/gi,
      /Saving nodes: Array/gi,
      /Saving edges: Array/gi
    ]

    const isLikelyConsoleLog = consoleLogPatterns.some(pattern => pattern.test(content))
    const errorLineCount = (content.match(/error|failed|exception/gi) || []).length
    const totalLines = content.split('\n').length
    
    if (isLikelyConsoleLog || (errorLineCount > totalLines * 0.3)) {
      return NextResponse.json({ 
        error: 'The content appears to be console logs or error messages. Please paste the actual conversation or document content instead.' 
      }, { status: 400 })
    }

    // STAGE 1: Extract Headlines/Chapters
    console.log('Stage 1: Extracting main headlines...')
    const headlinesExtraction = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying the main topics and chapters in conversations and documents.
          
          Your task is to extract the MAIN HEADLINES or CHAPTERS - the big topics that were discussed.
          Think of these as chapter titles in a book about this conversation.
          
          Guidelines:
          - Extract 3-7 main headlines
          - Each headline should be specific and descriptive
          - Use the actual terminology from the conversation
          - Order them as they appear or by importance
          
          Return JSON:
          {
            "centralTheme": "One sentence describing what this entire conversation is about",
            "headlines": [
              {
                "id": "headline_1",
                "title": "Specific, descriptive headline",
                "order": 1,
                "summary": "One sentence about what this section covers"
              }
            ]
          }`
        },
        {
          role: "user",
          content: `Extract the main headlines/chapters from this content:\n\n${content}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    })

    const headlines = JSON.parse(headlinesExtraction.choices[0].message.content || '{}')

    // STAGE 2: Extract Sections for Each Headline (CONCURRENTLY)
    console.log('Stage 2: Extracting sections for each headline...')
    
    // Process all headlines concurrently
    const sectionPromises = (headlines.headlines || []).map(async (headline: any) => {
      const sectionExtraction = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analyzing the section "${headline.title}" from a larger conversation.
            
            Extract the KEY SECTIONS or SUBTOPICS within this main topic.
            Think of these as the main points discussed under this headline.
            
            Guidelines:
            - Extract 2-6 key sections
            - Each section should be a distinct subtopic or point
            - Be specific - use actual terms and concepts mentioned
            - Include brief context for each section
            
            Return JSON:
            {
              "headlineId": "${headline.id}",
              "sections": [
                {
                  "id": "section_1",
                  "title": "Specific section title",
                  "context": "Brief description of what this section covers",
                  "hasDetails": true
                }
              ]
            }`
          },
          {
            role: "user",
            content: `Find all sections related to "${headline.title}" in this content:\n\n${content}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      })
      
      const sections = JSON.parse(sectionExtraction.choices[0].message.content || '{}')
      return {
        ...headline,
        sections: sections.sections || []
      }
    })
    
    const headlineDetails = await Promise.all(sectionPromises)

    // STAGE 3: Extract Supporting Points for Each Section (CONCURRENTLY)
    console.log('Stage 3: Extracting supporting points...')
    
    // Create all detail extraction promises concurrently
    const detailPromises = []
    const sectionMap = new Map()
    
    for (const headline of headlineDetails) {
      for (const section of headline.sections) {
        const detailPromise = openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are extracting detailed information for the section "${section.title}" under the headline "${headline.title}".
              
              Extract ALL supporting points, details, and information for this specific section.
              
              Include:
              - Key points and arguments
              - Specific examples mentioned
              - Data, numbers, or metrics
              - Quotes or important statements
              - Action items or recommendations
              - Any other relevant details
              
              Be comprehensive - don't miss anything related to this section.
              
              Return JSON:
              {
                "sectionId": "${section.id}",
                "details": {
                  "keyPoints": ["Point 1", "Point 2"],
                  "examples": ["Example 1", "Example 2"],
                  "data": ["Data point 1", "Data point 2"],
                  "quotes": [{"text": "Quote", "speaker": "Who said it"}],
                  "actionItems": ["Action 1", "Action 2"],
                  "additionalDetails": ["Detail 1", "Detail 2"]
                }
              }`
            },
            {
              role: "user",
              content: `Extract all details for "${section.title}" (under "${headline.title}") from this content:\n\n${content}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 2500
        }).then(response => {
          const details = JSON.parse(response.choices[0].message.content || '{}')
          return {
            headlineId: headline.id,
            section: {
              ...section,
              details: details.details || {}
            }
          }
        })
        
        detailPromises.push(detailPromise)
        sectionMap.set(section.id, { headlineId: headline.id, section })
      }
    }
    
    // Wait for all detail extractions to complete
    const allSectionDetails = await Promise.all(detailPromises)
    
    // Reconstruct the complete structure
    const completeStructure = headlineDetails.map((headline: any) => {
      const sectionsWithDetails = headline.sections.map((section: any) => {
        const sectionDetail = allSectionDetails.find((detail: any) => 
          detail.headlineId === headline.id && detail.section.id === section.id
        )
        return sectionDetail ? sectionDetail.section : section
      })
      
      return {
        ...headline,
        sections: sectionsWithDetails
      }
    })

    // STAGE 4 & 5: Extract Cross-Cutting Elements and Layout (CONCURRENTLY)
    console.log('Stage 4 & 5: Extracting cross-cutting insights and determining layout...')
    
    const [crossCuttingExtraction, layoutAnalysis] = await Promise.all([
      // Cross-cutting analysis
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are identifying insights, patterns, and connections that span across multiple topics in the conversation.
            
            Extract:
            1. KEY INSIGHTS - Important realizations or learnings that apply broadly
            2. OVERARCHING THEMES - Patterns that appear across different sections
            3. CONNECTIONS - How different topics relate to each other
            4. GLOBAL ACTION ITEMS - Things to do that aren't tied to one section
            5. IMPORTANT CONTEXT - Background info, participants, setting
            
            These should be things that don't belong to just one section but are important to the whole conversation.
            
            Return JSON:
            {
              "insights": [
                {
                  "text": "The insight",
                  "importance": "high/medium/low",
                  "relatedHeadlines": ["headline_id1", "headline_id2"]
                }
              ],
              "themes": [
                {
                  "name": "Theme name",
                  "description": "How this theme appears throughout"
                }
              ],
              "connections": [
                {
                  "from": "headline_id or section_id",
                  "to": "headline_id or section_id",
                  "relationship": "How they connect"
                }
              ],
              "globalActions": [
                {
                  "action": "What to do",
                  "priority": "high/medium/low",
                  "context": "Why this is important"
                }
              ],
              "context": {
                "participants": ["Name 1", "Name 2"],
                "setting": "Where/when this took place",
                "purpose": "Why this conversation happened"
              }
            }`
          },
          {
            role: "user",
            content: `Identify cross-cutting elements from this conversation. Here are the main topics identified: ${JSON.stringify(headlines.headlines.map((h: any) => h.title))}\n\nFull content:\n${content}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      }),
      
      // Layout analysis
      openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Based on the extracted structure, determine the optimal mind map layout.
            
            Consider:
            - Number of main headlines: ${completeStructure.length}
            - Total sections: ${completeStructure.reduce((sum, h) => sum + h.sections.length, 0)}
            - Depth of detail
            - Presence of potential cross-cutting themes
            
            Return JSON:
            {
              "primaryLayout": "radial" | "tree" | "organic" | "timeline",
              "reasoning": "Why this layout works best",
              "layoutRules": {
                "headlinePlacement": "circular" | "horizontal" | "vertical" | "chronological",
                "sectionArrangement": "hierarchical" | "radial" | "grouped",
                "detailsDisplay": "nested" | "satellite" | "expandable",
                "connectionStyle": "direct" | "curved" | "minimal",
                "emphasis": ["hierarchy", "connections", "chronology", "themes"]
              }
            }`
          },
          {
            role: "user",
            content: `Determine layout for this structure: ${JSON.stringify({
              headlines: completeStructure.length,
              sections: completeStructure.map(h => h.sections.length),
              estimatedConnections: true
            })}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500
      })
    ])

    const crossCutting = JSON.parse(crossCuttingExtraction.choices[0].message.content || '{}')
    const layout = JSON.parse(layoutAnalysis.choices[0].message.content || '{}')

    // Compile the complete analysis
    const comprehensiveAnalysis = {
      metadata: {
        title: title || headlines.centralTheme || 'Untitled',
        centralTheme: headlines.centralTheme,
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        analysisStages: 5,
        extractedElements: {
          headlines: completeStructure.length,
          sections: completeStructure.reduce((sum: number, h: any) => sum + h.sections.length, 0),
          totalPoints: completeStructure.reduce((sum: number, h: any) => 
            sum + h.sections.reduce((sSum: number, s: any) => 
              sSum + (s.details?.keyPoints?.length || 0), 0), 0)
        }
      },
      structure: {
        headlines: completeStructure,
        crossCutting: crossCutting
      },
      layout: layout
    }

    return NextResponse.json(comprehensiveAnalysis)
  } catch (error) {
    console.error('Content analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    )
  }
}