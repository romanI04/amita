import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'
import { validate, generateRequestId, formatValidationError, saveVersionSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, saveVersionSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { title, original_text, revised_text, applied_changes, analysis_data } = validation.data!
    
    // Get user_id from authenticated session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const user_id = user.id
    
    // Get session for RLS operations
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
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