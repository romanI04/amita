import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { voiceProfileEngine } from '@/lib/voice/voice-profile-engine'
import { z } from 'zod'

// Input validation schema
const analyzeVoiceSchema = z.object({
  user_id: z.string().uuid(),
  voiceprint_id: z.string().uuid(),
  samples: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    content: z.string().min(50),
    word_count: z.number().int().positive()
  })).min(3)
})

export async function POST(request: NextRequest) {
  const requestId = `voice-analyze-${Date.now()}`
  
  try {
    const body = await request.json()
    
    // Validate input
    const validation = analyzeVoiceSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.errors,
          request_id: requestId
        },
        { status: 400 }
      )
    }
    
    const { user_id, voiceprint_id, samples } = validation.data
    
    // Get session for authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || user.id !== user_id) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          request_id: requestId
        },
        { status: 401 }
      )
    }
    
    // Analyze each sample and extract voice traits
    console.log(`[${requestId}] Analyzing ${samples.length} samples for voice profile`)
    
    const sampleTexts = samples.map(s => s.content)
    const voiceTraits = voiceProfileEngine.createVoiceFingerprint(sampleTexts)
    
    // Store analysis results for each sample
    const analysisPromises = samples.map(async (sample, index) => {
      const metrics = voiceProfileEngine.analyzeWritingSample(sample.content)
      
      // Store in voice_sample_analysis table
      const { error: analysisError } = await supabase
        .from('voice_sample_analysis')
        .insert({
          user_id,
          voiceprint_id,
          sample_id: sample.id || null,
          metrics,
          processed_at: new Date().toISOString()
        })
      
      if (analysisError) {
        console.error(`[${requestId}] Failed to store sample analysis:`, analysisError)
      }
      
      return metrics
    })
    
    await Promise.all(analysisPromises)
    
    // Update voiceprint with aggregated traits
    const { data: updatedVoiceprint, error: updateError } = await supabase
      .from('voiceprints')
      .update({
        lexical_features: voiceTraits.lexicalSignature,
        syntactic_features: voiceTraits.syntacticSignature,
        semantic_features: voiceTraits.semanticSignature,
        stylistic_markers: voiceTraits.stylisticSignature,
        confidence_score: voiceTraits.confidence,
        last_analyzed: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', voiceprint_id)
      .select()
      .single()
    
    if (updateError) {
      console.error(`[${requestId}] Failed to update voiceprint:`, updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update voice profile',
          details: updateError.message,
          request_id: requestId
        },
        { status: 500 }
      )
    }
    
    // Store detailed traits in voiceprint_traits table
    const { error: traitsError } = await supabase
      .from('voiceprint_traits')
      .upsert({
        voiceprint_id,
        version: 1,
        stylometric_metrics: {
          lexical: voiceTraits.lexicalSignature,
          syntactic: voiceTraits.syntacticSignature,
          semantic: voiceTraits.semanticSignature,
          stylistic: voiceTraits.stylisticSignature
        },
        semantic_signature: {
          centroidVector: null, // Would be computed with embeddings
          semanticCohesion: voiceTraits.consistency,
          topicDiversity: voiceTraits.semanticSignature.topicalInterests.length,
          distinctiveUnigrams: voiceTraits.lexicalSignature.preferredWords.slice(0, 10).map((word, i) => ({
            word,
            frequency: 1 - (i * 0.05),
            distinctiveness: 0.8 - (i * 0.05)
          })),
          distinctiveBigrams: voiceTraits.lexicalSignature.phrasePatterns.slice(0, 5).map((phrase, i) => ({
            phrase,
            frequency: 1 - (i * 0.1),
            distinctiveness: 0.7 - (i * 0.1)
          })),
          distinctiveTrigrams: [],
          vocabularyRichness: voiceTraits.lexicalSignature.vocabularyRichness,
          conceptualDepth: 0.5 + (voiceTraits.semanticSignature.formalityLevel * 0.5),
          writingTempo: voiceTraits.syntacticSignature.sentenceComplexity / 20
        },
        trait_summary: {
          signature_traits: [
            {
              id: 'vocabulary',
              name: 'Vocabulary Richness',
              description: `Your vocabulary diversity is ${voiceTraits.lexicalSignature.vocabularyRichness > 0.7 ? 'excellent' : voiceTraits.lexicalSignature.vocabularyRichness > 0.5 ? 'good' : 'developing'}`,
              strength: voiceTraits.lexicalSignature.vocabularyRichness,
              category: 'lexical' as const
            },
            {
              id: 'sentence_complexity',
              name: 'Sentence Structure',
              description: `You tend to write ${voiceTraits.syntacticSignature.sentenceComplexity > 20 ? 'complex' : voiceTraits.syntacticSignature.sentenceComplexity > 12 ? 'moderate' : 'simple'} sentences`,
              strength: Math.min(1, voiceTraits.syntacticSignature.sentenceComplexity / 30),
              category: 'structural' as const
            },
            {
              id: 'tone',
              name: 'Emotional Tone',
              description: `Your writing tone is predominantly ${voiceTraits.semanticSignature.tonalProfile}`,
              strength: 0.8,
              category: 'semantic' as const
            },
            {
              id: 'formality',
              name: 'Formality Level',
              description: `Your writing style is ${voiceTraits.semanticSignature.formalityLevel > 0.7 ? 'formal' : voiceTraits.semanticSignature.formalityLevel > 0.4 ? 'balanced' : 'casual'}`,
              strength: voiceTraits.semanticSignature.formalityLevel,
              category: 'stylistic' as const
            }
          ],
          pitfalls: generatePitfalls(voiceTraits),
          summary: generateSummary(voiceTraits)
        },
        target_thresholds: {
          typeTokenRatio: { 
            min: Math.max(0.3, voiceTraits.lexicalSignature.vocabularyRichness - 0.2),
            max: Math.min(1, voiceTraits.lexicalSignature.vocabularyRichness + 0.2),
            optimal: voiceTraits.lexicalSignature.vocabularyRichness
          },
          averageWordLength: {
            min: Math.max(3, voiceTraits.lexicalSignature.avgWordLength - 1),
            max: voiceTraits.lexicalSignature.avgWordLength + 1,
            optimal: voiceTraits.lexicalSignature.avgWordLength
          },
          averageSentenceLength: {
            min: Math.max(5, voiceTraits.syntacticSignature.sentenceComplexity - 5),
            max: voiceTraits.syntacticSignature.sentenceComplexity + 5,
            optimal: voiceTraits.syntacticSignature.sentenceComplexity
          },
          complexSentenceRatio: {
            min: 0.1,
            max: 0.6,
            optimal: 0.3
          },
          formalityScore: {
            min: Math.max(0, voiceTraits.semanticSignature.formalityLevel - 0.2),
            max: Math.min(1, voiceTraits.semanticSignature.formalityLevel + 0.2),
            optimal: voiceTraits.semanticSignature.formalityLevel
          },
          vocabularyRichness: {
            min: Math.max(0.3, voiceTraits.lexicalSignature.vocabularyRichness - 0.1),
            max: Math.min(1, voiceTraits.lexicalSignature.vocabularyRichness + 0.1),
            optimal: voiceTraits.lexicalSignature.vocabularyRichness
          },
          semanticCohesion: {
            min: 0.6,
            max: 0.95,
            optimal: 0.8
          },
          conceptualDepth: {
            min: 0.3,
            max: 0.9,
            optimal: 0.6
          }
        }
      })
    
    if (traitsError) {
      console.error(`[${requestId}] Failed to store voice traits:`, traitsError)
    }
    
    console.log(`[${requestId}] Voice profile analysis complete`)
    
    return NextResponse.json({
      success: true,
      voiceprint_id,
      traits: voiceTraits,
      confidence: voiceTraits.confidence,
      sample_count: samples.length,
      request_id: requestId
    })
    
  } catch (error) {
    console.error(`[${requestId}] Voice analysis error:`, error)
    return NextResponse.json(
      { 
        error: 'Failed to analyze voice profile',
        details: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      },
      { status: 500 }
    )
  }
}

