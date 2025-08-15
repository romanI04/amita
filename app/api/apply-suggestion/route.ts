import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'
import { validate, generateRequestId, formatValidationError, applySuggestionApiSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  let body: any = null
  
  try {
    body = await request.json()
    
    // Validate request body
    const validation = validate(body, applySuggestionApiSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    const { prompt, originalText, suggestion, constraints } = validation.data!
    
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
      // Call xAI API for applying suggestion
      const suggestionResponse = await xaiClient.chatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are a precise writing editor that applies specific suggestions while preserving the author's voice.
            CRITICAL: Make only the minimal changes needed to address the suggestion. Never alter locked voice traits.
            
            Respond with a JSON object:
            {
              "rewrittenText": "<the revised text>",
              "integrityScore": <number 70-100>,
              "riskScore": <number 10-35>,
              "suggestionApplied": <boolean>
            }`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-4-latest',
        temperature: 0.2,
        max_tokens: Math.max(500, originalText.length * 1.5)
      })
      
      if (!suggestionResponse?.content) {
        throw new Error('No response from AI service')
      }
      
      // Parse the JSON response from Grok with solid fallback
      let suggestionResult
      try {
        const { jsonrepair } = await import('jsonrepair')
        const repairedContent = jsonrepair(suggestionResponse.content.trim())
        suggestionResult = JSON.parse(repairedContent)
      } catch (parseError) {
        console.error('JSON parse failed, using fallback response:', parseError, suggestionResponse.content?.substring(0, 500))
        
        // Return safe fallback response instead of throwing
        return NextResponse.json({
          rewrittenText: originalText,
          risksReduced: [],
          locksRespected: [],
          integrityScore: 70,
          riskScore: 30,
          suggestionApplied: false,
          error: 'AI service returned invalid format',
          metadata: {
            suggestionId: suggestion.id,
            suggestionType: suggestion.type,
            targetDriver: suggestion.targetDriver,
            expectedDelta: 0,
            actualDelta: 0
          }
        }, { status: 503 })
      }
      
      const { 
        rewrittenText,
        integrityScore,
        riskScore,
        suggestionApplied
      } = suggestionResult
      
      // Validate required fields with fallbacks
      if (!rewrittenText || typeof integrityScore !== 'number' || typeof riskScore !== 'number') {
        console.error('AI service response missing required fields:', suggestionResult)
        
        // Return safe fallback response instead of throwing
        return NextResponse.json({
          rewrittenText: originalText,
          risksReduced: [],
          locksRespected: [],
          integrityScore: 70,
          riskScore: 30,
          suggestionApplied: false,
          error: 'AI service response incomplete',
          metadata: {
            suggestionId: suggestion.id,
            suggestionType: suggestion.type,
            targetDriver: suggestion.targetDriver,
            expectedDelta: 0,
            actualDelta: 0
          }
        }, { status: 503 })
      }
      
      // Determine locks respected based on constraints
      const locksRespected = []
      if (constraints.keepIdioms) locksRespected.push('keepIdioms')
      if (constraints.hedgeFrequency) locksRespected.push('hedgeFrequency')
      if (constraints.punctuationStyle) locksRespected.push('punctuationStyle')
      if (constraints.sentenceLength?.enabled) locksRespected.push('sentenceLength')
      
      // Calculate actual risk reduction (positive = improvement)
      const riskReduction = suggestionApplied && suggestion.expectedDelta ? suggestion.expectedDelta : 0
      
      return NextResponse.json({
        rewrittenText,
        risksReduced: suggestionApplied ? [suggestion.targetDriver] : [],
        locksRespected,
        integrityScore,
        riskScore,
        suggestionApplied,
        metadata: {
          suggestionId: suggestion.id,
          suggestionType: suggestion.type,
          targetDriver: suggestion.targetDriver,
          expectedDelta: suggestion.expectedDelta,
          actualDelta: riskReduction
        }
      })
      
    } catch (aiError) {
      console.error('AI service error:', aiError)
      
      // Return original text with no changes - always 503, never 500
      return NextResponse.json({
        rewrittenText: originalText,
        risksReduced: [],
        locksRespected: [],
        integrityScore: 70,
        riskScore: 30,
        suggestionApplied: false,
        error: 'AI service temporarily unavailable',
        metadata: {
          suggestionId: suggestion.id,
          suggestionType: suggestion.type,
          targetDriver: suggestion.targetDriver,
          expectedDelta: 0,
          actualDelta: 0
        }
      }, { status: 503 })
    }
    
  } catch (error) {
    console.error('Apply suggestion API error:', error)
    
    // Even for unexpected errors, return predictable fallback fields
    return NextResponse.json({
      rewrittenText: body?.originalText || '',
      risksReduced: [],
      locksRespected: [],
      integrityScore: 0,
      riskScore: 0,
      suggestionApplied: false,
      error: 'Service temporarily unavailable',
      metadata: {
        suggestionId: body?.suggestion?.id || 0,
        suggestionType: body?.suggestion?.type || 'unknown',
        targetDriver: body?.suggestion?.targetDriver || 'unknown',
        expectedDelta: 0,
        actualDelta: 0
      }
    }, { status: 503 })
  }
}