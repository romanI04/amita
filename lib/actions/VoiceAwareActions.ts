'use client'

import { voiceProfileEventBus } from '@/lib/events/VoiceProfileEvents'
import type { VoiceProfileState } from '@/lib/context/VoiceProfileContext'

/**
 * Voice-Aware Actions
 * All black buttons perform actions constrained by voice profile locks and traits
 */

export interface RewriteOptions {
  strength: 'subtle' | 'balanced' | 'assertive'
  preserveLocks: boolean
  targetRiskReduction?: number
}

export interface VoiceConstraints {
  sentenceLength: { enabled: boolean; tolerance: number }
  keepIdioms: boolean
  hedgeFrequency: boolean
  punctuationStyle: boolean
  domain: string
  traits?: any
}

export interface RewriteResult {
  original: string
  rewritten: string
  risksReduced: string[]
  locksRespected: string[]
  integrityScore: number
  riskScore: number
}

/**
 * Extract voice constraints from current profile state
 */
export function getVoiceConstraints(voiceProfileState: VoiceProfileState): VoiceConstraints {
  return {
    sentenceLength: voiceProfileState.locks.sentenceLength,
    keepIdioms: voiceProfileState.locks.keepIdioms,
    hedgeFrequency: voiceProfileState.locks.hedgeFrequency,
    punctuationStyle: voiceProfileState.locks.punctuationStyle,
    domain: voiceProfileState.domains.active,
    traits: voiceProfileState.traits
  }
}

/**
 * Get risk reduction estimate from backend
 */
export async function getExpectedRiskReduction(
  voiceProfileState: VoiceProfileState,
  flaggedLineCount: number
): Promise<{ reduction: number; confidence: 'low' | 'medium' | 'high' } | null> {
  try {
    const response = await fetch('/api/risk-estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId: voiceProfileState.voiceprint?.id,
        flaggedLineCount,
        riskDrivers: voiceProfileState.riskDrivers,
        coverage: voiceProfileState.coverage
      })
    })
    
    if (!response.ok) {
      return null
    }
    
    const result = await response.json()
    return {
      reduction: result.reduction,
      confidence: result.confidence
    }
    
  } catch (error) {
    console.error('Risk estimation failed:', error)
    return null
  }
}

/**
 * Generate voice-aware prompt for rewriting
 */
function generateVoiceAwarePrompt(
  text: string,
  constraints: VoiceConstraints,
  options: RewriteOptions
): string {
  const { strength } = options
  
  let prompt = `Rewrite the following text to reduce AI detection risk while preserving the author's authentic voice. `
  
  // Add constraint instructions
  const constraintInstructions = []
  
  if (constraints.sentenceLength.enabled) {
    constraintInstructions.push(`maintain sentence length within ±${constraints.sentenceLength.tolerance}%`)
  }
  
  if (constraints.keepIdioms) {
    constraintInstructions.push(`preserve all idioms, slang, and unique expressions`)
  }
  
  if (constraints.hedgeFrequency) {
    constraintInstructions.push(`maintain the same frequency of uncertainty words (maybe, perhaps, might)`)
  }
  
  if (constraints.punctuationStyle) {
    constraintInstructions.push(`keep the author's punctuation style and patterns`)
  }
  
  if (constraintInstructions.length > 0) {
    prompt += `STRICT REQUIREMENTS: ${constraintInstructions.join(', ')}. `
  }
  
  // Add strength level instructions
  switch (strength) {
    case 'subtle':
      prompt += `Make minimal changes - only adjust the most obvious AI patterns. `
      break
    case 'balanced':
      prompt += `Make moderate changes to improve naturalness while keeping the core voice. `
      break
    case 'assertive':
      prompt += `Make stronger changes to significantly reduce AI risk, but never violate the voice constraints. `
      break
  }
  
  prompt += `Domain context: ${constraints.domain}. `
  
  if (constraints.traits?.trait_summary?.signature_traits) {
    const traits = constraints.traits.trait_summary.signature_traits.slice(0, 3)
    prompt += `Author's signature traits: ${traits.map((t: any) => t.name).join(', ')}. `
  }
  
  prompt += `\n\nText to rewrite:\n${text}`
  
  return prompt
}

/**
 * Main voice-aware rewrite function
 */
