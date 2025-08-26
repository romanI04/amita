import { NextRequest, NextResponse } from 'next/server'
import { xaiClient } from '@/lib/xai/client'
import { generateRequestId } from '@/lib/validation'

// In-memory store for demo usage tracking
// In production, use Redis or database
const demoUsage = new Map<string, { count: number; lastUsed: Date; demos: string[] }>()

// Clean up old entries every hour
setInterval(() => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  for (const [ip, usage] of demoUsage.entries()) {
    if (usage.lastUsed < oneDayAgo) {
      demoUsage.delete(ip)
    }
  }
}, 60 * 60 * 1000)

function getClientIp(request: NextRequest): string {
  // Get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  if (realIp) {
    return realIp
  }
  if (cfConnectingIp) {
    return cfConnectingIp
  }
  
  // Fallback to a generic IP for local development
  return '127.0.0.1'
}

function resetDailyLimit(usage: { count: number; lastUsed: Date; demos: string[] }): boolean {
  const now = new Date()
  const lastUsed = new Date(usage.lastUsed)
  
  // Reset if it's a new day (UTC)
  if (now.getUTCDate() !== lastUsed.getUTCDate() || 
      now.getUTCMonth() !== lastUsed.getUTCMonth() || 
      now.getUTCFullYear() !== lastUsed.getUTCFullYear()) {
    usage.count = 0
    usage.demos = []
    usage.lastUsed = now
    return true
  }
  
  return false
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()
  
  console.log('Demo analysis API called', { requestId })
  
  try {
    const body = await request.json()
    const { text } = body
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { 
          error: 'Invalid request', 
          details: 'Text is required for analysis',
          requestId 
        },
        { status: 400 }
      )
    }
    
    if (text.length < 50) {
      return NextResponse.json(
        { 
          error: 'Text too short', 
          details: 'Please provide at least 50 characters for meaningful analysis',
          requestId 
        },
        { status: 400 }
      )
    }
    
    if (text.length > 5000) {
      return NextResponse.json(
        { 
          error: 'Text too long', 
          details: 'Demo is limited to 5000 characters. Sign up for unlimited analysis',
          requestId 
        },
        { status: 400 }
      )
    }
    
    // Get client IP for rate limiting
    const clientIp = getClientIp(request)
    console.log('Client IP:', clientIp, { requestId })
    
    // Check and update demo usage
    let usage = demoUsage.get(clientIp) || { count: 0, lastUsed: new Date(), demos: [] }
    
    // Reset daily limit if needed
    resetDailyLimit(usage)
    
    // Check rate limit
    if (usage.count >= 3) {
      const hoursUntilReset = Math.ceil((24 - (Date.now() - usage.lastUsed.getTime()) / (1000 * 60 * 60)))
      
      return NextResponse.json(
        { 
          error: 'Demo limit reached', 
          details: `You've used all 3 free demos today. Sign up for unlimited analysis or try again in ${hoursUntilReset} hours.`,
          requestId,
          usage: {
            used: usage.count,
            limit: 3,
            resetInHours: hoursUntilReset
          }
        },
        { status: 429 }
      )
    }
    
    // Update usage count
    usage.count++
    usage.lastUsed = new Date()
    usage.demos.push(requestId)
    demoUsage.set(clientIp, usage)
    
    console.log('Demo usage updated:', { ip: clientIp, count: usage.count, requestId })
    
    // Perform real AI analysis using xAI
    console.log('Starting real xAI analysis for demo...', { requestId })
    
    let analysis
    try {
      // Use a demo user ID for tracking
      const demoUserId = `demo_${clientIp}`
      analysis = await xaiClient.analyze(text, demoUserId)
      console.log('Demo xAI analysis completed successfully', { requestId })
    } catch (xaiError) {
      console.error('Demo xAI analysis failed:', xaiError, { requestId })
      
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
              error: 'Service busy', 
              details: 'Too many requests to AI service. Please wait a moment and try again.',
              requestId 
            },
            { status: 429 }
          )
        } else if (errorMessage.includes('XAI_TIMEOUT')) {
          return NextResponse.json(
            { 
              error: 'Analysis timeout', 
              details: 'The analysis took too long. Try with shorter text.',
              requestId 
            },
            { status: 408 }
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
    
    // Calculate processing time
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1)
    
    // Prepare demo response with real analysis
    const response = {
      requestId,
      demo: true,
      usage: {
        current: usage.count,
        limit: 3,
        remaining: 3 - usage.count
      },
      processingTime: `${processingTime}s`,
      poweredBy: 'xAI Grok',
      analysis: {
        ai_confidence_score: analysis.ai_confidence_score ?? 0,
        authenticity_score: analysis.authenticity_score ?? 85,
        risk_level: analysis.ai_confidence_score >= 70 ? 'high' : 
                   analysis.ai_confidence_score >= 40 ? 'medium' : 'low',
        detected_issues: analysis.detected_sections?.map((section: any) => ({
          text: section.text?.substring(0, 100) + (section.text?.length > 100 ? '...' : ''),
          reason: section.reason || 'AI pattern detected',
          confidence: section.confidence || 75
        })) || [],
        improvements: analysis.improvement_suggestions?.slice(0, 3) || [
          'Add personal anecdotes or specific examples',
          'Vary sentence structure for more natural flow',
          'Include emotional or subjective language'
        ],
        voice_characteristics: {
          sentence_variety: analysis.voice_fingerprint?.avg_sentence_length ? 
            (analysis.voice_fingerprint.avg_sentence_length > 20 ? 'Complex' : 'Simple') : 'Balanced',
          vocabulary: analysis.voice_fingerprint?.vocabulary_diversity ? 
            (analysis.voice_fingerprint.vocabulary_diversity > 0.7 ? 'Diverse' : 'Repetitive') : 'Moderate',
          tone: analysis.voice_fingerprint?.tone_characteristics?.formal > 0.5 ? 'Formal' : 'Casual'
        }
      },
      message: usage.count === 3 
        ? "You've used all 3 free demos today. Sign up to continue analyzing!"
        : `Demo ${usage.count} of 3 used today. ${3 - usage.count} remaining.`
    }
    
    console.log('Demo analysis complete', { 
      requestId, 
      processingTime,
      aiScore: analysis.ai_confidence_score,
      authenticityScore: analysis.authenticity_score 
    })
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Demo API error:', error, { requestId })
    
    return NextResponse.json(
      { 
        error: 'Server error', 
        details: 'An unexpected error occurred. Please try again.',
        requestId 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check demo usage
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request)
  const usage = demoUsage.get(clientIp) || { count: 0, lastUsed: new Date(), demos: [] }
  
  // Reset daily limit if needed
  resetDailyLimit(usage)
  
  return NextResponse.json({
    used: usage.count,
    limit: 3,
    remaining: 3 - usage.count,
    canUseDemo: usage.count < 3
  })
}