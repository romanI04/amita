import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validate, generateRequestId, formatValidationError, validateNestedObject, userSettingsSchema, userSettingsObjectSchema } from '@/lib/validation'

// GET user settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify authentication using getUser() for security
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Try to fetch existing settings
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    // If no settings exist, create default ones
    if (!existingSettings) {
      const defaultSettings = {
        user_id: userId,
        default_domain: 'General',
        auto_save_analyses: true,
        show_improvement_tips: true,
        enable_voice_notifications: true,
        data_retention_days: 365,
        allow_analytics_tracking: true,
        anonymize_exports: false,
        default_export_format: 'pdf',
        include_versions_in_export: true,
        include_metadata_in_export: false,
        email_notifications: true,
        analysis_completion_notifications: true,
        weekly_progress_reports: false,
        feature_announcements: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert(defaultSettings)
        .select()
        .single()

      if (insertError) {
        console.error('Error creating default settings:', insertError)
        return NextResponse.json({ settings: defaultSettings })
      }

      return NextResponse.json({ settings: newSettings })
    }

    return NextResponse.json({ settings: existingSettings })

  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT/UPDATE user settings
export async function PUT(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, userSettingsSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { settings } = validation.data!
    
    // Validate nested settings object
    const settingsValidation = validateNestedObject(settings, userSettingsObjectSchema, 'settings', requestId)
    if (!settingsValidation.success) {
      return NextResponse.json(
        formatValidationError(settingsValidation.error!, requestId),
        { status: 400 }
      )
    }

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

    // Update settings
    const settingsData = {
      ...settings,
      user_id,
      updated_at: new Date().toISOString()
    }

    // Remove fields that shouldn't be in the database
    delete settingsData.full_name
    delete settingsData.email
    delete settingsData.writing_level

    const { data: updatedSettings, error: updateError } = await supabase
      .from('user_settings')
      .upsert(settingsData)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update settings: ${updateError.message}`)
    }

    return NextResponse.json({ 
      settings: updatedSettings,
      message: 'Settings updated successfully'
    })

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}

// DELETE user settings (reset to defaults)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify authentication using getUser() for security
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Delete existing settings
    const { error: deleteError } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)

    if (deleteError) {
      throw new Error(`Failed to reset settings: ${deleteError.message}`)
    }

    return NextResponse.json({ 
      message: 'Settings reset to defaults successfully'
    })

  } catch (error) {
    console.error('Settings reset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset settings' },
      { status: 500 }
    )
  }
}