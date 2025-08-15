import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sample_id, title, content, description, changes_applied, risk_score, authenticity_score } = body
    
    // Validate required fields
    if (!sample_id || !content) {
      return NextResponse.json(
        { error: 'Sample ID and content are required' },
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
    
    // Get the current version number for this sample
    const { data: existingVersions } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('sample_id', sample_id)
      .order('version_number', { ascending: false })
      .limit(1)
    
    const nextVersionNumber = existingVersions && existingVersions.length > 0 
      ? existingVersions[0].version_number + 1 
      : 1
    
    // Set all versions for this sample to not current
    await supabase
      .from('document_versions')
      .update({ is_current: false })
      .eq('sample_id', sample_id)
    
    // Create the new version
    const { data: version, error: versionError } = await supabase
      .from('document_versions')
      .insert({
        user_id: user.id,
        sample_id,
        version_number: nextVersionNumber,
        title: title || `Version ${nextVersionNumber}`,
        content,
        description,
        changes_applied,
        risk_score,
        authenticity_score,
        is_current: true
      })
      .select()
      .single()
    
    if (versionError) {
      console.error('Error creating version:', versionError)
      return NextResponse.json(
        { error: 'Failed to save version' },
        { status: 500 }
      )
    }
    
    // Log the activity
    await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        sample_id,
        version_id: version.id,
        action_type: 'saved_version',
        action_details: {
          version_number: nextVersionNumber,
          description,
          changes_count: changes_applied?.length || 0
        }
      })
    
    // Update the writing sample with new content
    await supabase
      .from('writing_samples')
      .update({
        content,
        ai_confidence_score: risk_score,
        authenticity_score: authenticity_score,
        updated_at: new Date().toISOString()
      })
      .eq('id', sample_id)
    
    return NextResponse.json({
      success: true,
      version,
      message: `Version ${nextVersionNumber} saved successfully`
    })
    
  } catch (error) {
    console.error('Version save error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}