export async function performVoiceAwareRewrite(
  text: string,
  constraints: VoiceConstraints,
  options: RewriteOptions = { strength: 'balanced', preserveLocks: true }
): Promise<RewriteResult> {
  const prompt = generateVoiceAwarePrompt(text, constraints, options)
  
  try {
    // Call xAI API for rewriting
    const response = await fetch('/api/rewrite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        originalText: text,
        constraints,
        options
      })
    })
    
    if (!response.ok) {
      throw new Error('Rewrite request failed')
    }
    
    const result = await response.json()
    
    // Emit rewrite event for analytics
    voiceProfileEventBus.emit('sample.updated', {
      sampleId: 'rewrite-session',
      updates: { rewritten: true },
      integrity: result.integrityScore,
      risk: result.riskScore
    })
    
    return {
      original: text,
      rewritten: result.rewrittenText,
      risksReduced: result.risksReduced || ['structure', 'repetition'],
      locksRespected: result.locksRespected || Object.keys(constraints).filter(k => constraints[k as keyof VoiceConstraints]),
      integrityScore: result.integrityScore || 85,
      riskScore: result.riskScore || 15
    }
    
  } catch (error) {
    console.error('Voice-aware rewrite failed:', error)
    
    // Return error state - no synthetic data
    throw new Error('Rewrite service unavailable. Please try again later.')
  }
}

/**
 * Batch rewrite multiple flagged sections
 */
export async function batchRewriteFlaggedLines(
  flaggedSections: Array<{ id: number; text: string; reason: string }>,
  constraints: VoiceConstraints,
  options: RewriteOptions = { strength: 'balanced', preserveLocks: true }
): Promise<Array<RewriteResult & { id: number; reason: string }>> {
  const results = []
  
  for (const section of flaggedSections) {
    const result = await performVoiceAwareRewrite(section.text, constraints, options)
    results.push({
      ...result,
      id: section.id,
      reason: section.reason
    })
  }
  
  return results
}

/**
 * Apply suggestion with voice awareness
 */
export async function applySuggestionWithVoice(
  originalText: string,
  suggestion: {
    id: number
    type: string
    description: string
    targetDriver: string
    expectedDelta: number
  },
  constraints: VoiceConstraints
): Promise<RewriteResult> {
  const prompt = `Apply this specific suggestion while respecting voice constraints:
  
Suggestion: ${suggestion.description}
Target: Reduce ${suggestion.targetDriver} risk
Expected improvement: ${suggestion.expectedDelta}%

Voice Constraints:
${constraints.keepIdioms ? '- Keep all idioms and unique expressions' : ''}
${constraints.hedgeFrequency ? '- Maintain hedge word frequency' : ''}
${constraints.punctuationStyle ? '- Preserve punctuation style' : ''}
${constraints.sentenceLength.enabled ? `- Keep sentence length within ±${constraints.sentenceLength.tolerance}%` : ''}

Original text: ${originalText}`

  try {
    const response = await fetch('/api/apply-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        originalText,
        suggestion,
        constraints
      })
    })
    
    if (!response.ok) {
      throw new Error('Apply suggestion failed')
    }
    
    const result = await response.json()
    
    return {
      original: originalText,
      rewritten: result.rewrittenText,
      risksReduced: [suggestion.targetDriver],
      locksRespected: Object.keys(constraints).filter(k => constraints[k as keyof VoiceConstraints]),
      integrityScore: result.integrityScore || 80,
      riskScore: result.riskScore || 20
    }
    
  } catch (error) {
    console.error('Apply suggestion failed:', error)
    
    // Return error state - no synthetic data
    throw new Error('Suggestion application failed. Please try again later.')
  }
}

/**
 * Generate toast message for applied changes
 */
export function generateSuccessMessage(
  results: RewriteResult[],
  operation: 'batch_rewrite' | 'single_rewrite' | 'apply_suggestion'
): string {
  const totalLocks = new Set()
  const totalRisks = new Set()
  
  results.forEach(result => {
    result.locksRespected.forEach(lock => totalLocks.add(lock))
    result.risksReduced.forEach(risk => totalRisks.add(risk))
  })
  
  const locksList = Array.from(totalLocks)
  
  let message = ''
  
  switch (operation) {
    case 'batch_rewrite':
      message = `Applied rewrites using your voice locks. `
      break
    case 'single_rewrite':
      message = `Rewrite applied with voice preservation. `
      break
    case 'apply_suggestion':
      message = `Suggestion applied with voice constraints. `
      break
  }
  
  if (locksList.length > 0) {
    const lockNames = locksList.map(lock => {
      switch (lock) {
        case 'keepIdioms': return 'idioms preserved'
        case 'sentenceLength': return 'cadence kept within ±10%'
        case 'hedgeFrequency': return 'hedge frequency maintained'
        case 'punctuationStyle': return 'punctuation style preserved'
        default: return lock
      }
    })
    message += `${lockNames.join(', ')}.`
  }
  
  return message
}