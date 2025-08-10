/**
 * Voiceprint threshold calculation and trait generation
 * Converts raw metrics into actionable insights and coaching targets
 */

import type { StylometricMetrics } from './features'
import type { SemanticSignature } from './semantic'

export interface VoiceprintTraits {
  signatureTraits: SignatureTrait[]
  pitfalls: Pitfall[]
  targetThresholds: TargetThresholds
}

export interface SignatureTrait {
  id: string
  name: string
  description: string
  strength: number // 0-1
  category: 'lexical' | 'structural' | 'semantic' | 'stylistic'
}

export interface Pitfall {
  id: string
  name: string
  description: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
  category: 'clarity' | 'engagement' | 'consistency' | 'formality'
}

export interface TargetThresholds {
  // Lexical targets
  typeTokenRatio: { min: number; max: number; optimal: number }
  averageWordLength: { min: number; max: number; optimal: number }
  
  // Structural targets
  averageSentenceLength: { min: number; max: number; optimal: number }
  complexSentenceRatio: { min: number; max: number; optimal: number }
  
  // Style targets
  formalityScore: { min: number; max: number; optimal: number }
  vocabularyRichness: { min: number; max: number; optimal: number }
  
  // Semantic targets
  semanticCohesion: { min: number; max: number; optimal: number }
  conceptualDepth: { min: number; max: number; optimal: number }
}

/**
 * Generate comprehensive voiceprint traits from metrics
 */
export function generateVoiceprintTraits(
  stylometric: StylometricMetrics,
  semantic: SemanticSignature
): VoiceprintTraits {
  const signatureTraits = identifySignatureTraits(stylometric, semantic)
  const pitfalls = identifyPitfalls(stylometric, semantic)
  const targetThresholds = calculateTargetThresholds(stylometric, semantic)
  
  return {
    signatureTraits: signatureTraits.slice(0, 3), // Top 3 traits
    pitfalls: pitfalls.slice(0, 3), // Top 3 pitfalls
    targetThresholds
  }
}

/**
 * Identify signature traits (strengths) from metrics
 */
function identifySignatureTraits(
  stylometric: StylometricMetrics,
  semantic: SemanticSignature
): SignatureTrait[] {
  const traits: SignatureTrait[] = []
  
  // Lexical diversity strength
  if (stylometric.typeTokenRatio > 0.7) {
    traits.push({
      id: 'rich_vocabulary',
      name: 'Rich Vocabulary',
      description: 'Uses a diverse range of words, avoiding repetition and demonstrating linguistic breadth.',
      strength: Math.min(stylometric.typeTokenRatio, 1),
      category: 'lexical'
    })
  }
  
  // Sentence structure variety
  if (stylometric.sentenceLengthStdDev > 8) {
    traits.push({
      id: 'varied_rhythm',
      name: 'Varied Rhythm',
      description: 'Masterfully varies sentence length to create engaging, dynamic prose rhythm.',
      strength: Math.min(stylometric.sentenceLengthStdDev / 12, 1),
      category: 'structural'
    })
  }
  
  // Complex thought expression
  if (stylometric.complexSentenceRatio > 0.4) {
    traits.push({
      id: 'sophisticated_structure',
      name: 'Sophisticated Structure',
      description: 'Constructs complex sentences that convey nuanced ideas with clarity.',
      strength: Math.min(stylometric.complexSentenceRatio / 0.6, 1),
      category: 'structural'
    })
  }
  
  // Semantic cohesion
  if (semantic.semanticCohesion > 0.7) {
    traits.push({
      id: 'thematic_consistency',
      name: 'Thematic Consistency',
      description: 'Maintains strong thematic coherence across different pieces of writing.',
      strength: semantic.semanticCohesion,
      category: 'semantic'
    })
  }
  
  // Formality balance
  if (stylometric.formalityScore > 0.3 && stylometric.formalityScore < 0.7) {
    traits.push({
      id: 'balanced_tone',
      name: 'Balanced Tone',
      description: 'Strikes an ideal balance between formal precision and accessible warmth.',
      strength: 1 - Math.abs(0.5 - stylometric.formalityScore) * 2,
      category: 'stylistic'
    })
  }
  
  // Vocabulary sophistication
  if (stylometric.rareWordRatio > 0.15) {
    traits.push({
      id: 'precise_diction',
      name: 'Precise Diction',
      description: 'Employs sophisticated vocabulary to express ideas with exactness.',
      strength: Math.min(stylometric.rareWordRatio / 0.25, 1),
      category: 'lexical'
    })
  }
  
  // Distinctive voice markers
  if (semantic.distinctiveUnigrams.length > 5) {
    const avgDistinctiveness = semantic.distinctiveUnigrams
      .slice(0, 5)
      .reduce((sum, word) => sum + word.distinctiveness, 0) / 5
    
    traits.push({
      id: 'distinctive_voice',
      name: 'Distinctive Voice',
      description: 'Uses characteristic word choices that create a recognizable writing signature.',
      strength: Math.min(avgDistinctiveness / 3, 1),
      category: 'semantic'
    })
  }
  
  // Conceptual depth
  if (semantic.conceptualDepth > 0.4) {
    traits.push({
      id: 'conceptual_depth',
      name: 'Conceptual Depth',
      description: 'Explores ideas with philosophical insight and intellectual rigor.',
      strength: Math.min(semantic.conceptualDepth / 0.6, 1),
      category: 'semantic'
    })
  }
  
  // Sort by strength and return top traits
  return traits.sort((a, b) => b.strength - a.strength)
}

