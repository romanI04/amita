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
    
    // Handle both formats - with prompt or with sections
    const { prompt, originalText, constraints, options, text, sections } = validation.data as any
    
    // Use text if originalText is not provided
    const textToRewrite = originalText || text || ''
    
    // Build prompt from sections if not provided
    const rewritePrompt = prompt || buildPromptFromSections(textToRewrite, sections)
    
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
              "riskDelta": <number -50 to 0, negative means risk reduction>,
              "authenticityDelta": <number 0 to 30, positive means authenticity increase>,
              "voiceTraitPreserved": "<main voice trait that was preserved>",
              "voiceTraitEnhanced": "<optional voice trait that was enhanced>",
              "locksRespected": ["<list of constraint types respected>"],
              "risksReduced": ["<list of risk types addressed>"],
              "analysisConfidence": <number 0.6-1.0>
            }`
          },
          {
            role: 'user',
            content: rewritePrompt
          }
        ],
        model: 'grok-4',
        temperature: 0.3,
        max_tokens: 4000  // Fixed limit for reasoning + output
      })
      
      if (!rewriteResponse?.content) {
        throw new Error('No response from AI service')
      }
      
      // Parse the JSON response from Grok with solid fallback
      let rewriteResult
      try {
        const { jsonrepair } = await import('jsonrepair')
        const repairedContent = jsonrepair(rewriteResponse.content.trim())
        rewriteResult = JSON.parse(repairedContent)
      } catch (parseError) {
        console.error('JSON parse failed, using fallback response:', parseError, rewriteResponse.content?.substring(0, 500))
        
        // Try to extract rewritten text from the response even if not JSON
        const rewrittenText = extractRewrittenText(rewriteResponse.content, textToRewrite)
        
        return NextResponse.json({
          rewrittenText,
          risksReduced: [],
          locksRespected: [],
          integrityScore: 85,
          riskScore: 15,
          metadata: {
            originalLength: textToRewrite.length,
            rewrittenLength: rewrittenText.length,
            analysisConfidence: 0.7,
            constraintsApplied: constraints ? Object.keys(constraints).length : 0
          }
        })
      }
      
      const { 
        rewrittenText,
        integrityScore, 
        riskScore,
        riskDelta,
        authenticityDelta,
        voiceTraitPreserved,
        voiceTraitEnhanced,
        locksRespected, 
        risksReduced, 
        analysisConfidence 
      } = rewriteResult
      
      // Validate required fields from AI response with fallbacks
      if (!rewrittenText || typeof integrityScore !== 'number' || typeof riskScore !== 'number') {
        console.error('AI service response missing required fields:', rewriteResult)
        
        // Use the text even if metadata is incomplete
        return NextResponse.json({
          rewrittenText: rewrittenText || textToRewrite,
          risksReduced: risksReduced || [],
          locksRespected: locksRespected || [],
          integrityScore: integrityScore || 85,
          riskScore: riskScore || 15,
          metadata: {
            originalLength: textToRewrite.length,
            rewrittenLength: (rewrittenText || textToRewrite).length,
            analysisConfidence: analysisConfidence || 0.7,
            constraintsApplied: constraints ? Object.keys(constraints).length : 0
          }
        })
      }
      
      return NextResponse.json({
        rewrittenText,
        risksReduced: risksReduced || [],
        locksRespected: locksRespected || [],
        integrityScore,
        riskScore,
        riskDelta: riskDelta || -10,
        authenticityDelta: authenticityDelta || 5,
        voiceTraitPreserved: voiceTraitPreserved || 'natural cadence',
        voiceTraitEnhanced: voiceTraitEnhanced || null,
        metadata: {
          originalLength: textToRewrite.length,
          rewrittenLength: rewrittenText.length,
          analysisConfidence,
          constraintsApplied: constraints ? Object.keys(constraints).length : 0
        }
      })
      
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Return original text with error indication - always 503, never 500
      return NextResponse.json({
        rewrittenText: textToRewrite,
        risksReduced: [],
        locksRespected: [],
        integrityScore: 70,
        riskScore: 30,
        error: 'AI service temporarily unavailable',
        metadata: {
          originalLength: textToRewrite.length,
          rewrittenLength: textToRewrite.length,
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

// Helper function to build prompt from detected sections
function buildPromptFromSections(text: string, sections: any[]): string {
  if (!sections || sections.length === 0) {
    return `Please rewrite the following text to make it sound more natural and human-like while preserving the original meaning:\n\n${text}`
  }
  
  const improvements = sections.map((section, i) => 
    `${i + 1}. "${section.text || section.reason}" -> Suggestion: ${section.suggestion || 'Make more natural'}`
  ).join('\n')
  
  return `Rewrite the following text to address these AI-detection issues:

${improvements}

Original text:
${text}

IMPORTANT: Apply ALL the suggested improvements while maintaining the original meaning and natural flow.`
}

// Helper function to extract rewritten text from response
function extractRewrittenText(response: string, originalText: string): string {
  // Try to find rewritten text in the response
  const rewrittenMatch = response.match(/"rewrittenText"\s*:\s*"([^"]+)"/)
  if (rewrittenMatch) {
    return rewrittenMatch[1]
  }
  
  // If the response contains the text directly (not JSON)
  const lines = response.split('\n').filter(line => line.trim().length > 0)
  
  // Look for a substantial block of text that's not the prompt
  for (const line of lines) {
    if (line.length > originalText.length * 0.5 && !line.includes('rewrite') && !line.includes('Rewrite')) {
      return line.trim()
    }
  }
  
  // If we can't find anything, return the original
  return originalText
}