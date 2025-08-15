import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validate, generateRequestId, formatValidationError, userHistoryQuerySchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sample_id: searchParams.get('sample_id'),
      search: searchParams.get('search'),
      date_range: searchParams.get('date_range'),
      edited: searchParams.get('edited'),
      risk_level: searchParams.get('risk_level'),
      sort_by: searchParams.get('sort_by'),
      order: searchParams.get('order')
    }
    
    // Validate query parameters
    const queryValidation = validate(queryParams, userHistoryQuerySchema, requestId)
    if (!queryValidation.success) {
      return NextResponse.json(
        formatValidationError(queryValidation.error!, requestId),
        { status: 400 }
      )
    }
    
    const limit = Math.min(parseInt(queryParams.limit || '50'), 100) // Cap at 100
    const offset = parseInt(queryParams.offset || '0')

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

    // First get total count for pagination
    const { count: totalCount } = await supabase
      .from('writing_samples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    // Check if we're fetching a specific sample
    let query = supabase
      .from('writing_samples')
      .select(`
        *,
        voice_analysis (
          id,
          overall_score,
          ai_detected_sections,
          improvement_suggestions,
          style_characteristics,
          created_at
        )
      `)
      .eq('user_id', userId)
    
    // Apply search filter
    if (queryParams.search) {
      query = query.or(`title.ilike.%${queryParams.search}%,content.ilike.%${queryParams.search}%`)
    }
    
    // Apply date range filter
    if (queryParams.date_range && queryParams.date_range !== 'all') {
      const now = new Date()
      let startDate: Date
      
      switch (queryParams.date_range) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        default:
          startDate = new Date(0)
      }
      
      query = query.gte('created_at', startDate.toISOString())
    }
    
    // Apply edited filter
    // Note: This is a simplified check - ideally we'd compare timestamps
    if (queryParams.edited === 'edited') {
      query = query.not('updated_at', 'is', null)
    } else if (queryParams.edited === 'unedited') {
      // For unedited, we check if content hasn't changed significantly
      // This is a simplified approach
    }
    
    // Apply risk level filter
    if (queryParams.risk_level && queryParams.risk_level !== 'all') {
      switch (queryParams.risk_level) {
        case 'low':
          query = query.lte('ai_confidence_score', 30)
          break
        case 'medium':
          query = query.gt('ai_confidence_score', 30).lte('ai_confidence_score', 60)
          break
        case 'high':
          query = query.gt('ai_confidence_score', 60)
          break
      }
    }
    
    // Apply sorting
    const sortBy = queryParams.sort_by || 'created_at'
    const order = queryParams.order === 'asc' ? true : false
    
    const sortMap: Record<string, string> = {
      'date': 'created_at',
      'risk': 'ai_confidence_score',
      'authenticity': 'authenticity_score'
    }
    
    const sortColumn = sortMap[sortBy] || sortBy
    
    // If sample_id is provided, fetch only that sample
    if (queryParams.sample_id) {
      query = query.eq('id', queryParams.sample_id)
    } else {
      // Otherwise, use pagination
      query = query
        .order(sortColumn, { ascending: order })
        .range(offset, offset + limit - 1)
    }
    
    const { data: samples, error: samplesError } = await query

    if (samplesError) {
      throw new Error(`Database query failed: ${samplesError.message}`)
    }

    // Enhance samples with additional metadata
    const enrichedSamples = samples?.map(sample => {
      const analysis = sample.voice_analysis?.[0] // Get latest analysis
      
      // Calculate word count
      const wordCount = sample.content ? sample.content.trim().split(/\s+/).length : 0
      
      // Check if document has been edited (simplified check)
      const hasBeenEdited = sample.updated_at && sample.updated_at !== sample.created_at
      
      return {
        ...sample,
        word_count: wordCount,
        has_versions: false, // Will be true when document_versions table is created
        version_count: 1,
        last_edited: hasBeenEdited ? sample.updated_at : null,
        total_changes: 0, // Will be populated when versioning is implemented
        improvement_percentage: 0, // Will be calculated when versions exist
        // Ensure we have fallback values
        ai_confidence_score: sample.ai_confidence_score || analysis?.overall_score?.ai_likelihood || 0,
        authenticity_score: sample.authenticity_score || analysis?.overall_score?.authenticity || 0
      }
    }) || []

    // Get summary statistics
    const totalSamples = enrichedSamples.length
    const averageAuthenticity = totalSamples > 0 
      ? enrichedSamples.reduce((sum, s) => sum + (s.authenticity_score || 0), 0) / totalSamples
      : 0
    const averageAiRisk = totalSamples > 0
      ? enrichedSamples.reduce((sum, s) => sum + (s.ai_confidence_score || 0), 0) / totalSamples
      : 0

    return NextResponse.json({
      analyses: enrichedSamples,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        has_more: (totalCount || 0) > offset + limit
      },
      summary: {
        total_samples: totalCount || 0,
        page_samples: totalSamples,
        average_authenticity: Math.round(averageAuthenticity),
        average_ai_risk: Math.round(averageAiRisk),
        total_words: enrichedSamples.reduce((sum, s) => sum + (s.content?.length || 0), 0),
        total_improvements: enrichedSamples.reduce((sum, s) => sum + (s.total_changes || 0), 0)
      }
    })

  } catch (error) {
    console.error('History API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST endpoint for creating analysis versions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis_id, version_data } = body

    if (!analysis_id || !version_data) {
      return NextResponse.json(
        { error: 'Analysis ID and version data are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Verify authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user owns this analysis
    const { data: analysis } = await supabase
      .from('writing_samples')
      .select('user_id')
      .eq('id', analysis_id)
      .single()

    if (!analysis || analysis.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Analysis not found or access denied' },
        { status: 404 }
      )
    }

    // Get the next version number
    const { data: existingVersions } = await supabase
      .from('analysis_versions')
      .select('version')
      .eq('analysis_id', analysis_id)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = (existingVersions?.[0]?.version || 0) + 1

    // Insert new version
    const { data: newVersion, error: insertError } = await supabase
      .from('analysis_versions')
      .insert({
        analysis_id,
        version: nextVersion,
        user_id: session.user.id,
        ...version_data,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create version: ${insertError.message}`)
    }

    return NextResponse.json({
      version: newVersion,
      message: `Version ${nextVersion} created successfully`
    })

  } catch (error) {
    console.error('Version creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}