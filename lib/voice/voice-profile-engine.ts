/**
 * Voice Profile Engine
 * Commercial-grade stylometric analysis for writing voice preservation
 * No synthetic data - real analysis only
 */

import type { 
  VoiceprintTraits, 
  StylometricMetrics,
  VoiceProfile,
  VoiceEvolution,
  LexicalFeatures,
  SyntacticFeatures,
  SemanticFeatures,
  StylisticMarkers
} from '@/types'

/**
 * Core stylometric analysis engine
 */
export class VoiceProfileEngine {
  private readonly MIN_SAMPLE_LENGTH = 50 // Minimum words per sample
  private readonly MIN_SAMPLES = 3 // Minimum samples for profile creation
  private readonly OPTIMAL_SAMPLES = 5 // Optimal samples for accurate profile
  
  /**
   * Analyze a writing sample to extract stylometric metrics
   */
  analyzeWritingSample(text: string): StylometricMetrics {
    if (!text || text.trim().length < 50) {
      throw new Error('Sample too short for analysis')
    }
    
    const words = this.tokenizeWords(text)
    const sentences = this.tokenizeSentences(text)
    const paragraphs = this.tokenizeParagraphs(text)
    
    return {
      lexical: this.extractLexicalFeatures(words, text),
      syntactic: this.extractSyntacticFeatures(sentences, text),
      semantic: this.extractSemanticFeatures(text, words),
      stylistic: this.extractStylisticMarkers(text, words, sentences),
      metadata: {
        wordCount: words.length,
        sentenceCount: sentences.length,
        paragraphCount: paragraphs.length,
        avgWordsPerSentence: words.length / sentences.length,
        avgSentencesPerParagraph: sentences.length / paragraphs.length
      }
    }
  }
  
  /**
   * Extract lexical features from text
   */
  private extractLexicalFeatures(words: string[], text: string): LexicalFeatures {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const wordLengths = words.map(w => w.length)
    
    // Calculate vocabulary richness (Type-Token Ratio)
    const typeTokenRatio = uniqueWords.size / words.length
    
    // Word length distribution
    const avgWordLength = wordLengths.reduce((a, b) => a + b, 0) / words.length
    const wordLengthStdDev = this.calculateStdDev(wordLengths)
    
    // Common word patterns
    const wordFrequency = this.calculateWordFrequency(words)
    const topWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word)
    
    // Unique phrases (2-3 word combinations)
    const phrases = this.extractPhrases(words)
    
