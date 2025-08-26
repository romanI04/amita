import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { xaiClient } from '@/lib/xai/client'

// In-memory cache for quick analysis (60 second TTL)
const analysisCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 60 seconds
const MAX_CHARS = 2000

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analysisCache.delete(key)
    }
  }
}, 30000) // Clean every 30 seconds

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { text } = await request.json()
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }
    
    // Enforce character limit
    const trimmedText = text.slice(0, MAX_CHARS)
    if (trimmedText.length < 10) {
      return NextResponse.json(
        { error: 'Text must be at least 10 characters' },
        { status: 400 }
      )
    }
    
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Create hash of text for caching
    const textHash = createHash('md5').update(trimmedText).digest('hex')
    const cacheKey = `${user.id}:${textHash}`
    
    // Check cache first
    const cached = analysisCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        cached: true,
        responseTime: Date.now() - startTime
      })
    }
    
    // Perform lightweight AI analysis
    try {
      // Use a streamlined prompt for faster response
      const prompt = `Analyze this text for AI detection. Return ONLY a JSON object with:
- authenticity: integer 0-100 (human-like quality)
- risk: "low" | "medium" | "high" (AI detection risk)
- band: "safe" | "caution" | "danger" (visual indicator)

Text: "${trimmedText.slice(0, 500)}..."

JSON:`

      const response = await Promise.race([
        xaiClient.analyze(prompt, user.id),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      ]) as any
      
      // Parse AI response
      let result
      try {
        // Extract JSON from response
        const jsonMatch = response.analysis.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON in response')
        }
      } catch {
        // Fallback to heuristic analysis if parsing fails
        const sentences = trimmedText.split(/[.!?]+/).filter(s => s.trim())
        const avgWordsPerSentence = trimmedText.split(/\s+/).length / Math.max(sentences.length, 1)
        
        const risk = avgWordsPerSentence > 20 ? 'high' : 
                     avgWordsPerSentence > 15 ? 'medium' : 'low'
        
        result = {
          authenticity: risk === 'high' ? 40 : risk === 'medium' ? 60 : 80,
          risk,
          band: risk === 'high' ? 'danger' : risk === 'medium' ? 'caution' : 'safe'
        }
      }
      
      // Ensure we have all required fields
      const finalResult = {
        authenticity: Math.min(100, Math.max(0, result.authenticity || 50)),
        risk: result.risk || 'medium',
        band: result.band || (result.risk === 'high' ? 'danger' : result.risk === 'low' ? 'safe' : 'caution')
      }
      
      // Cache the result
      analysisCache.set(cacheKey, {
        data: finalResult,
        timestamp: Date.now()
      })
      
      // Ensure response time is under 150ms
      const responseTime = Date.now() - startTime
      
      return NextResponse.json({
        ...finalResult,
        cached: false,
        responseTime
      })
      
    } catch (error: any) {
      // On timeout or error, return a basic heuristic analysis
      const sentences = trimmedText.split(/[.!?]+/).filter(s => s.trim())
      const avgWordsPerSentence = trimmedText.split(/\s+/).length / Math.max(sentences.length, 1)
      
      const risk = avgWordsPerSentence > 20 ? 'high' : 
                   avgWordsPerSentence > 15 ? 'medium' : 'low'
      
      const result = {
        authenticity: risk === 'high' ? 40 : risk === 'medium' ? 60 : 80,
        risk,
        band: risk === 'high' ? 'danger' : risk === 'medium' ? 'caution' : 'safe',
        fallback: true,
        responseTime: Date.now() - startTime
      }
      
      // Cache even fallback results
      analysisCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
      
      return NextResponse.json(result)
    }
    
  } catch (error) {
    console.error('Quick analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', responseTime: Date.now() - startTime },
      { status: 500 }
    )
  }
}