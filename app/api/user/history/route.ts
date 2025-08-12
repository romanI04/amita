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
      sample_id: searchParams.get('sample_id')
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
    
    // If sample_id is provided, fetch only that sample
    if (queryParams.sample_id) {
      query = query.eq('id', queryParams.sample_id)
    } else {
      // Otherwise, use pagination
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    }
    
    const { data: samples, error: samplesError } = await query

    if (samplesError) {
      throw new Error(`Database query failed: ${samplesError.message}`)
    }

    // Fetch analysis versions (if versioning is implemented)
    const analysisIds = samples?.map(s => s.id) || []
    const { data: versions } = await supabase
      .from('analysis_versions')
      .select('*')
      .in('analysis_id', analysisIds)
      .order('version', { ascending: false })

    // Group versions by analysis ID
    const versionsByAnalysis = versions?.reduce((acc, version) => {
      if (!acc[version.analysis_id]) {
        acc[version.analysis_id] = []
      }
      acc[version.analysis_id].push(version)
      return acc
    }, {} as Record<string, any[]>) || {}

    // Enhance samples with additional metadata
    const enrichedSamples = samples?.map(sample => {
      const analysis = sample.voice_analysis?.[0] // Get latest analysis
      const itemVersions = versionsByAnalysis[sample.id] || []
      
      // Calculate improvement metrics
      let improvementPercentage = 0
      if (itemVersions.length > 1) {
        const originalScore = itemVersions[itemVersions.length - 1]?.ai_confidence_score || sample.ai_confidence_score || 0
        const latestScore = itemVersions[0]?.ai_confidence_score || sample.ai_confidence_score || 0
        if (originalScore > 0) {
          improvementPercentage = Math.max(0, Math.round(((originalScore - latestScore) / originalScore) * 100))
        }
      }

      return {
        ...sample,
        versions: itemVersions,
        latest_version: itemVersions.length || 1,
        total_changes: itemVersions.reduce((sum: number, v: any) => sum + (v.changes_applied || 0), 0),
        improvement_percentage: improvementPercentage,
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