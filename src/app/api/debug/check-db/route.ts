import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Try to query user_settings table
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)

    // Check if we can query the table at all
    const { data: allSettings, error: allError } = await supabase
      .from('user_settings')
      .select('count')
      .limit(1)

    return NextResponse.json({
      user_id: user.id,
      settings_query: {
        data: settings,
        error: settingsError
      },
      table_exists_check: {
        data: allSettings,
        error: allError
      },
      debug_info: {
        settings_error_code: settingsError?.code,
        settings_error_message: settingsError?.message,
        all_error_code: allError?.code,
        all_error_message: allError?.message,
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}