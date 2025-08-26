/**
 * Real-time Voice Calculator
 * 
 * Client-side voice impact calculation for instant feedback
 * without API calls. Preserves user's authentic writing voice.
 */

import type { VoiceprintTraits, StylometricMetrics } from '@/types'

interface VoiceDimension {
  name: string
  value: number
  weight: number
}

interface VoiceCalculationResult {
  similarity: number // 0-100 percentage
  dimensionsAffected: string[]
  preservedTraits: string[]
  riskDelta: number
  confidence: 'high' | 'medium' | 'low'
  explanation: string
}

interface CachedProfile {
  dimensions: VoiceDimension[]
  metrics: StylometricMetrics
  timestamp: number
}

// Simplified metrics for real-time calculation
interface SimpleMetrics {
  avgSentenceLength: number
  vocabularyDiversity: number
  formalityScore: number
  passiveVoiceRatio: number
  complexSentenceRatio: number
  clicheRatio: number
  sentenceLengthStdDev: number
  uniqueWordRatio: number
}

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const SIMILARITY_THRESHOLD = 70 // Minimum % to be considered voice-safe

class VoiceCalculator {
  private profileCache: Map<string, CachedProfile> = new Map()
  private calculationCache: Map<string, VoiceCalculationResult> = new Map()

  /**
   * Calculate voice similarity between original and modified text
   */
  async calculateSimilarity(
    originalText: string,
    modifiedText: string,
    userProfile?: VoiceprintTraits
  ): Promise<VoiceCalculationResult> {
    const cacheKey = `${originalText}::${modifiedText}`
    
    // Check calculation cache first
    if (this.calculationCache.has(cacheKey)) {
      return this.calculationCache.get(cacheKey)!
    }

    // Extract metrics from both texts
    const originalMetrics = this.extractMetrics(originalText)
    const modifiedMetrics = this.extractMetrics(modifiedText)
    
    // Get user's voice profile or use defaults
    const profile = userProfile ? this.processProfile(userProfile) : this.getDefaultProfile()
    
    // Calculate dimension-by-dimension similarity
    const dimensionScores = this.calculateDimensionScores(
      originalMetrics,
      modifiedMetrics,
      profile
    )
    
    // Aggregate similarity score
    const overallSimilarity = this.aggregateSimilarity(dimensionScores)
    
    // Determine affected dimensions
    const affectedDimensions = dimensionScores
      .filter(d => Math.abs(d.delta) > 10)
      .map(d => d.name)
    
    // Identify preserved traits
    const preservedTraits = dimensionScores
      .filter(d => Math.abs(d.delta) <= 5)
      .map(d => d.name)
    
    // Calculate risk delta (how much AI detection risk changes)
    const riskDelta = this.calculateRiskDelta(originalMetrics, modifiedMetrics)
    
    // Determine confidence level
    const confidence = this.determineConfidence(originalText, modifiedText)
    
    // Generate explanation
    const explanation = this.generateExplanation(
      overallSimilarity,
      affectedDimensions,
      preservedTraits
    )
    
    const result: VoiceCalculationResult = {
      similarity: Math.round(overallSimilarity),
      dimensionsAffected: affectedDimensions,
      preservedTraits,
      riskDelta,
      confidence,
      explanation
    }
    
    // Cache the result
    this.calculationCache.set(cacheKey, result)
    
    // Clear old cache entries periodically
    if (this.calculationCache.size > 100) {
      this.pruneCache()
    }
    
    return result
  }

  /**
   * Extract stylometric metrics from text
   */
  private extractMetrics(text: string): SimpleMetrics {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim())
    const words = text.toLowerCase().split(/\s+/).filter(w => w)
    const uniqueWords = new Set(words)
    
