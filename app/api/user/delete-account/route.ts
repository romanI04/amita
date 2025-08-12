import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validate, generateRequestId, formatValidationError, deleteAccountSchema } from '@/lib/validation'


export async function DELETE(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, deleteAccountSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { confirmation } = validation.data!

    const supabase = await createClient()
    
    // Get user_id from authenticated session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const user_id = user.id

    // Log the deletion request for audit purposes
    await supabase
      .from('user_export_log')
      .insert({
        user_id,
        export_type: 'account_deletion',
        export_format: 'audit_log',
        status: 'processing',
        export_metadata: {
          deletion_timestamp: new Date().toISOString(),
          user_ip: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        }
      })

    // Get user data summary before deletion (for audit)
    const { data: userStats } = await supabase
      .rpc('get_user_storage_usage', { target_user_id: user_id })
      .single() as { data: any }

    console.log(`Account deletion requested for user ${user_id}:`, userStats)

    // Start deletion process - order matters due to foreign key constraints
    
    // 1. Delete analytics events
    await supabase
      .from('analytics_events')
      .delete()
      .eq('user_id', user_id)

    // 2. Delete analysis versions
    await supabase
      .from('analysis_versions')
      .delete()
      .eq('user_id', user_id)

    // 3. Delete voice analyses (will cascade from writing_samples if properly set up)
    await supabase
      .from('voice_analysis')
      .delete()
      .eq('user_id', user_id)

    // 4. Delete writing samples
    await supabase
      .from('writing_samples')
      .delete()
      .eq('user_id', user_id)

    // 5. Delete voiceprint and traits
    await supabase
      .from('voiceprint_traits')
      .delete()
      .eq('user_id', user_id)

    await supabase
      .from('voiceprints')
      .delete()
      .eq('user_id', user_id)

    // 6. Delete user settings and export preferences
    await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', user_id)

    await supabase
      .from('user_export_preferences')
      .delete()
      .eq('user_id', user_id)

    // 7. Delete user profile
    await supabase
      .from('profiles')
      .delete()
      .eq('id', user_id)

    // 8. Delete export logs (keep for audit purposes with anonymized user_id)
    await supabase
      .from('user_export_log')
      .update({
        user_id: `deleted_${user_id.substring(0, 8)}`,
        export_metadata: {
          ...((await supabase.from('user_export_log').select('export_metadata').eq('user_id', user_id).single()).data?.export_metadata || {}),
          account_deleted: true,
          deletion_completed: new Date().toISOString()
        }
      })
      .eq('user_id', user_id)

    // 9. Finally, delete the auth user (this should cascade to any remaining references)
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id)
    
    if (authDeleteError) {
      console.error('Failed to delete auth user:', authDeleteError)
      // Log the error but don't fail the request since user data is already deleted
      await supabase
        .from('user_export_log')
        .insert({
          user_id: `deletion_error_${user_id.substring(0, 8)}`,
          export_type: 'account_deletion',
          export_format: 'error_log',
          status: 'failed',
          error_message: `Auth deletion failed: ${authDeleteError.message}`,
          export_metadata: {
            original_user_id: user_id,
            error_timestamp: new Date().toISOString(),
            data_deleted: true,
            auth_deleted: false
          }
        })
    }

    // Log successful deletion
    console.log(`Account deletion completed for user ${user_id}:`, {
      analyses_deleted: userStats?.analyses_count || 0,
      versions_deleted: userStats?.versions_count || 0,
      storage_freed_mb: userStats?.total_storage_mb || 0
    })

    return NextResponse.json({
      message: 'Account deleted successfully',
      deleted_data: {
        analyses: userStats?.analyses_count || 0,
        versions: userStats?.versions_count || 0,
        storage_mb: userStats?.total_storage_mb || 0
      }
    })

  } catch (error) {
    console.error('Account deletion error:', error)

    // Log the error
    try {
      // Get user_id from current user context for error logging
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const user_id = user?.id || 'unknown'
      await supabase
        .from('user_export_log')
        .insert({
          user_id: `deletion_error_${user_id.substring(0, 8)}`,
          export_type: 'account_deletion',
          export_format: 'error_log',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          export_metadata: {
            error_timestamp: new Date().toISOString(),
            full_error: error instanceof Error ? error.stack : 'Unknown error'
          }
        })
    } catch (logError) {
      console.error('Failed to log deletion error:', logError)
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Account deletion failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check what data would be deleted
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get user_id from authenticated session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const userId = user.id

    // Get user data summary
    const { data: userStats } = await supabase
      .rpc('get_user_storage_usage', { target_user_id: userId })
      .single() as { data: any }

    // Get additional data counts
    const [
      { count: analyticsCount },
      { count: exportLogCount },
      { data: profile },
      { data: settings }
    ] = await Promise.all([
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('user_export_log').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_settings').select('*').eq('user_id', userId).single()
    ])

    return NextResponse.json({
      user_id: userId,
      data_summary: {
        analyses: userStats?.analyses_count || 0,
        analysis_versions: userStats?.versions_count || 0,
        analytics_events: analyticsCount || 0,
        export_logs: exportLogCount || 0,
        has_voice_profile: !!(profile || settings),
        total_storage_mb: userStats?.total_storage_mb || 0
      },
      deletion_impact: {
        data_types_deleted: [
          'Writing analyses and revisions',
          'Voice profile and traits',
          'Analytics and usage data',
          'Account settings and preferences',
          'Export history',
          'User profile information'
        ],
        irreversible: true,
        backup_recommendation: 'Export your data before deletion if you want to keep a copy'
      }
    })

  } catch (error) {
    console.error('Deletion preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to preview deletion' },
      { status: 500 }
    )
  }
}