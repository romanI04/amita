import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'
import { validate, generateRequestId, formatValidationError, rewriteApiSchema } from '@/lib/validation'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  let body: any = null
  
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request, RATE_LIMITS.rewrite)
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
    body = await request.json()
    
    // Validate request body
    const validation = validate(body, rewriteApiSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { prompt, originalText, constraints, options } = validation.data!
    
    // Get session for authentication
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    try {
      // Call xAI API for rewriting using chat completion
      const rewriteResponse = await xaiClient.chatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are a writing assistant that helps preserve authentic voice while reducing AI detection risk. 
            CRITICAL: Always follow the voice constraints exactly. Never violate the author's locked traits.
            
            After rewriting, provide a JSON response with this exact structure:
            {
              "rewrittenText": "<the rewritten text>",
              "integrityScore": <number 60-100>,
              "riskScore": <number 5-40>,
              "locksRespected": ["<list of constraint types respected>"],
              "risksReduced": ["<list of risk types addressed>"],
              "analysisConfidence": <number 0.6-1.0>
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-4',
        temperature: 0.3,
        max_tokens: Math.max(1000, originalText.length * 2)
      })
      
      if (!rewriteResponse?.content) {
        throw new Error('No response from AI service')
      }
      
      // Parse the JSON response from Grok with solid fallback
      let rewriteResult
      try {
        rewriteResult = JSON.parse(rewriteResponse.content.trim())
      } catch (parseError) {
        console.error('JSON parse failed, using fallback response:', parseError, rewriteResponse.content)
        
        // Return safe fallback response instead of throwing
        return NextResponse.json({
          rewrittenText: originalText,
          risksReduced: [],
          locksRespected: [],
          integrityScore: 70,
          riskScore: 30,
          error: 'AI service returned invalid format',
          metadata: {
            originalLength: originalText.length,
            rewrittenLength: originalText.length,
            analysisConfidence: 0.5,
            constraintsApplied: constraints ? Object.keys(constraints).length : 0
          }
        }, { status: 503 })
      }
      
      const { 
        rewrittenText,
        integrityScore, 
        riskScore, 
        locksRespected, 
        risksReduced, 
        analysisConfidence 
      } = rewriteResult
      
      // Validate required fields from AI response with fallbacks
      if (!rewrittenText || typeof integrityScore !== 'number' || typeof riskScore !== 'number') {
        console.error('AI service response missing required fields:', rewriteResult)
        
        // Return safe fallback response instead of throwing
        return NextResponse.json({
          rewrittenText: originalText,
          risksReduced: [],
          locksRespected: [],
          integrityScore: 70,
          riskScore: 30,
          error: 'AI service response incomplete',
          metadata: {
            originalLength: originalText.length,
            rewrittenLength: originalText.length,
            analysisConfidence: 0.5,
            constraintsApplied: constraints ? Object.keys(constraints).length : 0
          }
        }, { status: 503 })
      }
      
      return NextResponse.json({
        rewrittenText,
        risksReduced: risksReduced || [],
        locksRespected: locksRespected || [],
        integrityScore,
        riskScore,
        metadata: {
          originalLength: originalText.length,
          rewrittenLength: rewrittenText.length,
          analysisConfidence,
          constraintsApplied: constraints ? Object.keys(constraints).length : 0
        }
      })
      
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Return original text with error indication - always 503, never 500
      return NextResponse.json({
        rewrittenText: originalText,
        risksReduced: [],
        locksRespected: [],
        integrityScore: 70,
        riskScore: 30,
        error: 'AI service temporarily unavailable',
        metadata: {
          originalLength: originalText.length,
          rewrittenLength: originalText.length,
          analysisConfidence: 0.5,
          constraintsApplied: constraints ? Object.keys(constraints).length : 0
        }
      }, { status: 503 })
    }
    
  } catch (error) {
    console.error('Rewrite API error:', error)
    
    // Even for unexpected errors, return predictable fallback fields
    return NextResponse.json({
      rewrittenText: body?.originalText || '',
      risksReduced: [],
      locksRespected: [],
      integrityScore: 0,
      riskScore: 0,
      error: 'Service temporarily unavailable',
      metadata: {
        originalLength: body?.originalText?.length || 0,
        rewrittenLength: body?.originalText?.length || 0,
        analysisConfidence: 0,
        constraintsApplied: 0
      }
    }, { status: 503 })
  }
}