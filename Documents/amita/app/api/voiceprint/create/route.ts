import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'
import { getBasicStats } from '@/lib/voiceprint/features'

interface VoiceprintSample {
  title: string
  content: string
  source?: string
}

interface CreateVoiceprintRequest {
  samples?: VoiceprintSample[]
  user_id?: string // For auto-creation from existing samples
  name?: string
  language?: string
}

export async function POST(request: NextRequest) {
  console.log('Voiceprint creation API called')
  
  try {
    const body: CreateVoiceprintRequest = await request.json()
    const { samples, user_id, name = 'My Writing Voice', language = 'en' } = body
    
    console.log('Voiceprint request:', {
      samplesCount: samples?.length,
      user_id,
      name,
      language
    })

    // Get authenticated user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let samplesData: VoiceprintSample[] = []
    let userId = session.user.id

    // Check for auto-creation mode (using existing writing samples)
    if (user_id && !samples) {
      // Verify user can create for this user_id
      if (user_id !== session.user.id) {
        return NextResponse.json(
          { error: 'Cannot create voiceprint for another user' },
          { status: 403 }
        )
      }

      // Check if user already has an active voiceprint
      const { data: existingVoiceprint } = await supabase
        .from('voiceprints')
        .select('id, status')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .maybeSingle()

      if (existingVoiceprint) {
        return NextResponse.json(
          { error: 'User already has an active voice profile' },
          { status: 400 }
        )
      }

      // Get existing writing samples
      const { data: existingSamples } = await supabase
        .from('writing_samples')
        .select('title, content, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!existingSamples || existingSamples.length === 0) {
        return NextResponse.json(
          { error: 'No writing samples found. Analyze some text first.' },
          { status: 400 }
        )
      }

      // Convert to voiceprint samples format
      samplesData = existingSamples.map(sample => ({
        title: sample.title || 'Untitled Analysis',
        content: sample.content,
        source: 'writing_analysis'
      }))

    } else if (samples && Array.isArray(samples)) {
      // Manual creation mode with provided samples
      if (samples.length < 3 || samples.length > 5) {
        return NextResponse.json(
          { error: 'Please provide 3-5 writing samples' },
          { status: 400 }
        )
      }

      // Validate each sample
      for (const sample of samples) {
        if (!sample.title || !sample.content) {
          return NextResponse.json(
            { error: 'Each sample must have a title and content' },
            { status: 400 }
          )
        }
        
        const stats = getBasicStats(sample.content)
        if (stats.wordCount < 50) {
          return NextResponse.json(
            { error: `Sample "${sample.title}" must be at least 50 words` },
            { status: 400 }
          )
        }
        
        if (stats.wordCount > 5000) {
          return NextResponse.json(
            { error: `Sample "${sample.title}" exceeds 5000 word limit` },
            { status: 400 }
          )
        }
      }

      samplesData = samples
    } else {
      return NextResponse.json(
        { error: 'Either samples array or user_id for auto-creation is required' },
        { status: 400 }
      )
    }
    
    console.log('Creating voiceprint for user:', userId)
    
    // Create voiceprint record
    const { data: voiceprintData } = await directInsert('voiceprints', {
      user_id: userId,
      name,
      language,
      status: 'computing'
    }, { accessToken: session.access_token })
    
    if (!voiceprintData || voiceprintData.length === 0) {
      throw new Error('Failed to create voiceprint record')
    }
    
    const voiceprintId = voiceprintData[0].id
    console.log('Voiceprint created:', voiceprintId)
    
    // Store samples
    const samplePromises = samplesData.map(sample => {
      const stats = getBasicStats(sample.content)
      
      return directInsert('voiceprint_samples', {
        voiceprint_id: voiceprintId,
        title: sample.title.trim(),
        source: sample.source || 'paste',
        content: sample.content.trim(),
        word_count: stats.wordCount
      }, { accessToken: session.access_token })
    })
    
    await Promise.all(samplePromises)
    console.log('All samples stored successfully')
    
    // Return success with voiceprint ID for next step
    return NextResponse.json({
      success: true,
      voiceprintId: voiceprintId, // Use camelCase to match frontend
      message: 'Voiceprint created successfully. Ready for computation.'
    })
    
  } catch (error) {
    console.error('Voiceprint creation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to create voiceprint. Please try again.' },
      { status: 500 }
    )
  }
}