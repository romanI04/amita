import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'
import { directInsert } from '@/lib/supabase/direct-api'
import type { AnalysisRequest } from '@/types'

export async function POST(request: NextRequest) {
  console.log('Analysis API route called')
  
  try {
    const body: AnalysisRequest = await request.json()
    const { text, user_id, title } = body

    console.log('Analysis request:', { 
      textLength: text?.length, 
      userId: user_id, 
      title: title || 'untitled' 
    })

    if (!text || !user_id) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: text and user_id' },
        { status: 400 }
      )
    }

    if (text.length < 50) {
      console.log('Text too short:', text.length)
      return NextResponse.json(
        { error: 'Text must be at least 50 characters long for accurate analysis' },
        { status: 400 }
      )
    }

    console.log('Starting xAI analysis...')
    // Perform analysis using xAI
    const analysis = await xaiClient.analyze(text, user_id)
    console.log('xAI analysis completed successfully')

    console.log('Saving to database...')
    // Get access token from server-side client for RLS authentication
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
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
      await directInsert('progress_tracking', [
        {
          user_id,
          metric_type: 'authenticity',
          value: analysis.authenticity_score
        },
        {
          user_id,
          metric_type: 'ai_detection_risk',
          value: analysis.ai_confidence_score
        }
      ], { accessToken: session.access_token })
      
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
        if (sampleCount && sampleCount >= 3) {
          console.log(`User has ${sampleCount} samples, auto-creating voice profile`)
          
          try {
            const createResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voiceprint/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id })
            })

            if (createResponse.ok) {
              const result = await createResponse.json()
              console.log('Auto-created voice profile:', result.voiceprintId)
              
              // Trigger computation
              const computeResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/voiceprint/compute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    console.log('Returning analysis result to client')
    return NextResponse.json(analysis)

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