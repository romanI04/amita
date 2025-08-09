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
      throw new Error('Failed to analyze text with XAI API')
    }
  }

  private async makeRequest(request: XAIAnalysisRequest): Promise<XAIAnalysisResponse> {
    console.log('Making XAI API request:', {
      url: `${this.baseUrl}/chat/completions`,
      model: request.model,
      messages: request.messages?.length,
      hasApiKey: !!this.apiKey
    })

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        ...request,
        stream: false // Explicitly set stream to false as per docs
      })
    })

    console.log('XAI API response status:', response.status)

    if (!response.ok) {
      const error = await response.text()
      console.error('XAI API error response:', error)
      throw new Error(`XAI API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log('XAI API response:', {
      id: result.id,
      model: result.model,
      choices: result.choices?.length,
      usage: result.usage
    })

    return result
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
      
      // Validate and set defaults
      return {
        ai_confidence_score: Math.min(100, Math.max(0, analysis.ai_confidence_score || 0)),
        authenticity_score: Math.min(100, Math.max(0, analysis.authenticity_score || 100)),
        voice_fingerprint: analysis.voice_fingerprint || this.getDefaultVoiceFingerprint(),
        detected_sections: analysis.detected_sections || [],
        style_analysis: analysis.style_analysis || this.getDefaultStyleAnalysis()
      }
    } catch (error) {
      console.error('Failed to parse analysis result:', error)
      // Return safe defaults
      return {
        ai_confidence_score: 0,
        authenticity_score: 85,
        voice_fingerprint: this.getDefaultVoiceFingerprint(),
        detected_sections: [],
        style_analysis: this.getDefaultStyleAnalysis()
      }
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
      return [
        'Continue writing in your natural voice - your unique style is valuable',
        'Focus on personal experiences and genuine insights',
        'Vary your sentence structure to maintain authentic flow'
      ]
    }
  }

  private getDefaultVoiceFingerprint(): VoiceFingerprint {
    return {
      avg_sentence_length: 18,
      vocabulary_diversity: 0.7,
      tone_characteristics: {
        formal: 0.5,
        casual: 0.5,
        technical: 0.3,
        creative: 0.4
      },
      style_patterns: {
        passive_voice_usage: 0.2,
        complex_sentences: 0.3,
        punctuation_style: {
          periods: 0.7,
          commas: 0.8,
          semicolons: 0.1,
          exclamation: 0.05
        }
      },
      characteristic_words: []
    }
  }

  private getDefaultStyleAnalysis(): StyleCharacteristics {
    return {
      sentence_structure: {
        avg_length: 18,
        complexity_score: 60,
        variety_score: 75
      },
      vocabulary: {
        diversity_index: 70,
        sophistication_level: 65,
        unique_word_ratio: 0.8
      },
      tone_analysis: {
        formality: 50,
        emotion: 40,
        confidence: 70
      }
    }
  }
}

export const xaiClient = new XAIClient()