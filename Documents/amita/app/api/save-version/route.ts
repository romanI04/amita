import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'

export async function POST(request: NextRequest) {
  try {
    const { user_id, title, original_text, revised_text, applied_changes, analysis_data } = await request.json()
    
    // Validate input
    if (!user_id || !original_text) {
      return NextResponse.json(
        { error: 'User ID and original text are required' }, 
        { status: 400 }
      )
    }
    
    // Get session for authentication
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user || session.user.id !== user_id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    try {
      // Save version to database using direct API
      const versionData = {
        user_id,
        title: title || 'Untitled Analysis',
        original_text,
        revised_text: revised_text || original_text,
        applied_changes: applied_changes || 0,
        analysis_data: analysis_data ? JSON.stringify(analysis_data) : null,
        created_at: new Date().toISOString()
      }
      
      const savedVersion = await directInsert('analysis_versions', versionData, {
        accessToken: session.access_token
      })
      
      return NextResponse.json({
        id: savedVersion.data?.id || null,
        message: 'Version saved successfully'
      })
      
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save to database' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Save version API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}