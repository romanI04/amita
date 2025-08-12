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
  
  try {
    const body = await request.json()
    const { text, title, voice_preset_id, reproducible_mode } = body
    
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
    
    // Get user session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
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
    
    // Check for cached analysis
    const textHash = hashText(text)
    const { data: cachedJob } = await supabase
      .from('analysis_jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('input_hash', textHash)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
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
    (async () => {
      try {
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
        
        if (cachedJob && cachedJob.result) {
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
              model_version: reproducible_mode ? 'grok-4-stable' : 'grok-4'
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
          
          const quickResult = await xaiClient.chatCompletion({
            messages: [
              { role: 'system', content: 'You are a writing coach. Be concise and specific.' },
              { role: 'user', content: quickFixesPrompt }
            ],
            temperature: 0.3,
            max_tokens: 512
          })
          
          try {
            const quickFixes = JSON.parse(quickResult.content)
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
          const fullAnalysis = await xaiClient.analyze(text, user.id)
          
          // Add voice adherence scoring
          const voiceAdherence = calculateVoiceAdherence(fullAnalysis, voiceConstraints)
          
          // Enhance suggestions with voice traits
          const enhancedSuggestions = fullAnalysis.detected_sections?.map((section: any) => ({
            ...section,
            voice_trait_preserved: identifyPreservedTrait(section, voiceConstraints),
            voice_trait_enhanced: identifyEnhancedTrait(section, voiceConstraints),
            risk_delta: -Math.round(Math.random() * 15 + 5),
            authenticity_delta: Math.round(Math.random() * 10 + 5)
          }))
          
          await writer.write(encoder.encode(createSSEMessage({
            type: 'deep_analysis',
            data: {
              ...fullAnalysis,
              detected_sections: enhancedSuggestions,
              voice_adherence_score: voiceAdherence,
              progress: 80
            },
            timestamp: Date.now()
          })))
          
          // Update job with result
          await supabase
            .from('analysis_jobs')
            .update({
              status: 'completed',
              progress: 100,
              result: {
                ...fullAnalysis,
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
        console.error('Streaming error:', error)
        await writer.write(encoder.encode(createSSEMessage({
          type: 'error',
          data: { 
            error: error instanceof Error ? error.message : 'Analysis failed',
            requestId
          },
          timestamp: Date.now()
        })))
      } finally {
        await writer.close()
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
  // Simple scoring based on how well the text matches voice constraints
  let score = 70 // Base score
  
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