import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { version_id, sample_id } = body
    
    if (!version_id || !sample_id) {
      return NextResponse.json(
        { error: 'Version ID and Sample ID are required' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Get the version to restore
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .select('*')
      .eq('id', version_id)
      .eq('user_id', user.id)
      .single()
    
    if (versionError || !version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }
    
    // Update all versions to not current
    await supabase
      .from('document_versions')
      .update({ is_current: false })
      .eq('sample_id', sample_id)
    
    // Mark this version as current
    await supabase
      .from('document_versions')
      .update({ is_current: true })
      .eq('id', version_id)
    
    // Update the writing sample with the restored content
    const { error: updateError } = await supabase
      .from('writing_samples')
      .update({
        content: version.content,
        ai_confidence_score: version.risk_score,
        authenticity_score: version.authenticity_score,
        updated_at: new Date().toISOString()
      })
      .eq('id', sample_id)
    
    if (updateError) {
      console.error('Error updating sample:', updateError)
      return NextResponse.json(
        { error: 'Failed to restore version' },
        { status: 500 }
      )
    }
    
    // Log the activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        sample_id,
        version_id,
        action_type: 'restored_version',
        action_details: {
          version_number: version.version_number,
          restored_from: version.created_at
        }
      })
    
    return NextResponse.json({
      success: true,
      version,
      message: `Restored to Version ${version.version_number}`
    })
    
  } catch (error) {
    console.error('Version restore error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}