import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'
import { generateRequestId } from '@/lib/validation'
import crypto from 'crypto'

// Types for streaming events
interface StreamEvent {
  type: 'start' | 'progress' | 'quick_fixes' | 'deep_analysis' | 'complete' | 'error'
  data: any
  timestamp: number
}

// Helper to create SSE message
function createSSEMessage(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// Hash text for caching
function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  console.log('[Stream] Analysis streaming started', { requestId })
  
  // Debug: Check what cookies are present
  const cookieHeader = request.headers.get('cookie')
  console.log('[Stream] Cookies present:', cookieHeader ? 'Yes' : 'No')
  if (cookieHeader) {
    const authCookies = cookieHeader.split(';').filter(c => 
      c.includes('sb-') || c.includes('supabase')
    )
    console.log('[Stream] Auth-related cookies:', authCookies.length > 0 ? authCookies.length + ' found' : 'None found')
  }
  
  try {
    const body = await request.json()
    const { text, title, voice_preset_id, reproducible_mode, bypass_cache } = body
    
    console.log('[Stream] Request body:', { 
      textLength: text?.length, 
      title, 
      voice_preset_id,
      reproducible_mode 
    })
    
    if (!text || text.length < 50) {
      return new Response(
        createSSEMessage({
          type: 'error',
          data: { error: 'Text must be at least 50 characters', requestId },
          timestamp: Date.now()
        }),
        { status: 400, headers: { 'Content-Type': 'text/event-stream' } }
      )
    }
    
    // Get user session - same pattern as regular analyze endpoint
    const supabase = await createClient()
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('[Stream] Session check:', { 
      hasSession: !!session, 
      sessionError: sessionError?.message,
      accessToken: session?.access_token ? 'present' : 'missing'
    })
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log('[Stream] Auth check:', { 
      hasUser: !!user, 
      userError: userError?.message,
      userId: user?.id 
    })
    
    if (!user) {
      return new Response(
        createSSEMessage({
          type: 'error',
          data: { error: 'Authentication required', requestId },
          timestamp: Date.now()
        }),
        { status: 401, headers: { 'Content-Type': 'text/event-stream' } }
      )
    }
    
    // Check for cached analysis (unless bypassed)
    const textHash = hashText(text)
    let cachedJob = null
    let cacheError = null
    
    if (!bypass_cache) {
      console.log('[Stream] Checking for cached analysis...')
      const { data: cached, error: error } = await supabase
        .from('analysis_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('input_hash', textHash)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      cachedJob = cached
      cacheError = error
      
      if (cacheError && cacheError.code !== 'PGRST116') {
        console.log('[Stream] Cache check error:', cacheError)
      }
    } else {
      console.log('[Stream] Bypassing cache as requested')
    }
    console.log('[Stream] Cached job found:', !!cachedJob)
    
    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()
    
    // Start streaming
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Request-Id': requestId
      }
    })
    
    // Background processing
    void (async () => {
      let writerClosed = false
      try {
        console.log('[Stream] Starting background processing')
        
        // Send start event
        await writer.write(encoder.encode(createSSEMessage({
          type: 'start',
          data: { 
            requestId,
            cached: !!cachedJob,
            textLength: text.length
          },
          timestamp: Date.now()
        })))
        
        console.log('[Stream] Start event sent')
        
        if (cachedJob && cachedJob.result) {
          console.log('[Stream] Returning cached result:', {
            hasResult: !!cachedJob.result,
            aiScore: cachedJob.result.ai_confidence_score,
            authScore: cachedJob.result.authenticity_score,
            sectionsCount: cachedJob.result.detected_sections?.length || 0
          })
          // Return cached result immediately
          await writer.write(encoder.encode(createSSEMessage({
            type: 'complete',
            data: {
              ...cachedJob.result,
              cached: true,
              requestId
            },
            timestamp: Date.now()
          })))
          await writer.close()
          writerClosed = true
          return // Exit early for cached results
        } else {
          // Create job record
          const { data: job } = await supabase
            .from('analysis_jobs')
            .insert({
              user_id: user.id,
              type: 'analysis',
              status: 'processing',
              input_hash: textHash,
              input_data: { text, title, voice_preset_id },
              request_id: requestId,
              model_version: reproducible_mode ? 'grok-4' : 'grok-4'
            })
            .select()
            .single()
          
          // Phase 1: Quick Scan (3-5 seconds)
          await writer.write(encoder.encode(createSSEMessage({
            type: 'progress',
            data: { 
              phase: 'quick_scan',
              progress: 10,
              message: 'Analyzing text patterns...'
            },
            timestamp: Date.now()
          })))
          
          // Get top 3 fixes quickly
          const quickFixesPrompt = `
Analyze this text and identify the TOP 3 most impactful improvements that would:
1. Reduce AI detection risk
2. Enhance authenticity
3. Preserve the author's voice

Return ONLY a JSON array with exactly 3 items:
[
  {
    "issue": "brief description of issue",
    "fix": "specific fix suggestion",
    "impact": "high/medium",
    "risk_reduction": <number 5-20>
  }
]

Text: "${text.substring(0, 1000)}..."
          `
          
          console.log('[Stream] Calling xAI for quick fixes...')
          console.log('[Stream] XAI_API_KEY status:', process.env.XAI_API_KEY ? `Set (${process.env.XAI_API_KEY.length} chars)` : 'NOT SET!')
          console.log('[Stream] XAI_API_URL:', process.env.XAI_API_URL || 'NOT SET!')
          let quickResult
          try {
            quickResult = await xaiClient.chatCompletion({
              messages: [
                { role: 'system', content: 'You are a writing coach. Be concise and specific.' },
                { role: 'user', content: quickFixesPrompt }
              ],
              temperature: 0.3,
              max_tokens: 4000  // Increased for reasoning tokens
            })
            console.log('[Stream] Quick fixes result received:', !!quickResult)
          } catch (xaiError) {
            console.error('[Stream] XAI API Error:', xaiError)
            console.error('[Stream] Error details:', xaiError instanceof Error ? xaiError.message : 'Unknown error')
            throw xaiError // Re-throw to be caught by outer try-catch
          }
          
          try {
            // Import jsonrepair at the top of the file
            const { jsonrepair } = await import('jsonrepair')
            const repairedContent = jsonrepair(quickResult.content)
            const quickFixes = JSON.parse(repairedContent)
            await writer.write(encoder.encode(createSSEMessage({
              type: 'quick_fixes',
              data: { 
                fixes: quickFixes,
                progress: 30
              },
              timestamp: Date.now()
            })))
          } catch (e) {
            console.error('Failed to parse quick fixes:', e)
            console.error('Raw content:', quickResult.content?.substring(0, 500))
          }
          
          // Phase 2: Deep Analysis (10-15 seconds)
          await writer.write(encoder.encode(createSSEMessage({
            type: 'progress',
            data: { 
              phase: 'deep_analysis',
              progress: 40,
              message: 'Performing deep voice analysis...'
            },
            timestamp: Date.now()
          })))
          
          // Get voice preset if specified
          let voiceConstraints = {}
          if (voice_preset_id) {
            const { data: preset } = await supabase
              .from('voice_presets')
              .select('*')
              .eq('id', voice_preset_id)
              .eq('user_id', user.id)
              .single()
            
            if (preset) {
              voiceConstraints = preset.constraints || {}
            }
          }
          
          // Full analysis with voice awareness
          console.log('[Stream] Starting full XAI analysis')
          const fullAnalysis = await xaiClient.analyze(text, user.id)
          console.log('[Stream] XAI analysis complete:', {
            hasAnalysis: !!fullAnalysis,
            aiScore: fullAnalysis?.ai_confidence_score,
            authScore: fullAnalysis?.authenticity_score
          })
          
          // Add voice adherence scoring
          const voiceAdherence = calculateVoiceAdherence(fullAnalysis, voiceConstraints)
          
          // Enhance suggestions with voice traits (use actual values from analysis)
          const enhancedSuggestions = fullAnalysis.detected_sections?.map((section: any) => ({
            ...section,
            voice_trait_preserved: identifyPreservedTrait(section, voiceConstraints),
            voice_trait_enhanced: identifyEnhancedTrait(section, voiceConstraints),
            // Use actual risk reduction from the analysis, not synthetic
            risk_delta: section.risk_reduction ? -section.risk_reduction : -10,
            authenticity_delta: section.authenticity_improvement || 5
          }))
          
          await writer.write(encoder.encode(createSSEMessage({
            type: 'deep_analysis',
            data: {
              ...fullAnalysis,
              content: text, // Include original text for consistency
              detected_sections: enhancedSuggestions,
              voice_adherence_score: voiceAdherence,
              progress: 80
            },
            timestamp: Date.now()
          })))
          
          // Save to writing_samples for history
          const { data: sampleData, error: sampleError } = await supabase
            .from('writing_samples')
            .insert({
              user_id: user.id,
              title: title || 'Untitled Analysis',
              content: text,
              ai_confidence_score: fullAnalysis.ai_confidence_score,
              authenticity_score: fullAnalysis.authenticity_score,
              voice_fingerprint: fullAnalysis.voice_fingerprint
            })
            .select()
            .single()
          
          if (sampleError) {
            console.error('[Stream] Error saving to history:', sampleError)
          } else {
            console.log('[Stream] Saved to history:', sampleData?.id)
          }
          
          // Update job with result
          await supabase
            .from('analysis_jobs')
            .update({
              status: 'completed',
              progress: 100,
              result: {
                ...fullAnalysis,
                content: text, // Include original text in stored result
                detected_sections: enhancedSuggestions,
                voice_adherence_score: voiceAdherence
              },
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id)
          
          // Final complete event
          await writer.write(encoder.encode(createSSEMessage({
            type: 'complete',
            data: {
              job_id: job.id,
              requestId,
              cached: false
            },
            timestamp: Date.now()
          })))
        }
      } catch (error) {
        console.error('[Stream] Streaming error:', error)
        console.error('[Stream] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        try {
          await writer.write(encoder.encode(createSSEMessage({
            type: 'error',
            data: { 
              error: error instanceof Error ? error.message : 'Analysis failed',
              requestId,
              details: error instanceof Error ? error.stack : undefined
            },
            timestamp: Date.now()
          })))
        } catch (writeError) {
          console.error('[Stream] Error writing error message:', writeError)
        }
      } finally {
        if (!writerClosed) {
          try {
            await writer.close()
          } catch (closeError) {
            // Writer might already be closed, ignore
            console.log('Writer already closed:', closeError)
          }
        }
      }
    })()
    
    return response
    
  } catch (error) {
    console.error('Stream setup error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to initialize streaming' }),
      { status: 500 }
    )
  }
}

