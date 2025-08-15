import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sample_id = searchParams.get('sample_id')
    
    if (!sample_id) {
      return NextResponse.json(
        { error: 'Sample ID is required' },
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
    
    // Get all versions for this sample
    const { data: versions, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('sample_id', sample_id)
      .eq('user_id', user.id)
      .order('version_number', { ascending: false })
    
    if (error) {
      console.error('Error fetching versions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch versions' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      versions: versions || [],
      count: versions?.length || 0
    })
    
  } catch (error) {
    console.error('Version list error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}