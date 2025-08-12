import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert, directUpdate, directSelect } from '@/lib/supabase/direct-api'
import { extractStylometricFeatures } from '@/lib/voiceprint/features'
import { extractSemanticSignature } from '@/lib/voiceprint/semantic'
import { generateVoiceprintTraits, generateVoiceprintSummary } from '@/lib/voiceprint/thresholds'
import { validate, generateRequestId, formatValidationError, computeVoiceprintSchema } from '@/lib/validation'


export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  console.log('Voiceprint computation API called', { requestId })
  
  try {
    const body = await request.json()
    
    // Validate request body
    const validation = validate(body, computeVoiceprintSchema, requestId)
    if (!validation.success) {
      return NextResponse.json(
        formatValidationError(validation.error!, requestId),
        { status: 400 }
      )
    }
    
    // Accept both voiceprintId and voiceprint_id for compatibility
    const voiceprintId = validation.data?.voiceprintId || body.voiceprint_id
    if (!voiceprintId) {
      return NextResponse.json(
        { error: 'voiceprintId or voiceprint_id is required', requestId },
        { status: 400 }
      )
    }
    
    // Get authenticated user session
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    console.log('Computing voiceprint:', voiceprintId)
    
    // Fetch voiceprint and verify ownership
    const { data: voiceprintData } = await directSelect(
      'voiceprints',
      `id=eq.${voiceprintId}`,
      '*',
      { accessToken: session.access_token }
    )
    
    if (!voiceprintData || voiceprintData.length === 0) {
      return NextResponse.json(
        { error: 'Voiceprint not found or access denied' },
        { status: 404 }
      )
    }
    
    // voiceprint available if needed for validation
    
    // Fetch samples
    const { data: samplesData } = await directSelect(
      'voiceprint_samples',
      `voiceprint_id=eq.${voiceprintId}`,
      'title,content',
      { accessToken: session.access_token }
    )
    
    if (!samplesData || samplesData.length < 3) {
      return NextResponse.json(
        { error: 'Insufficient samples for computation' },
        { status: 400 }
      )
    }
    
    console.log(`Processing ${samplesData.length} samples for voiceprint computation`)
    
    // Update status to computing
    await directUpdate(
      'voiceprints',
      { status: 'computing' },
      `id=eq.${voiceprintId}`,
      { accessToken: session.access_token }
    )
    
    try {
      // Extract features from all samples
      console.log('Extracting stylometric features...')
      const allTexts = samplesData.map((sample: any) => sample.content)
      const combinedText = allTexts.join('\n\n')
      
      // Compute stylometric metrics (aggregate approach)
      const stylometricMetrics = extractStylometricFeatures(combinedText)
      console.log('Stylometric features extracted')
      
      // Compute semantic signature
      console.log('Extracting semantic signature...')
      const semanticSignature = await extractSemanticSignature(allTexts)
      console.log('Semantic signature extracted')
      
      // Generate traits and thresholds
      console.log('Generating voiceprint traits...')
      const traits = generateVoiceprintTraits(stylometricMetrics, semanticSignature)
      const summary = generateVoiceprintSummary(traits)
      console.log('Traits generated:', traits.signatureTraits.length, 'signature traits,', traits.pitfalls.length, 'pitfalls')
      
      // Store computed traits
      await directInsert('voiceprint_traits', {
        voiceprint_id: voiceprintId,
        version: 1,
        stylometric_metrics: stylometricMetrics,
        semantic_signature: semanticSignature,
        trait_summary: {
          signature_traits: traits.signatureTraits,
          pitfalls: traits.pitfalls,
          summary: summary
        },
        target_thresholds: traits.targetThresholds
      }, { accessToken: session.access_token })
      
      console.log('Traits stored successfully')
      
      // Update voiceprint status to active
      await directUpdate(
        'voiceprints',
        { 
          status: 'active',
          updated_at: new Date().toISOString()
        },
        `id=eq.${voiceprintId}`,
        { accessToken: session.access_token }
      )
      
      console.log('Voiceprint computation completed successfully')
      
      // Return computed results
      return NextResponse.json({
        success: true,
        voiceprintId,
        traits: {
          signature_traits: traits.signatureTraits,
          pitfalls: traits.pitfalls,
          summary
        },
        message: 'Voiceprint computed successfully'
      })
      
    } catch (computationError) {
      console.error('Computation failed:', computationError)
      
      // Update status to failed
      await directUpdate(
        'voiceprints',
        { status: 'failed' },
        `id=eq.${voiceprintId}`,
        { accessToken: session.access_token }
      )
      
      throw computationError
    }
    
  } catch (error) {
    console.error('Voiceprint computation error:', error)
    
    return NextResponse.json(
      { error: 'Failed to compute voiceprint. Please try again.' },
      { status: 500 }
    )
  }
}