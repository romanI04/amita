import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'
import { getBasicStats } from '@/lib/voiceprint/features'
import { validate, generateRequestId, formatValidationError, validateNestedObject, createVoiceprintSchema, voiceprintSampleSchema } from '@/lib/validation'

interface VoiceprintSample {
  title: string
  content: string
  source: string
}


export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  console.log('Voiceprint creation API called', { requestId })
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, createVoiceprintSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { samples, user_id, name = 'My Writing Voice', language = 'en' } = validation.data!
    
    // If samples are provided, validate each sample
    if (samples && Array.isArray(samples)) {
      for (let i = 0; i < samples.length; i++) {
        const sampleValidation = validateNestedObject(samples[i], voiceprintSampleSchema, `samples[${i}]`, requestId)
        if (!sampleValidation.success) {
          return NextResponse.json(
            formatValidationError(sampleValidation.error!, requestId),
            { status: 400 }
          )
        }
      }
    }
    
    console.log('Voiceprint request:', {
      samplesCount: samples?.length,
      name,
      language,
      requestId
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
      userId = user_id  // Use the provided user_id
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

      if (!existingSamples || existingSamples.length < 3) {
        return NextResponse.json(
          { error: `Need at least 3 writing samples for accurate voice profile. You have ${existingSamples?.length || 0}.` },
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
      // Manual creation mode with provided samples (onboarding flow)
      console.log('Manual creation mode with', samples.length, 'samples')
      
      if (samples.length < 3 || samples.length > 5) {
        return NextResponse.json(
          { error: 'Please provide 3-5 writing samples for accurate voice profile' },
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
      // No samples provided - create empty voiceprint for now
      console.log('No samples provided, creating empty voiceprint')
      samplesData = []
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
    
    // Store samples if any provided
    if (samplesData.length > 0) {
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
      console.log('All', samplesData.length, 'samples stored successfully')
    } else {
      console.log('No samples to store - empty voiceprint created')
    }
    
    // Return success with voiceprint ID for next step
    return NextResponse.json({
      success: true,
      voiceprint_id: voiceprintId, // Use snake_case to match database
      voiceprintId: voiceprintId, // Also provide camelCase for backward compatibility
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