    // Calculate sentence lengths
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length)
    const avgSentenceLength = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0
    
    // Calculate standard deviation
    const variance = sentenceLengths.length > 0
      ? sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length
      : 0
    const sentenceLengthStdDev = Math.sqrt(variance)
    
    // Detect passive voice (simplified)
    const passivePatterns = /\b(was|were|been|being|is|are|am)\s+\w+ed\b/gi
    const passiveMatches = text.match(passivePatterns) || []
    const passiveVoiceRatio = sentences.length > 0
      ? passiveMatches.length / sentences.length
      : 0
    
    // Detect complex sentences (with multiple clauses)
    const complexPatterns = /\b(although|whereas|while|since|because|therefore|however|moreover)\b/gi
    const complexMatches = text.match(complexPatterns) || []
    const complexSentenceRatio = sentences.length > 0
      ? complexMatches.length / sentences.length
      : 0
    
    // Detect clichés (simplified list)
    const cliches = [
      'at the end of the day',
      'think outside the box',
      'low-hanging fruit',
      'paradigm shift',
      'synergy',
      'leverage',
      'deep dive'
    ]
    const clicheCount = cliches.reduce((count, cliche) => 
      count + (text.toLowerCase().includes(cliche) ? 1 : 0), 0
    )
    const clicheRatio = words.length > 0 ? clicheCount / words.length : 0
    
    // Calculate formality score (simplified)
    const informalWords = ['got', 'gonna', 'wanna', 'yeah', 'ok', 'okay', 'stuff', 'things']
    const formalWords = ['therefore', 'however', 'moreover', 'furthermore', 'consequently']
    const informalCount = informalWords.reduce((count, word) => 
      count + words.filter(w => w === word).length, 0
    )
    const formalCount = formalWords.reduce((count, word) => 
      count + words.filter(w => w === word).length, 0
    )
    const formalityScore = words.length > 0
      ? (formalCount - informalCount) / words.length + 0.5
      : 0.5
    
    return {
      avgSentenceLength,
      vocabularyDiversity: words.length > 0 ? uniqueWords.size / words.length : 0,
      formalityScore: Math.max(0, Math.min(1, formalityScore)),
      passiveVoiceRatio,
      complexSentenceRatio,
      clicheRatio,
      sentenceLengthStdDev,
      uniqueWordRatio: words.length > 0 ? uniqueWords.size / words.length : 0
    }
  }

  /**
   * Process user profile into dimensions
   */
  private processProfile(traits: VoiceprintTraits): CachedProfile {
    const metrics = traits.stylometric_metrics
    
    const dimensions: VoiceDimension[] = [
      {
        name: 'Vocabulary',
        value: metrics.uniqueWordRatio * 100,
        weight: 1.2
      },
      {
        name: 'Flow',
        value: (1 - Math.min(metrics.sentenceLengthStdDev / 20, 1)) * 100,
        weight: 1.0
      },
      {
        name: 'Formality',
        value: metrics.formalityScore * 100,
        weight: 0.8
      },
      {
        name: 'Emotion',
        value: (1 - metrics.passiveVoiceRatio) * 100,
        weight: 0.9
      },
      {
        name: 'Clarity',
        value: (1 - metrics.complexSentenceRatio) * 100,
        weight: 1.1
      },
      {
        name: 'Originality',
        value: (1 - metrics.clicheRatio) * 100,
        weight: 1.0
      }
    ]
    
    // Convert to simplified metrics for internal use
    const processedMetrics: StylometricMetrics = {
      typeTokenRatio: metrics.typeTokenRatio || metrics.uniqueWordRatio,
      uniqueWordRatio: metrics.uniqueWordRatio,
      averageWordLength: metrics.averageWordLength || 5,
      averageSentenceLength: metrics.averageSentenceLength,
      sentenceLengthStdDev: metrics.sentenceLengthStdDev,
      complexSentenceRatio: metrics.complexSentenceRatio,
      punctuationDensity: metrics.punctuationDensity || {},
      clauseRatio: metrics.clauseRatio || 0.5,
      passiveVoiceRatio: metrics.passiveVoiceRatio,
      rareWordRatio: metrics.rareWordRatio || 0.1,
      clicheRatio: metrics.clicheRatio,
      formalityScore: metrics.formalityScore
    }
    
    return {
      dimensions,
      metrics: processedMetrics,
      timestamp: Date.now()
    }
  }

  /**
   * Get default profile for users without voice data
   */
  private getDefaultProfile(): CachedProfile {
    return {
      dimensions: [
        { name: 'Vocabulary', value: 50, weight: 1.0 },
        { name: 'Flow', value: 50, weight: 1.0 },
        { name: 'Formality', value: 50, weight: 1.0 },
        { name: 'Emotion', value: 50, weight: 1.0 },
        { name: 'Clarity', value: 50, weight: 1.0 },
        { name: 'Originality', value: 50, weight: 1.0 }
      ],
      metrics: {
        typeTokenRatio: 0.5,
        uniqueWordRatio: 0.5,
        averageWordLength: 5,
        averageSentenceLength: 15,
        sentenceLengthStdDev: 5,
        complexSentenceRatio: 0.2,
        punctuationDensity: {},
        clauseRatio: 0.5,
        passiveVoiceRatio: 0.1,
        rareWordRatio: 0.1,
        clicheRatio: 0.05,
        formalityScore: 0.5
      },
      timestamp: Date.now()
    }
  }

  /**
   * Calculate dimension scores comparing original to modified
   */
  private calculateDimensionScores(
    originalMetrics: SimpleMetrics,
    modifiedMetrics: SimpleMetrics,
    profile: CachedProfile
  ): Array<{ name: string; delta: number; weight: number }> {
    return [
      {
        name: 'Vocabulary',
        delta: (modifiedMetrics.uniqueWordRatio - originalMetrics.uniqueWordRatio) * 100,
        weight: 1.2
      },
      {
        name: 'Flow',
        delta: ((1 - modifiedMetrics.sentenceLengthStdDev / 20) - (1 - originalMetrics.sentenceLengthStdDev / 20)) * 100,
        weight: 1.0
      },
      {
        name: 'Formality',
        delta: (modifiedMetrics.formalityScore - originalMetrics.formalityScore) * 100,
        weight: 0.8
      },
      {
        name: 'Emotion',
        delta: ((1 - modifiedMetrics.passiveVoiceRatio) - (1 - originalMetrics.passiveVoiceRatio)) * 100,
        weight: 0.9
      },
      {
        name: 'Clarity',
        delta: ((1 - modifiedMetrics.complexSentenceRatio) - (1 - originalMetrics.complexSentenceRatio)) * 100,
        weight: 1.1
      },
      {
        name: 'Originality',
        delta: ((1 - modifiedMetrics.clicheRatio) - (1 - originalMetrics.clicheRatio)) * 100,
        weight: 1.0
      }
    ]
  }

  /**
   * Aggregate dimension scores into overall similarity
   */
  private aggregateSimilarity(dimensionScores: Array<{ delta: number; weight: number }>): number {
    const totalWeight = dimensionScores.reduce((sum, d) => sum + d.weight, 0)
    const weightedDelta = dimensionScores.reduce((sum, d) => 
      sum + Math.abs(d.delta) * d.weight, 0
    )
    
    // Convert delta to similarity (lower delta = higher similarity)
    const avgDelta = weightedDelta / totalWeight
    const similarity = Math.max(0, 100 - avgDelta)
    
    return similarity
  }

  /**
   * Calculate how much AI detection risk changes
   */
  private calculateRiskDelta(
    originalMetrics: SimpleMetrics,
    modifiedMetrics: SimpleMetrics
  ): number {
    // Factors that increase AI detection risk
    const riskFactors = {
      formalityIncrease: modifiedMetrics.formalityScore - originalMetrics.formalityScore,
      passiveIncrease: modifiedMetrics.passiveVoiceRatio - originalMetrics.passiveVoiceRatio,
      clicheIncrease: modifiedMetrics.clicheRatio - originalMetrics.clicheRatio,
      diversityDecrease: originalMetrics.vocabularyDiversity - modifiedMetrics.vocabularyDiversity
    }
    
    // Weight and sum risk factors
    const riskDelta = 
      riskFactors.formalityIncrease * 20 +
      riskFactors.passiveIncrease * 30 +
      riskFactors.clicheIncrease * 40 +
      riskFactors.diversityDecrease * 10
    
    return Math.round(riskDelta)
  }

  /**
   * Determine confidence level based on text length and changes
   */
  private determineConfidence(originalText: string, modifiedText: string): 'high' | 'medium' | 'low' {
    const originalWords = originalText.split(/\s+/).length
    const modifiedWords = modifiedText.split(/\s+/).length
    const changeRatio = Math.abs(originalWords - modifiedWords) / originalWords
    
    if (originalWords < 5 || changeRatio > 0.5) return 'low'
    if (originalWords < 20 || changeRatio > 0.3) return 'medium'
    return 'high'
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    similarity: number,
    affectedDimensions: string[],
    preservedTraits: string[]
  ): string {
    if (similarity >= SIMILARITY_THRESHOLD) {
      if (preservedTraits.length > 0) {
        return `This change preserves your ${preservedTraits[0].toLowerCase()} while maintaining ${similarity}% voice similarity`
      }
      return `Voice-safe edit with ${similarity}% similarity to your style`
    } else {
      if (affectedDimensions.length > 0) {
        return `This may alter your ${affectedDimensions[0].toLowerCase()} (${similarity}% match)`
      }
      return `Significant voice change detected (${similarity}% match)`
    }
  }

  /**
   * Prune old cache entries
   */
  private pruneCache(): void {
    const maxSize = 50
    if (this.calculationCache.size <= maxSize) return
    
    const entries = Array.from(this.calculationCache.entries())
    const toKeep = entries.slice(-maxSize)
    this.calculationCache.clear()
    toKeep.forEach(([key, value]) => this.calculationCache.set(key, value))
  }

  /**
   * Check if a change is voice-safe
   */
  isVoiceSafe(similarity: number): boolean {
    return similarity >= SIMILARITY_THRESHOLD
  }

  /**
   * Format similarity for display with ASCII dots
   */
  formatSimilarityDots(similarity: number): string {
    const filled = Math.round(similarity / 10)
    const empty = 10 - filled
    return '●'.repeat(filled) + '○'.repeat(empty)
  }
}

// Export singleton instance
export const voiceCalculator = new VoiceCalculator()

// Export types
export type { VoiceCalculationResult, VoiceDimension }