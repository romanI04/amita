import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { xaiClient } from '@/lib/xai/client'

export async function POST(request: NextRequest) {
  try {
    const { profileId, flaggedLineCount, riskDrivers, coverage } = await request.json()
    
    // Validate input
    if (!profileId || typeof flaggedLineCount !== 'number') {
      return NextResponse.json(
        { error: 'Profile ID and flagged line count are required' }, 
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
      // Create risk estimation prompt
      const estimationPrompt = `
        Based on the following voice profile data, provide a risk reduction estimate:
        
        - Flagged sections: ${flaggedLineCount}
        - Risk drivers: ${JSON.stringify(riskDrivers)}
        - Profile coverage: ${JSON.stringify(coverage)}
        
        Please respond with ONLY a JSON object in this exact format:
        {
          "reduction": <number between 5-40>,
          "confidence": "<low|medium|high>",
          "reasoning": "<brief explanation>"
        }
        
        Base your estimate on:
        - More flagged sections = higher potential reduction
        - High-risk drivers = more improvement opportunity  
        - Better coverage = higher confidence in estimate
      `
      
      const response = await xaiClient.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are a writing analysis expert. Return only valid JSON with accurate risk reduction estimates. Be conservative but realistic.'
          },
          {
            role: 'user',
            content: estimationPrompt
          }
        ],
        model: 'grok-4',
        temperature: 0.1,
        max_tokens: 200
      })
      
      if (!response.content) {
        throw new Error('No response from estimation service')
      }
      
      // Parse the JSON response
      let estimation
      try {
        estimation = JSON.parse(response.content.trim())
      } catch (parseError) {
        console.error('Failed to parse estimation response:', response.content)
        throw new Error('Invalid response format from estimation service')
      }
      
      // Validate response structure
      if (typeof estimation.reduction !== 'number' || !estimation.confidence) {
        throw new Error('Incomplete estimation response')
      }
      
      // Ensure reduction is within valid range
      const reduction = Math.max(0, Math.min(100, estimation.reduction))
      
      return NextResponse.json({
        reduction,
        confidence: estimation.confidence,
        reasoning: estimation.reasoning || 'Estimate based on profile analysis',
        metadata: {
          profileId,
          flaggedLineCount,
          timestamp: new Date().toISOString()
        }
      })
      
    } catch (aiError) {
      console.error('AI estimation error:', aiError)
      
      // Return service unavailable instead of synthetic data
      return NextResponse.json(
        { 
          error: 'Risk estimation service temporarily unavailable',
          available: false,
          message: 'The risk estimation service is currently unavailable. Please try again later.'
        },
        { status: 503 }
      )
    }
    
  } catch (error) {
    console.error('Risk estimate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}