// Helper function to generate pitfalls based on voice traits
function generatePitfalls(traits: any): any[] {
  const pitfalls = []
  
  if (traits.lexicalSignature.vocabularyRichness < 0.5) {
    pitfalls.push({
      id: 'vocab-diversity',
      name: 'Limited Vocabulary',
      description: 'Your vocabulary could be more diverse',
      severity: 'medium' as const,
      suggestion: 'Try using synonyms and varied expressions',
      category: 'clarity' as const
    })
  }
  
  if (traits.syntacticSignature.sentenceComplexity > 25) {
    pitfalls.push({
      id: 'complex-sentences',
      name: 'Overly Complex Sentences',
      description: 'Some sentences may be hard to follow',
      severity: 'low' as const,
      suggestion: 'Consider breaking long sentences into shorter ones',
      category: 'clarity' as const
    })
  }
  
  if (traits.stylisticSignature.voiceCharacteristics.contractionUsage < 0.01) {
    pitfalls.push({
      id: 'too-formal',
      name: 'Overly Formal',
      description: 'Your writing may feel stiff in casual contexts',
      severity: 'low' as const,
      suggestion: 'Consider using contractions in informal writing',
      category: 'formality' as const
    })
  }
  
  return pitfalls
}

// Helper function to generate summary
function generateSummary(traits: any): string {
  const formality = traits.semanticSignature.formalityLevel > 0.7 ? 'formal' : 
                    traits.semanticSignature.formalityLevel > 0.4 ? 'balanced' : 'casual'
  const complexity = traits.syntacticSignature.sentenceComplexity > 20 ? 'complex' : 
                     traits.syntacticSignature.sentenceComplexity > 12 ? 'moderate' : 'simple'
  
  return `Your writing style is ${formality} with ${complexity} sentence structures. ` +
         `You demonstrate ${traits.lexicalSignature.vocabularyRichness > 0.7 ? 'excellent' : 'good'} vocabulary diversity ` +
         `and your tone tends to be ${traits.semanticSignature.tonalProfile}. ` +
         `This voice profile will help preserve your unique writing style.`
}