// Helper functions
function calculateVoiceAdherence(analysis: any, constraints: any): number {
  // Calculate based on actual analysis data
  if (!constraints || Object.keys(constraints).length === 0) {
    // No voice constraints, return authenticity score from analysis
    return analysis.authenticity_score || 50
  }
  
  let score = 50 // Start neutral
  
  if (constraints.sentence_length_target) {
    const avgLength = analysis.voice_fingerprint?.avg_sentence_length || 15
    const target = constraints.sentence_length_target
    const diff = Math.abs(avgLength - target) / target
    score += (1 - diff) * 10
  }
  
  if (constraints.formality_level) {
    const formality = analysis.style_analysis?.tone_analysis?.formality || 50
    const target = constraints.formality_level
    const diff = Math.abs(formality - target) / 100
    score += (1 - diff) * 10
  }
  
  if (constraints.vocabulary_complexity) {
    const complexity = analysis.style_analysis?.vocabulary?.sophistication_level || 50
    const target = constraints.vocabulary_complexity
    const diff = Math.abs(complexity - target) / 100
    score += (1 - diff) * 10
  }
  
  return Math.min(100, Math.max(0, Math.round(score)))
}

function identifyPreservedTrait(section: any, constraints: any): string {
  const traits = [
    'Your natural conversational tone',
    'Your concise writing style',
    'Your technical precision',
    'Your narrative flow',
    'Your unique voice patterns'
  ]
  
  // Select based on section characteristics
  if (section.reason?.includes('formal')) return traits[0]
  if (section.reason?.includes('length')) return traits[1]
  if (section.reason?.includes('technical')) return traits[2]
  if (section.reason?.includes('flow')) return traits[3]
  
  return traits[4]
}

function identifyEnhancedTrait(section: any, constraints: any): string {
  const traits = [
    'Strengthens authenticity markers',
    'Improves sentence variety',
    'Enhances personal voice',
    'Adds natural imperfections',
    'Increases engagement'
  ]
  
  // Select based on suggestion type
  if (section.suggested_revision?.includes('varied')) return traits[1]
  if (section.suggested_revision?.includes('personal')) return traits[2]
  if (section.suggested_revision?.includes('natural')) return traits[3]
  if (section.suggested_revision?.includes('engage')) return traits[4]
  
  return traits[0]
}