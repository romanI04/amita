import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'

export async function POST(request: NextRequest) {
  try {
    const { prompt, originalText, constraints, options } = await request.json()
    
    // Validate input
    if (!originalText || !prompt) {
      return NextResponse.json(
        { error: 'Original text and prompt are required' }, 
        { status: 400 }
      )
    }
    
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
      
      // Parse the JSON response from Grok
      let rewriteResult
      try {
        rewriteResult = JSON.parse(rewriteResponse.content.trim())
      } catch (parseError) {
        console.error('Failed to parse rewrite response:', rewriteResponse.content)
        throw new Error('Invalid response format from AI service')
      }
      
      const { 
        rewrittenText,
        integrityScore, 
        riskScore, 
        locksRespected, 
        risksReduced, 
        analysisConfidence 
      } = rewriteResult
      
      // Validate required fields from AI response
      if (!rewrittenText || typeof integrityScore !== 'number' || typeof riskScore !== 'number') {
        throw new Error('AI service response missing required fields')
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
          constraintsApplied: Object.keys(constraints).length
        }
      })
      
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Return original text with error indication
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
          wordLengthChange: 0,
          constraintsApplied: 0
        }
      })
    }
    
  } catch (error) {
    console.error('Rewrite API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}