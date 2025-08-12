import type { XAIAnalysisRequest, XAIAnalysisResponse, AnalysisResponse, VoiceFingerprint, AIDetectedSection, StyleCharacteristics } from '@/types'

const XAI_API_URL = process.env.XAI_API_URL || 'https://api.x.ai/v1'
const XAI_API_KEY = process.env.XAI_API_KEY

export class XAIClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || XAI_API_KEY || ''
    this.baseUrl = baseUrl || XAI_API_URL
    
    console.log('XAI Client initialized:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey.length,
      baseUrl: this.baseUrl
    })
  }

  /**
   * General chat completions method for any text generation task
   */
  async chatCompletion(options: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
    model?: string
    temperature?: number
    max_tokens?: number
    stream?: boolean
  }): Promise<{ content: string; metadata?: any }> {
    if (!this.apiKey) {
      throw new Error('XAI API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: options.model || 'grok-4',
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1024,
        stream: options.stream || false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('XAI Chat API error:', error)
      throw new Error(`XAI Chat API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    
    // Extract content from the response
    const content = result.choices?.[0]?.message?.content || ''
    
    return {
      content,
      metadata: {
        model: result.model,
        usage: result.usage,
        finish_reason: result.choices?.[0]?.finish_reason
      }
    }
  }

  async analyze(text: string, userId: string): Promise<AnalysisResponse> {
    console.log('Starting XAI analysis for user:', userId, 'text length:', text.length)
    
    if (!this.apiKey) {
      console.error('XAI API key not configured')
      throw new Error('XAI API key not configured')
    }

    try {
      // Main analysis request for AI detection and style analysis
      console.log('Building analysis prompt...')
      const analysisPrompt = this.buildAnalysisPrompt(text)
      
      console.log('Making analysis request to XAI...')
      const analysisResult = await this.makeRequest({
        messages: [
          {
            role: 'system',
            content: 'You are an expert writing analyst specializing in detecting AI-generated content and analyzing authentic human writing styles. Provide detailed, structured analysis in JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        model: 'grok-4',
        temperature: 0.1,
        max_tokens: 2048
      })

      // Parse the analysis result
      const analysis = this.parseAnalysisResult(analysisResult.choices[0].message.content)

      // Generate improvement suggestions
      const suggestionPrompt = this.buildSuggestionPrompt(text, analysis)
      const suggestionResult = await this.makeRequest({
        messages: [
          {
            role: 'system',
            content: 'You are a writing coach helping users maintain their authentic voice while improving their writing skills. Provide specific, actionable suggestions.'
          },
          {
            role: 'user',
            content: suggestionPrompt
          }
        ],
        model: 'grok-4',
        temperature: 0.3,
        max_tokens: 1024
      })

      const suggestions = this.parseSuggestions(suggestionResult.choices[0].message.content)

      return {
        ai_confidence_score: analysis.ai_confidence_score,
        authenticity_score: analysis.authenticity_score,
        voice_fingerprint: analysis.voice_fingerprint,
        detected_sections: analysis.detected_sections,
        improvement_suggestions: suggestions,
        style_analysis: analysis.style_analysis
      }

    } catch (error) {
      console.error('XAI Analysis Error:', error)
      
      // Preserve specific error messages
      if (error instanceof Error) {
        if (error.message.startsWith('XAI_')) {
          throw error // Re-throw specific XAI errors
        }
        if (error.name === 'AbortError') {
          throw new Error('XAI_TIMEOUT: Request timed out after 30 seconds. Please try again with shorter text.')
        }
      }
      
      throw new Error('XAI_UNKNOWN_ERROR: Failed to analyze text with XAI API')
    }
  }

  private async makeRequest(request: XAIAnalysisRequest): Promise<XAIAnalysisResponse> {
    console.log('Making XAI API request:', {
      url: `${this.baseUrl}/chat/completions`,
      model: request.model,
      messages: request.messages?.length,
      hasApiKey: !!this.apiKey
    })

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          ...request,
          stream: false // Explicitly set stream to false as per docs
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      console.log('XAI API response status:', response.status)

      if (!response.ok) {
        const error = await response.text()
        console.error('XAI API error response:', error)
        
        // Specific error handling for common issues
        if (response.status === 503) {
          throw new Error('XAI_SERVICE_UNAVAILABLE: The AI service is temporarily unavailable. Please try again later.')
        } else if (response.status === 429) {
          throw new Error('XAI_RATE_LIMIT: Too many requests. Please wait a moment before trying again.')
        } else if (response.status === 401) {
          throw new Error('XAI_AUTH_ERROR: Invalid API key. Please check your configuration.')
        } else if (response.status === 400) {
          throw new Error('XAI_BAD_REQUEST: Invalid request format. Text may be too long or contain invalid characters.')
        }
        
        throw new Error(`XAI_API_ERROR: ${response.status} - ${error}`)
      }

      const result = await response.json()
      console.log('XAI API response:', {
        id: result.id,
        model: result.model,
        choices: result.choices?.length,
        usage: result.usage
      })

      return result
    } catch (error) {
      console.error('XAI API request error:', error)
      
      if (error instanceof Error) {
        if (error.message.startsWith('XAI_')) {
          throw error // Re-throw specific XAI errors
        }
        if (error.name === 'AbortError') {
          throw new Error('XAI_TIMEOUT: Request timed out after 30 seconds. Please try again with shorter text.')
        }
      }
      
      throw new Error('XAI_NETWORK_ERROR: Failed to connect to XAI API')
    }
  }

  private buildAnalysisPrompt(text: string): string {
    return `
Analyze the following text for AI detection and authentic writing style characteristics. Return a JSON response with the following structure:

{
  "ai_confidence_score": <number 0-100>,
  "authenticity_score": <number 0-100>,
  "voice_fingerprint": {
    "avg_sentence_length": <number>,
    "vocabulary_diversity": <number 0-1>,
    "tone_characteristics": {
      "formal": <number 0-1>,
      "casual": <number 0-1>,
      "technical": <number 0-1>,
      "creative": <number 0-1>
    },
    "style_patterns": {
      "passive_voice_usage": <number 0-1>,
      "complex_sentences": <number 0-1>,
      "punctuation_style": {}
    },
    "characteristic_words": [<array of distinctive words>]
  },
  "detected_sections": [
    {
      "start_index": <number>,
      "end_index": <number>,
      "confidence": <number 0-100>,
      "reason": "<explanation>"
    }
  ],
  "style_analysis": {
    "sentence_structure": {
      "avg_length": <number>,
      "complexity_score": <number 0-100>,
      "variety_score": <number 0-100>
    },
    "vocabulary": {
      "diversity_index": <number 0-100>,
      "sophistication_level": <number 0-100>,
      "unique_word_ratio": <number 0-1>
    },
    "tone_analysis": {
      "formality": <number 0-100>,
      "emotion": <number 0-100>,
      "confidence": <number 0-100>
    }
  }
}

Text to analyze:
"${text}"

Focus on:
1. Detecting potential AI-generated sections based on patterns, repetition, and unnatural phrasing
2. Identifying unique human characteristics like personal voice, imperfections, and natural flow
3. Analyzing writing style patterns that indicate authentic human expression
4. Measuring consistency with genuine human writing patterns
`
  }

  private buildSuggestionPrompt(text: string, analysis: any): string {
    return `
Based on the writing analysis provided, generate 3-5 specific, actionable suggestions to help the writer maintain their authentic voice and improve their writing skills.

Analysis Summary:
- AI Confidence Score: ${analysis.ai_confidence_score}%
- Authenticity Score: ${analysis.authenticity_score}%
- Main concerns: ${analysis.detected_sections.map((s: any) => s.reason).join(', ')}

Original Text:
"${text}"

Provide suggestions as a JSON array of strings, focusing on:
1. Preserving authentic human voice characteristics
2. Reducing AI detection risk while maintaining quality
3. Strengthening personal writing style
4. Building confidence in natural writing abilities

Format: ["suggestion 1", "suggestion 2", "suggestion 3", ...]
`
  }

  private parseAnalysisResult(content: string): any {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in analysis response')
      }
      
      const analysis = JSON.parse(jsonMatch[0])
      
      // Validate required fields - no synthetic defaults
      if (typeof analysis.ai_confidence_score !== 'number' || 
          typeof analysis.authenticity_score !== 'number' ||
          !analysis.voice_fingerprint ||
          !analysis.style_analysis) {
        throw new Error('Incomplete analysis response from AI - missing required fields')
      }
      
      return {
        ai_confidence_score: Math.min(100, Math.max(0, analysis.ai_confidence_score)),
        authenticity_score: Math.min(100, Math.max(0, analysis.authenticity_score)),
        voice_fingerprint: analysis.voice_fingerprint,
        detected_sections: analysis.detected_sections || [],
        style_analysis: analysis.style_analysis
      }
    } catch (error) {
      console.error('Failed to parse analysis result:', error)
      // Throw error instead of returning synthetic data
      throw new Error('XAI_PARSE_ERROR: Failed to parse AI analysis response. The service may be experiencing issues.')
    }
  }

  private parseSuggestions(content: string): string[] {
    try {
      // Try to extract JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback: extract suggestions from text
      const lines = content.split('\n').filter(line => 
        line.trim() && (line.includes('-') || line.includes('1.') || line.includes('•'))
      )
      
      return lines.map(line => 
        line.replace(/^[-•\d.\s]*/, '').trim()
      ).slice(0, 5)
      
    } catch (error) {
      console.error('Failed to parse suggestions:', error)
      // Return empty array instead of synthetic suggestions
      return []
    }
  }

  // Removed synthetic default methods - no mock data allowed
}

export const xaiClient = new XAIClient()