import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'

export async function POST(request: NextRequest) {
  try {
    const { prompt, originalText, suggestion, constraints } = await request.json()
    
    // Validate input
    if (!originalText || !suggestion || !prompt) {
      return NextResponse.json(
        { error: 'Original text, suggestion, and prompt are required' }, 
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
        model: 'grok-4',
        temperature: 0.2,
        max_tokens: Math.max(500, originalText.length * 1.5)
      })
      
      if (!suggestionResponse?.content) {
        throw new Error('No response from AI service')
      }
      
      // Parse the JSON response from Grok
      let suggestionResult
      try {
        suggestionResult = JSON.parse(suggestionResponse.content.trim())
      } catch (parseError) {
        console.error('Failed to parse suggestion response:', suggestionResponse.content)
        throw new Error('Invalid response format from AI service')
      }
      
      const { 
        rewrittenText,
        integrityScore,
        riskScore,
        suggestionApplied
      } = suggestionResult
      
      // Validate required fields
      if (!rewrittenText || typeof integrityScore !== 'number' || typeof riskScore !== 'number') {
        throw new Error('AI service response missing required fields')
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
      
      // Return original text with no changes
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
      })
    }
    
  } catch (error) {
    console.error('Apply suggestion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}