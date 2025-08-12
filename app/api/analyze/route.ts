import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'
import { directInsert } from '@/lib/supabase/direct-api'
import { validate, generateRequestId, formatValidationError, analyzeSchema } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { AnalysisRequest, AnalysisResponse } from '@/types'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  console.log('Analysis API route called', { requestId })
  
  // Debug: Check what cookies are present
  const cookieHeader = request.headers.get('cookie')
  console.log('Cookies present:', cookieHeader ? 'Yes' : 'No')
  if (cookieHeader) {
    const authCookies = cookieHeader.split(';').filter(c => 
      c.includes('sb-') || c.includes('supabase')
    )
    console.log('Auth-related cookies:', authCookies.length > 0 ? authCookies.length + ' found' : 'None found')
  }
  
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.analyze)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        details: 'Rate limit exceeded. Please wait before making another request.',
        retryAfter: rateLimitResult.retryAfter,
        requestId 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60)
        }
      }
    )
  }
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate<AnalysisRequest>(body, analyzeSchema, requestId)
    if (!validation.success) {
      console.log('Validation failed:', validation.error)
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { text, title } = validation.data!

    // Get user_id from authenticated session instead of trusting client
    const supabase = await createClient()
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check:', { 
      hasSession: !!session, 
      sessionError,
      accessToken: session?.access_token ? 'present' : 'missing'
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('User check:', { 
      hasUser: !!user, 
      userError,
      userId: user?.id 
    })
    
    if (userError || !user) {
      console.log('Authentication failed:', { userError, hasUser: !!user })
      return NextResponse.json(
        { 
          error: 'Authentication required',
          details: userError?.message || 'No user found',
          requestId
        },
        { status: 401 }
      )
    }
    
    const user_id = user.id
    
    console.log('Analysis request:', { 
      textLength: text.length, 
      userId: user_id, 
      title: title || 'untitled',
      requestId
    })

    console.log('Starting xAI analysis...')
    // Perform analysis using xAI with proper error handling
    let analysis
    try {
      analysis = await xaiClient.analyze(text, user_id)
      console.log('xAI analysis completed successfully')
    } catch (xaiError) {
      console.error('XAI analysis failed:', xaiError)
      
      // Handle specific XAI errors
      if (xaiError instanceof Error) {
        const errorMessage = xaiError.message
        
        if (errorMessage.includes('XAI_SERVICE_UNAVAILABLE')) {
          return NextResponse.json(
            { 
              error: 'AI service temporarily unavailable', 
              details: 'The analysis service is experiencing high demand. Please try again in a few moments.',
              requestId 
            },
            { status: 503 }
          )
        } else if (errorMessage.includes('XAI_RATE_LIMIT')) {
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded', 
              details: 'Too many analysis requests. Please wait a moment before trying again.',
              requestId 
            },
            { status: 429 }
          )
        } else if (errorMessage.includes('XAI_TIMEOUT')) {
          return NextResponse.json(
            { 
              error: 'Analysis timeout', 
              details: 'The text analysis took too long. Try analyzing shorter text segments.',
              requestId 
            },
            { status: 408 }
          )
        } else if (errorMessage.includes('XAI_BAD_REQUEST')) {
          return NextResponse.json(
            { 
              error: 'Invalid text format', 
              details: 'The text contains invalid characters or is too long. Please check your input.',
              requestId 
            },
            { status: 400 }
          )
        } else if (errorMessage.includes('XAI_AUTH_ERROR')) {
          return NextResponse.json(
            { 
              error: 'Configuration error', 
              details: 'The AI service is not properly configured. Please contact support.',
              requestId 
            },
            { status: 500 }
          )
        }
      }
      
      // Generic error fallback
      return NextResponse.json(
        { 
          error: 'Analysis failed', 
          details: 'Unable to analyze text at this time. Please try again later.',
          requestId 
        },
        { status: 500 }
      )
    }

    console.log('Saving to database...')
    // Session was already retrieved above, use it here
    
    if (!session?.access_token) {
      console.error('No valid session found for database operations')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Save the writing sample using direct API
    let sampleData: any = null
    try {
      const { data } = await directInsert('writing_samples', {
        user_id,
        title: title || 'Untitled Analysis',
        content: text,
        ai_confidence_score: analysis.ai_confidence_score,
        authenticity_score: analysis.authenticity_score,
        voice_fingerprint: analysis.voice_fingerprint
      }, { accessToken: session.access_token })
      
      sampleData = data?.[0]
      console.log('Writing sample saved successfully via direct API:', sampleData?.id)
    } catch (sampleError) {
      console.error('Error saving writing sample via direct API:', sampleError)
      // Continue with analysis even if saving fails
    }

    // Save voice analysis results using direct API
    if (sampleData) {
      try {
        await directInsert('voice_analysis', {
          user_id,
          sample_id: sampleData.id,
          style_characteristics: analysis.style_analysis,
          improvement_suggestions: analysis.improvement_suggestions,
          ai_detected_sections: analysis.detected_sections,
          overall_score: {
            authenticity: analysis.authenticity_score,
            ai_likelihood: analysis.ai_confidence_score,
            voice_consistency: 85, // Default value
            overall_quality: Math.round((analysis.authenticity_score + (100 - analysis.ai_confidence_score)) / 2)
          }
        }, { accessToken: session.access_token })
        
        console.log('Voice analysis saved successfully via direct API')
      } catch (analysisError) {
        console.error('Error saving voice analysis via direct API:', analysisError)
      }
    }

    // Track progress metrics using direct API
    try {
      // Insert authenticity metric
      await directInsert('progress_tracking', {
        user_id,
        metric_type: 'authenticity',
        value: analysis.authenticity_score,
        recorded_at: new Date().toISOString()
      }, { accessToken: session.access_token })

      // Insert AI detection risk metric  
      await directInsert('progress_tracking', {
        user_id,
        metric_type: 'ai_detection_risk',
        value: analysis.ai_confidence_score,
        recorded_at: new Date().toISOString()
      }, { accessToken: session.access_token })
      
      console.log('Progress metrics tracked successfully via direct API')
    } catch (progressError) {
      console.error('Error tracking progress via direct API:', progressError)
    }

    // Voice profile integration - check if user has active voiceprint and auto-create if needed
    try {
      const { data: existingVoiceprint } = await supabase
        .from('voiceprints')
        .select('id, status')
        .eq('user_id', user_id)
        .eq('status', 'active')
        .maybeSingle()

      if (!existingVoiceprint) {
        console.log('No active voice profile found, checking if we should auto-create')
        
        // Check if user has enough samples to create a voice profile
        const { count: sampleCount } = await supabase
          .from('writing_samples')
          .select('id', { count: 'exact' })
          .eq('user_id', user_id)

        // Auto-create voice profile if user has 3+ samples and no active profile
        // Increased to 4 samples to ensure quality after the current analysis is saved
        if (sampleCount && sampleCount >= 4) {
          console.log(`User has ${sampleCount} samples, auto-creating voice profile`)
          
          try {
            const createResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voiceprint/create`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({})
            })

            if (createResponse.ok) {
              const result = await createResponse.json()
              console.log('Auto-created voice profile:', result.voiceprintId)
              
              // Trigger computation
              const computeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voiceprint/compute`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ voiceprintId: result.voiceprintId })
              })

              if (!computeResponse.ok) {
                console.error('Failed to compute auto-created voice profile')
              }
            }
          } catch (autoCreateError) {
            console.error('Error auto-creating voice profile:', autoCreateError)
          }
        }
      } else {
        console.log('User has active voice profile:', existingVoiceprint.id)
        
        // Add this sample to the voiceprint for continuous learning
        if (sampleData) {
          try {
            const stats = { wordCount: text.split(/\s+/).length }
            
            await directInsert('voiceprint_samples', {
              voiceprint_id: existingVoiceprint.id,
              title: title || 'Untitled Analysis',
              source: 'analysis_feedback',
              content: text,
              word_count: stats.wordCount
            }, { accessToken: session.access_token })

            console.log('Added sample to existing voice profile')
          } catch (sampleAddError) {
            console.error('Error adding sample to voice profile:', sampleAddError)
          }
        }
      }
    } catch (voiceprintError) {
      console.error('Error with voice profile integration:', voiceprintError)
      // Continue with analysis even if voice profile operations fail
    }

    // Prepare the complete response payload that matches AnalysisResponse interface
    const response: AnalysisResponse = {
      id: sampleData?.id, // Include the sample ID if available
      ai_confidence_score: analysis.ai_confidence_score ?? 0,
      authenticity_score: analysis.authenticity_score ?? 85,
      voice_fingerprint: analysis.voice_fingerprint ?? {
        avg_sentence_length: 18,
        vocabulary_diversity: 0.7,
        tone_characteristics: {
          formal: 0.5,
          casual: 0.5,
          technical: 0.3,
          creative: 0.4
        },
        style_patterns: {
          passive_voice_usage: 0.2,
          complex_sentences: 0.3,
          punctuation_style: {
            periods: 0.7,
            commas: 0.8,
            semicolons: 0.1,
            exclamation: 0.05
          }
        },
        characteristic_words: []
      },
      detected_sections: analysis.detected_sections ?? [],
      improvement_suggestions: analysis.improvement_suggestions ?? [
        'Continue writing in your natural voice - your unique style is valuable',
        'Focus on personal experiences and genuine insights',
        'Vary your sentence structure to maintain authentic flow'
      ],
      style_analysis: analysis.style_analysis ?? {
        sentence_structure: {
          avg_length: 18,
          complexity_score: 60,
          variety_score: 75
        },
        vocabulary: {
          diversity_index: 70,
          sophistication_level: 65,
          unique_word_ratio: 0.8
        },
        tone_analysis: {
          formality: 50,
          emotion: 40,
          confidence: 70
        }
      },
      overall_score: {
        authenticity: analysis.authenticity_score ?? 85,
        ai_likelihood: analysis.ai_confidence_score ?? 0
      }
    }

    console.log('Returning complete analysis result to client')
    return NextResponse.json(response)

  } catch (error) {
    console.error('Analysis API error:', error)
    
    if (error instanceof Error && error.message.includes('XAI API key not configured')) {
      console.log('XAI API key not configured error')
      return NextResponse.json(
        { error: 'AI analysis service is not configured. Please check your API keys.' },
        { status: 503 }
      )
    }

    console.log('General analysis error, returning 500')
    return NextResponse.json(
      { error: 'Failed to analyze text. Please try again.' },
      { status: 500 }
    )
  }
}