/**
 * Identify potential pitfalls from metrics
 */
function identifyPitfalls(
  stylometric: StylometricMetrics,
  semantic: SemanticSignature
): Pitfall[] {
  const pitfalls: Pitfall[] = []
  
  // Repetitive vocabulary
  if (stylometric.typeTokenRatio < 0.4) {
    pitfalls.push({
      id: 'repetitive_vocabulary',
      name: 'Repetitive Vocabulary',
      description: 'Tends to reuse the same words frequently, potentially reducing reader engagement.',
      severity: stylometric.typeTokenRatio < 0.3 ? 'high' : 'medium',
      suggestion: 'Expand word choice with synonyms and varied expressions.',
      category: 'engagement'
    })
  }
  
  // Overly long sentences
  if (stylometric.averageSentenceLength > 25) {
    pitfalls.push({
      id: 'long_sentences',
      name: 'Complex Sentence Length',
      description: 'Sentences may be too long, potentially challenging reader comprehension.',
      severity: stylometric.averageSentenceLength > 30 ? 'high' : 'medium',
      suggestion: 'Break longer sentences into shorter, more digestible chunks.',
      category: 'clarity'
    })
  }
  
  // Overly short sentences
  if (stylometric.averageSentenceLength < 12) {
    pitfalls.push({
      id: 'choppy_rhythm',
      name: 'Choppy Rhythm',
      description: 'Very short sentences may create an abrupt, disconnected reading experience.',
      severity: stylometric.averageSentenceLength < 8 ? 'high' : 'medium',
      suggestion: 'Combine related ideas into longer, flowing sentences.',
      category: 'engagement'
    })
  }
  
  // Low sentence variety
  if (stylometric.sentenceLengthStdDev < 4) {
    pitfalls.push({
      id: 'monotonous_structure',
      name: 'Monotonous Structure',
      description: 'Limited sentence length variation may create predictable, less engaging prose.',
      severity: 'medium',
      suggestion: 'Vary sentence length to create more dynamic rhythm.',
      category: 'engagement'
    })
  }
  
  // Excessive formality
  if (stylometric.formalityScore > 0.8) {
    pitfalls.push({
      id: 'overly_formal',
      name: 'Overly Formal',
      description: 'Very formal tone may distance readers and reduce accessibility.',
      severity: 'medium',
      suggestion: 'Incorporate more conversational elements to increase relatability.',
      category: 'formality'
    })
  }
  
  // Insufficient formality
  if (stylometric.formalityScore < 0.2) {
    pitfalls.push({
      id: 'too_casual',
      name: 'Too Casual',
      description: 'Overly informal tone may undermine credibility in professional contexts.',
      severity: 'medium',
      suggestion: 'Add more formal vocabulary and structured expressions.',
      category: 'formality'
    })
  }
  
  // Cliché usage
  if (stylometric.clicheRatio > 0.02) {
    pitfalls.push({
      id: 'cliche_usage',
      name: 'Cliché Usage',
      description: 'Frequent use of common phrases may reduce originality and impact.',
      severity: stylometric.clicheRatio > 0.05 ? 'high' : 'low',
      suggestion: 'Replace overused expressions with fresh, original language.',
      category: 'engagement'
    })
  }
  
  // Low semantic cohesion
  if (semantic.semanticCohesion < 0.4) {
    pitfalls.push({
      id: 'inconsistent_themes',
      name: 'Inconsistent Themes',
      description: 'Ideas may lack cohesive connection, potentially confusing readers.',
      severity: semantic.semanticCohesion < 0.2 ? 'high' : 'medium',
      suggestion: 'Strengthen thematic links between ideas and paragraphs.',
      category: 'consistency'
    })
  }
  
  // Passive voice overuse
  if (stylometric.passiveVoiceRatio > 0.3) {
    pitfalls.push({
      id: 'passive_voice_overuse',
      name: 'Passive Voice Overuse',
      description: 'Frequent passive constructions may weaken writing impact and clarity.',
      severity: stylometric.passiveVoiceRatio > 0.5 ? 'high' : 'medium',
      suggestion: 'Convert passive constructions to active voice for stronger impact.',
      category: 'clarity'
    })
  }
  
  // Sort by severity (high -> medium -> low) and return
  const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 }
  return pitfalls.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
}