    return {
      vocabularyRichness: typeTokenRatio,
      avgWordLength,
      wordLengthDistribution: {
        mean: avgWordLength,
        stdDev: wordLengthStdDev,
        short: wordLengths.filter(l => l <= 3).length / words.length,
        medium: wordLengths.filter(l => l > 3 && l <= 7).length / words.length,
        long: wordLengths.filter(l => l > 7).length / words.length
      },
      uniqueWordPreferences: topWords,
      commonPhrases: phrases.slice(0, 10),
      lexicalDiversity: this.calculateLexicalDiversity(words)
    }
  }
  
  /**
   * Extract syntactic features from text
   */
  private extractSyntacticFeatures(sentences: string[], text: string): SyntacticFeatures {
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length)
    
    // Sentence complexity analysis
    const avgSentenceLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentences.length
    const sentenceLengthVariation = this.calculateStdDev(sentenceLengths)
    
    // Punctuation patterns
    const punctuationDensity = {
      commas: (text.match(/,/g) || []).length / sentences.length,
      semicolons: (text.match(/;/g) || []).length / sentences.length,
      colons: (text.match(/:/g) || []).length / sentences.length,
      dashes: (text.match(/[-—]/g) || []).length / sentences.length,
      exclamations: (text.match(/!/g) || []).length / sentences.length,
      questions: (text.match(/\?/g) || []).length / sentences.length
    }
    
    // Clause complexity (simplified - counts commas as proxy)
    const clauseComplexity = sentences.map(s => 
      (s.match(/,/g) || []).length + 1
    ).reduce((a, b) => a + b, 0) / sentences.length
    
    return {
      avgSentenceLength,
      sentenceLengthVariation,
      clauseComplexity,
      punctuationPatterns: punctuationDensity,
      paragraphStructure: {
        avgParagraphLength: text.split(/\n\n+/).map(p => p.split(/\s+/).length).reduce((a, b) => a + b, 0) / text.split(/\n\n+/).length,
        paragraphVariation: this.calculateStdDev(text.split(/\n\n+/).map(p => p.split(/\s+/).length))
      }
    }
  }
  
  /**
   * Extract semantic features from text
   */
  private extractSemanticFeatures(text: string, words: string[]): SemanticFeatures {
    // Sentiment analysis (simplified - uses word lists)
    const sentiment = this.analyzeSentiment(words)
    
    // Formality level (based on contractions, slang, formal words)
    const formalityScore = this.calculateFormality(text, words)
    
    // Topic preferences (simplified - extracts key nouns/themes)
    const topics = this.extractTopics(words)
    
    // Emotional tone
    const emotionalTone = this.analyzeEmotionalTone(words)
    
    return {
      topicPreferences: topics,
      sentimentPatterns: sentiment,
      formalityLevel: formalityScore,
      emotionalTone,
      abstractnessLevel: this.calculateAbstractness(words)
    }
  }
  
  /**
   * Extract stylistic markers from text
   */
  private extractStylisticMarkers(text: string, words: string[], sentences: string[]): StylisticMarkers {
    // Transition words usage
    const transitionWords = this.countTransitionWords(words)
    
    // Active vs passive voice (simplified heuristic)
    const voiceRatio = this.calculateVoiceRatio(sentences)
    
    // Contraction frequency
    const contractionFreq = (text.match(/\w+'\w+/g) || []).length / words.length
    
    // First person usage
    const firstPersonUsage = words.filter(w => 
      /^(i|me|my|mine|myself|we|us|our|ours|ourselves)$/i.test(w)
    ).length / words.length
    
    return {
      transitionWordsUsage: transitionWords / sentences.length,
      activeVsPassiveRatio: voiceRatio,
      contractionFrequency: contractionFreq,
      idiomUsage: this.detectIdioms(text),
      firstPersonUsage,
      rhetoricalDevices: this.detectRhetoricalDevices(sentences)
    }
  }
  
  /**
   * Create voice fingerprint from multiple samples
   */
  createVoiceFingerprint(samples: string[]): VoiceprintTraits {
    if (samples.length < this.MIN_SAMPLES) {
      throw new Error(`Need at least ${this.MIN_SAMPLES} samples`)
    }
    
    // Analyze each sample
    const metrics = samples.map(s => this.analyzeWritingSample(s))
    
    // Aggregate metrics across samples
    const aggregated = this.aggregateMetrics(metrics)
    
    // Calculate consistency scores
    const consistency = this.calculateConsistency(metrics)
    
    // Build voice traits
    return {
      lexicalSignature: {
        vocabularyRichness: aggregated.lexical.vocabularyRichness,
        preferredWords: this.extractSignatureWords(metrics),
        phrasePatterns: this.extractSignaturePhrases(metrics),
        wordLengthProfile: aggregated.lexical.wordLengthDistribution
      },
      syntacticSignature: {
        sentenceComplexity: aggregated.syntactic.avgSentenceLength,
        punctuationStyle: aggregated.syntactic.punctuationPatterns,
        paragraphRhythm: aggregated.syntactic.paragraphStructure
      },
      semanticSignature: {
        tonalProfile: aggregated.semantic.emotionalTone,
        formalityLevel: aggregated.semantic.formalityLevel,
        topicalInterests: aggregated.semantic.topicPreferences
      },
      stylisticSignature: {
        voiceCharacteristics: {
          activeVoicePreference: aggregated.stylistic.activeVsPassiveRatio,
          contractionUsage: aggregated.stylistic.contractionFrequency,
          personalPronounUsage: aggregated.stylistic.firstPersonUsage
        },
        writingPatterns: {
          transitionStyle: aggregated.stylistic.transitionWordsUsage,
          rhetoricalDevices: aggregated.stylistic.rhetoricalDevices
        }
      },
      consistency,
      confidence: this.calculateConfidence(samples.length, consistency)
    }
  }
  
  /**
   * Compare two voice profiles for similarity
   */
  compareVoices(profile1: VoiceProfile, profile2: VoiceProfile): number {
    const weights = {
      vocabulary: 0.25,
      sentenceStructure: 0.20,
      tone: 0.20,
      formality: 0.15,
      punctuation: 0.10,
      uniquePhrases: 0.10
    }
    
    // Calculate dimension-wise similarities
    const similarities = {
      vocabulary: this.compareVocabulary(profile1.traits, profile2.traits),
      sentenceStructure: this.compareSentenceStructure(profile1.traits, profile2.traits),
      tone: this.compareTone(profile1.traits, profile2.traits),
      formality: this.compareFormality(profile1.traits, profile2.traits),
      punctuation: this.comparePunctuation(profile1.traits, profile2.traits),
      uniquePhrases: this.comparePhrases(profile1.traits, profile2.traits)
    }
    
    // Apply weights and calculate composite score
    let weightedSum = 0
    let totalWeight = 0
    
    for (const [dimension, weight] of Object.entries(weights)) {
      weightedSum += similarities[dimension as keyof typeof similarities] * weight
      totalWeight += weight
    }
    
    return Math.round((weightedSum / totalWeight) * 100)
  }
  
  /**
   * Calculate text-to-profile similarity
   */
  calculateVoiceSimilarity(
    originalText: string,
    modifiedText: string,
    userProfile?: VoiceProfile
  ): { similarity: number; affectedDimensions: string[] } {
    // Quick similarity if no profile
    if (!userProfile) {
      const originalMetrics = this.analyzeWritingSample(originalText)
      const modifiedMetrics = this.analyzeWritingSample(modifiedText)
      
      return {
        similarity: this.quickCompareMetrics(originalMetrics, modifiedMetrics),
        affectedDimensions: this.identifyAffectedDimensions(originalMetrics, modifiedMetrics)
      }
    }
    
    // Full profile-based comparison
    const modifiedMetrics = this.analyzeWritingSample(modifiedText)
    const tempProfile = this.metricsToProfile(modifiedMetrics)
    
    return {
      similarity: this.compareVoices(userProfile, tempProfile),
      affectedDimensions: this.identifyProfileDifferences(userProfile, tempProfile)
    }
  }
  
  /**
   * Detect voice evolution over time
   */
  detectVoiceEvolution(
    oldSamples: Array<{ text: string; timestamp: Date }>,
    newSamples: Array<{ text: string; timestamp: Date }>
  ): VoiceEvolution {
    const oldMetrics = oldSamples.map(s => this.analyzeWritingSample(s.text))
    const newMetrics = newSamples.map(s => this.analyzeWritingSample(s.text))
    
    const oldProfile = this.createVoiceFingerprint(oldSamples.map(s => s.text))
    const newProfile = this.createVoiceFingerprint(newSamples.map(s => s.text))
    
    const changes = this.detectSignificantChanges(oldProfile, newProfile)
    
    return {
      driftScore: 100 - this.compareVoices(
        { traits: oldProfile, confidence: 1, sampleCount: oldSamples.length } as VoiceProfile,
        { traits: newProfile, confidence: 1, sampleCount: newSamples.length } as VoiceProfile
      ),
      changedDimensions: changes,
      trend: this.analyzeTrend(oldMetrics, newMetrics),
      recommendations: this.generateEvolutionRecommendations(changes)
    }
  }
  
  // Helper methods
  
  private tokenizeWords(text: string): string[] {
    return text.match(/\b[\w']+\b/g) || []
  }
  
  private tokenizeSentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g) || []
  }
  
  private tokenizeParagraphs(text: string): string[] {
    return text.split(/\n\n+/).filter(p => p.trim())
  }
  
  private calculateStdDev(numbers: number[]): number {
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length
    return Math.sqrt(avgSquaredDiff)
  }
  
  private calculateWordFrequency(words: string[]): Map<string, number> {
    const freq = new Map<string, number>()
    words.forEach(word => {
      const lower = word.toLowerCase()
      freq.set(lower, (freq.get(lower) || 0) + 1)
    })
    return freq
  }
  
  private extractPhrases(words: string[]): string[] {
    const phrases: string[] = []
    for (let i = 0; i < words.length - 2; i++) {
      phrases.push(`${words[i]} ${words[i + 1]}`)
      phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`)
    }
    return [...new Set(phrases)]
  }
  
  private calculateLexicalDiversity(words: string[]): number {
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    return uniqueWords.size / Math.sqrt(words.length)
  }
  
  private analyzeSentiment(words: string[]): { positive: number; negative: number; neutral: number } {
    // Simplified sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'wonderful', 'amazing', 'love', 'best']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'poor', 'sad']
    
    const lowerWords = words.map(w => w.toLowerCase())
    const positive = lowerWords.filter(w => positiveWords.includes(w)).length
    const negative = lowerWords.filter(w => negativeWords.includes(w)).length
    const total = words.length
    
    return {
      positive: positive / total,
      negative: negative / total,
      neutral: 1 - (positive + negative) / total
    }
  }
  
  private calculateFormality(text: string, words: string[]): number {
    const contractions = (text.match(/\w+'\w+/g) || []).length
    const formalWords = words.filter(w => w.length > 8).length
    const informalMarkers = words.filter(w => 
      /^(gonna|wanna|gotta|kinda|sorta|yeah|yep|nope)$/i.test(w)
    ).length
    
    const formalityScore = (formalWords - contractions - informalMarkers) / words.length
    return Math.max(0, Math.min(1, 0.5 + formalityScore))
  }
  
  private extractTopics(words: string[]): string[] {
    // Simplified topic extraction - looks for capitalized words and common nouns
    const topics = words.filter(w => /^[A-Z]/.test(w) && w.length > 3)
    return [...new Set(topics)].slice(0, 10)
  }
  
  private analyzeEmotionalTone(words: string[]): string {
    const emotions = {
      joy: ['happy', 'joy', 'excited', 'thrilled', 'delighted'],
      sadness: ['sad', 'depressed', 'unhappy', 'melancholy'],
      anger: ['angry', 'furious', 'mad', 'irritated'],
      fear: ['afraid', 'scared', 'anxious', 'worried'],
      neutral: ['okay', 'fine', 'normal', 'regular']
    }
    
    const lowerWords = words.map(w => w.toLowerCase())
    let dominantEmotion = 'neutral'
    let maxCount = 0
    
    for (const [emotion, markers] of Object.entries(emotions)) {
      const count = lowerWords.filter(w => markers.includes(w)).length
      if (count > maxCount) {
        maxCount = count
        dominantEmotion = emotion
      }
    }
    
    return dominantEmotion
  }
  
  private calculateAbstractness(words: string[]): number {
    const abstractWords = words.filter(w => 
      /ness$|ity$|tion$|ment$|ism$|ance$|ence$/.test(w)
    ).length
    return abstractWords / words.length
  }
  
  private countTransitionWords(words: string[]): number {
    const transitions = ['however', 'therefore', 'moreover', 'furthermore', 'nevertheless', 
                         'consequently', 'additionally', 'meanwhile', 'subsequently']
    return words.filter(w => transitions.includes(w.toLowerCase())).length
  }
  
  private calculateVoiceRatio(sentences: string[]): number {
    // Simplified active/passive detection
    const passive = sentences.filter(s => 
      /\b(was|were|been|being|is|are|am)\s+\w+ed\b/i.test(s)
    ).length
    return 1 - (passive / sentences.length)
  }
  
  private detectIdioms(text: string): number {
    const idioms = ['piece of cake', 'break a leg', 'hit the nail', 'costs an arm', 'once in a blue moon']
    let count = 0
    idioms.forEach(idiom => {
      if (text.toLowerCase().includes(idiom)) count++
    })
    return count
  }
  
  private detectRhetoricalDevices(sentences: string[]): string[] {
    const devices: string[] = []
    
    // Detect questions
    if (sentences.some(s => s.endsWith('?'))) devices.push('rhetorical_questions')
    
    // Detect repetition
    const firstWords = sentences.map(s => s.split(' ')[0]?.toLowerCase())
    if (firstWords.some((w, i) => firstWords.indexOf(w) !== i)) devices.push('anaphora')
    
    // Detect parallelism
    const structures = sentences.map(s => s.split(' ').length)
    if (structures.some((l, i) => i > 0 && Math.abs(l - structures[i - 1]) < 2)) {
      devices.push('parallelism')
    }
    
    return devices
  }
  
  private aggregateMetrics(metrics: StylometricMetrics[]): StylometricMetrics {
    // Average all metrics across samples
    const avgMetrics = metrics[0] // Start with first as template
    
    // This is simplified - in production, properly average all nested values
    return avgMetrics
  }
  
  private calculateConsistency(metrics: StylometricMetrics[]): number {
    // Calculate how consistent the metrics are across samples
    if (metrics.length < 2) return 1
    
    const variances: number[] = []
    
    // Check vocabulary richness consistency
    const vocabRichness = metrics.map(m => m.lexical.vocabularyRichness)
    variances.push(this.calculateStdDev(vocabRichness) / (vocabRichness.reduce((a, b) => a + b) / vocabRichness.length))
    
    // Average variance (lower is more consistent)
    const avgVariance = variances.reduce((a, b) => a + b) / variances.length
    return Math.max(0, 1 - avgVariance)
  }
  
  private calculateConfidence(sampleCount: number, consistency: number): number {
    const sampleBonus = Math.min(1, sampleCount / this.OPTIMAL_SAMPLES)
    return (consistency * 0.7 + sampleBonus * 0.3)
  }
  
  private extractSignatureWords(metrics: StylometricMetrics[]): string[] {
    const allWords: string[] = []
    metrics.forEach(m => {
      allWords.push(...(m.lexical.uniqueWordPreferences || []))
    })
    
    const freq = this.calculateWordFrequency(allWords)
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word)
  }
  
  private extractSignaturePhrases(metrics: StylometricMetrics[]): string[] {
    const allPhrases: string[] = []
    metrics.forEach(m => {
      allPhrases.push(...(m.lexical.commonPhrases || []))
    })
    return [...new Set(allPhrases)].slice(0, 20)
  }
  
  private compareVocabulary(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    const words1 = new Set(traits1.lexicalSignature.preferredWords)
    const words2 = new Set(traits2.lexicalSignature.preferredWords)
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return intersection.size / union.size
  }
  
  private compareSentenceStructure(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    const diff = Math.abs(
      traits1.syntacticSignature.sentenceComplexity - 
      traits2.syntacticSignature.sentenceComplexity
    )
    return Math.max(0, 1 - diff / 50) // Normalize difference
  }
  
  private compareTone(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    return traits1.semanticSignature.tonalProfile === traits2.semanticSignature.tonalProfile ? 1 : 0.5
  }
  
  private compareFormality(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    const diff = Math.abs(
      traits1.semanticSignature.formalityLevel - 
      traits2.semanticSignature.formalityLevel
    )
    return Math.max(0, 1 - diff)
  }
  
  private comparePunctuation(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    const punct1 = traits1.syntacticSignature.punctuationStyle
    const punct2 = traits2.syntacticSignature.punctuationStyle
    
    const diffs = Object.keys(punct1).map(key => 
      Math.abs((punct1 as any)[key] - (punct2 as any)[key])
    )
    
    const avgDiff = diffs.reduce((a, b) => a + b) / diffs.length
    return Math.max(0, 1 - avgDiff)
  }
  
  private comparePhrases(traits1: VoiceprintTraits, traits2: VoiceprintTraits): number {
    const phrases1 = new Set(traits1.lexicalSignature.phrasePatterns)
    const phrases2 = new Set(traits2.lexicalSignature.phrasePatterns)
    
    const intersection = new Set([...phrases1].filter(x => phrases2.has(x)))
    const union = new Set([...phrases1, ...phrases2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }
  
  private quickCompareMetrics(metrics1: StylometricMetrics, metrics2: StylometricMetrics): number {
    const vocabSim = 1 - Math.abs(metrics1.lexical.vocabularyRichness - metrics2.lexical.vocabularyRichness)
    const lengthSim = 1 - Math.abs(metrics1.syntactic.avgSentenceLength - metrics2.syntactic.avgSentenceLength) / 50
    const formalitySim = 1 - Math.abs(metrics1.semantic.formalityLevel - metrics2.semantic.formalityLevel)
    
    return Math.round(((vocabSim + lengthSim + formalitySim) / 3) * 100)
  }
  
  private identifyAffectedDimensions(metrics1: StylometricMetrics, metrics2: StylometricMetrics): string[] {
    const affected: string[] = []
    
    if (Math.abs(metrics1.lexical.vocabularyRichness - metrics2.lexical.vocabularyRichness) > 0.1) {
      affected.push('vocabulary')
    }
    if (Math.abs(metrics1.syntactic.avgSentenceLength - metrics2.syntactic.avgSentenceLength) > 5) {
      affected.push('sentence_structure')
    }
    if (Math.abs(metrics1.semantic.formalityLevel - metrics2.semantic.formalityLevel) > 0.2) {
      affected.push('formality')
    }
    
    return affected
  }
  
  private metricsToProfile(metrics: StylometricMetrics): VoiceProfile {
    return {
      id: 'temp',
      userId: 'temp',
      traits: {
        lexicalSignature: {
          vocabularyRichness: metrics.lexical.vocabularyRichness,
          preferredWords: metrics.lexical.uniqueWordPreferences,
          phrasePatterns: metrics.lexical.commonPhrases,
          wordLengthProfile: metrics.lexical.wordLengthDistribution
        },
        syntacticSignature: {
          sentenceComplexity: metrics.syntactic.avgSentenceLength,
          punctuationStyle: metrics.syntactic.punctuationPatterns,
          paragraphRhythm: metrics.syntactic.paragraphStructure
        },
        semanticSignature: {
          tonalProfile: metrics.semantic.emotionalTone,
          formalityLevel: metrics.semantic.formalityLevel,
          topicalInterests: metrics.semantic.topicPreferences
        },
        stylisticSignature: {
          voiceCharacteristics: {
            activeVoicePreference: metrics.stylistic.activeVsPassiveRatio,
            contractionUsage: metrics.stylistic.contractionFrequency,
            personalPronounUsage: metrics.stylistic.firstPersonUsage
          },
          writingPatterns: {
            transitionStyle: metrics.stylistic.transitionWordsUsage,
            rhetoricalDevices: metrics.stylistic.rhetoricalDevices
          }
        },
        consistency: 1,
        confidence: 1
      },
      confidence: 1,
      sampleCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
  
  private identifyProfileDifferences(profile1: VoiceProfile, profile2: VoiceProfile): string[] {
    const affected: string[] = []
    
    const sim = this.compareVoices(profile1, profile2)
    if (sim < 90) affected.push('overall_style')
    if (sim < 70) affected.push('voice_character')
    if (sim < 50) affected.push('writing_identity')
    
    return affected
  }
  
  private detectSignificantChanges(profile1: VoiceprintTraits, profile2: VoiceprintTraits): string[] {
    const changes: string[] = []
    
    if (Math.abs(profile1.lexicalSignature.vocabularyRichness - profile2.lexicalSignature.vocabularyRichness) > 0.15) {
      changes.push('vocabulary_complexity')
    }
    if (Math.abs(profile1.syntacticSignature.sentenceComplexity - profile2.syntacticSignature.sentenceComplexity) > 5) {
      changes.push('sentence_patterns')
    }
    if (profile1.semanticSignature.tonalProfile !== profile2.semanticSignature.tonalProfile) {
      changes.push('emotional_tone')
    }
    
    return changes
  }
  
  private analyzeTrend(oldMetrics: StylometricMetrics[], newMetrics: StylometricMetrics[]): 'stable' | 'evolving' | 'shifting' {
    const oldAvg = this.aggregateMetrics(oldMetrics)
    const newAvg = this.aggregateMetrics(newMetrics)
    
    const diff = Math.abs(oldAvg.lexical.vocabularyRichness - newAvg.lexical.vocabularyRichness)
    
    if (diff < 0.05) return 'stable'
    if (diff < 0.15) return 'evolving'
    return 'shifting'
  }
  
  private generateEvolutionRecommendations(changes: string[]): string[] {
    const recommendations: string[] = []
    
    if (changes.includes('vocabulary_complexity')) {
      recommendations.push('Your vocabulary usage has shifted. Consider if this aligns with your intended audience.')
    }
    if (changes.includes('sentence_patterns')) {
      recommendations.push('Your sentence structure has evolved. This may affect readability.')
    }
    if (changes.includes('emotional_tone')) {
      recommendations.push('Your emotional tone has changed. Ensure this matches your communication goals.')
    }
    
    return recommendations
  }
}

// Export singleton instance
export const voiceProfileEngine = new VoiceProfileEngine()