import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sample_id, action_type, action_details, request_id } = body
    
    if (!action_type) {
      return NextResponse.json(
        { error: 'Action type is required' },
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
    
    // Create activity log entry
    const { data: activity, error } = await supabase
      .from('activity_log')
      .insert({
        user_id: user.id,
        sample_id,
        action_type,
        action_details,
        request_id
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error creating activity log:', error)
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      activity
    })
    
  } catch (error) {
    console.error('Activity log error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sample_id = searchParams.get('sample_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Build query
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (sample_id) {
      query = query.eq('sample_id', sample_id)
    }
    
    const { data: activities, error, count } = await query
    
    if (error) {
      console.error('Error fetching activity log:', error)
      return NextResponse.json(
        { error: 'Failed to fetch activity log' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      activities: activities || [],
      total: count || 0,
      limit,
      offset
    })
    
  } catch (error) {
    console.error('Activity log fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}