/**
 * Calculate personalized target thresholds based on current metrics
 */
function calculateTargetThresholds(
  stylometric: StylometricMetrics,
  semantic: SemanticSignature
): TargetThresholds {
  return {
    typeTokenRatio: createThreshold(stylometric.typeTokenRatio, 0.5, 0.8, 0.1),
    averageWordLength: createThreshold(stylometric.averageWordLength, 4.5, 5.5, 0.3),
    averageSentenceLength: createThreshold(stylometric.averageSentenceLength, 15, 22, 3),
    complexSentenceRatio: createThreshold(stylometric.complexSentenceRatio, 0.3, 0.6, 0.1),
    formalityScore: createThreshold(stylometric.formalityScore, 0.3, 0.7, 0.1),
    vocabularyRichness: createThreshold(semantic.vocabularyRichness, 0.4, 0.8, 0.05),
    semanticCohesion: createThreshold(semantic.semanticCohesion, 0.5, 0.9, 0.1),
    conceptualDepth: createThreshold(semantic.conceptualDepth, 0.3, 0.7, 0.1)
  }
}

/**
 * Create a threshold object with personalized ranges
 */
function createThreshold(
  currentValue: number,
  idealMin: number,
  idealMax: number,
  tolerance: number
): { min: number; max: number; optimal: number } {
  const optimal = Math.max(idealMin, Math.min(idealMax, currentValue))
  
  return {
    min: Math.max(0, optimal - tolerance),
    max: Math.min(1, optimal + tolerance),
    optimal
  }
}

/**
 * Generate a summary description for the voiceprint
 */
export function generateVoiceprintSummary(traits: VoiceprintTraits): string {
  const topTraits = traits.signatureTraits.slice(0, 2).map(t => t.name.toLowerCase())
  const mainPitfall = traits.pitfalls[0]?.name.toLowerCase() || 'minor areas for improvement'
  
  const traitDescription = topTraits.length > 1 
    ? `${topTraits[0]} and ${topTraits[1]}`
    : topTraits[0] || 'developing writing style'
  
  return `A distinctive writing voice characterized by ${traitDescription}, with opportunities to enhance ${mainPitfall}.`
}