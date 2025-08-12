/**
 * Semantic analysis for voiceprint signatures
 * Embeddings, distinctive n-grams, and semantic fingerprinting
 */

import { xaiClient } from '@/lib/xai/client'

export interface SemanticSignature {
  // Embedding-based features
  centroidVector: number[] | null
  semanticCohesion: number
  topicDiversity: number
  
  // N-gram analysis
  distinctiveUnigrams: Array<{ word: string; frequency: number; distinctiveness: number }>
  distinctiveBigrams: Array<{ phrase: string; frequency: number; distinctiveness: number }>
  distinctiveTrigrams: Array<{ phrase: string; frequency: number; distinctiveness: number }>
  
  // Style markers
  vocabularyRichness: number
  conceptualDepth: number
  writingTempo: number
}

export interface EmbeddingResult {
  vector: number[]
  success: boolean
  error?: string
}

/**
 * Extract semantic signature from multiple text samples
 */
export async function extractSemanticSignature(texts: string[]): Promise<SemanticSignature> {
  try {
    // Generate embeddings for each text
    const embeddings = await Promise.all(
      texts.map(text => generateTextEmbedding(text))
    )
    
    const validEmbeddings = embeddings.filter(e => e.success).map(e => e.vector)
    
    // Calculate centroid and cohesion
    const centroid = validEmbeddings.length > 0 ? calculateCentroid(validEmbeddings) : null
    const cohesion = validEmbeddings.length > 1 ? calculateSemanticCohesion(validEmbeddings) : 0
    
    // Analyze n-grams across all texts
    const combinedText = texts.join(' ')
    const ngrams = extractDistinctiveNGrams(texts)
    
    return {
      centroidVector: centroid,
      semanticCohesion: cohesion,
      topicDiversity: calculateTopicDiversity(validEmbeddings),
      distinctiveUnigrams: ngrams.unigrams,
      distinctiveBigrams: ngrams.bigrams,
      distinctiveTrigrams: ngrams.trigrams,
      vocabularyRichness: calculateVocabularyRichness(combinedText),
      conceptualDepth: calculateConceptualDepth(combinedText),
      writingTempo: calculateWritingTempo(combinedText)
    }
  } catch (error) {
    console.error('Semantic signature extraction failed:', error)
    return getDefaultSemanticSignature()
  }
}

/**
 * Generate text embedding using xAI or fallback method
 */
async function generateTextEmbedding(text: string): Promise<EmbeddingResult> {
  try {
    // Use xAI for semantic analysis (simplified approach)
    const response = await xaiClient.analyze(text, 'semantic-analysis')
    
    // Extract numbers from response (simplified embedding)
    const numbers = extractNumbersFromText(response.improvement_suggestions.join(' '))
    
    if (numbers.length >= 10) {
      return {
        vector: numbers.slice(0, 10),
        success: true
      }
    }
    
    // Fallback to simple text-based features
    return {
      vector: generateSimpleEmbedding(text),
      success: true
    }
  } catch (error) {
    return {
      vector: generateSimpleEmbedding(text),
      success: true
    }
  }
}

/**
 * Generate simple embedding based on text features
 */
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  return [
    Math.min(words.length / 100, 1), // Length complexity
    calculateFormalityFromText(text), // Formality
    calculateCreativityFromText(text), // Creativity
    calculateTechnicalDepth(words), // Technical depth
    calculateEmotionalTone(words), // Emotional tone
    calculateClarity(sentences), // Clarity
    calculatePersuasiveness(text), // Persuasiveness
    calculateNarrativeStyle(text), // Narrative style
    calculateAnalyticalThinking(text), // Analytical thinking
    calculatePersonalVoice(text) // Personal voice
  ]
}

/**
 * Calculate centroid of embedding vectors
 */
function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  
  const dimensions = vectors[0].length
  const centroid = new Array(dimensions).fill(0)
  
  vectors.forEach(vector => {
    vector.forEach((value, index) => {
      centroid[index] += value
    })
  })
  
  return centroid.map(sum => sum / vectors.length)
}

/**
 * Calculate semantic cohesion across embeddings
 */
function calculateSemanticCohesion(vectors: number[][]): number {
  if (vectors.length < 2) return 1
  
  const centroid = calculateCentroid(vectors)
  let totalDistance = 0
  
  vectors.forEach(vector => {
    const distance = calculateEuclideanDistance(vector, centroid)
    totalDistance += distance
  })
  
  const averageDistance = totalDistance / vectors.length
  // Convert distance to cohesion (inverse relationship)
  return Math.max(0, 1 - (averageDistance / Math.sqrt(centroid.length)))
}

/**
 * Calculate topic diversity
 */
function calculateTopicDiversity(vectors: number[][]): number {
  if (vectors.length < 2) return 0
  
  let totalDistance = 0
  let comparisons = 0
  
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      totalDistance += calculateEuclideanDistance(vectors[i], vectors[j])
      comparisons++
    }
  }
  
  return comparisons > 0 ? totalDistance / comparisons : 0
}

/**
 * Calculate Euclidean distance between two vectors
 */
function calculateEuclideanDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0
  
  let sumSquares = 0
  for (let i = 0; i < vec1.length; i++) {
    sumSquares += Math.pow(vec1[i] - vec2[i], 2)
  }
  
  return Math.sqrt(sumSquares)
}

/**
 * Extract distinctive n-grams from texts
 */
function extractDistinctiveNGrams(texts: string[]) {
  const allUnigrams = new Map<string, number>()
  const allBigrams = new Map<string, number>()
  const allTrigrams = new Map<string, number>()
  
  texts.forEach(text => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2) // Filter short words
    
    // Unigrams
    words.forEach(word => {
      allUnigrams.set(word, (allUnigrams.get(word) || 0) + 1)
    })
    
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`
      allBigrams.set(bigram, (allBigrams.get(bigram) || 0) + 1)
    }
    
    // Trigrams
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
      allTrigrams.set(trigram, (allTrigrams.get(trigram) || 0) + 1)
    }
  })
  
  return {
    unigrams: getTopNGrams(allUnigrams, 10),
    bigrams: getTopNGrams(allBigrams, 5),
    trigrams: getTopNGrams(allTrigrams, 3)
  }
}

/**
 * Get top n-grams with frequency and distinctiveness scores
 */
function getTopNGrams(ngramMap: Map<string, number>, limit: number) {
  const ngrams = Array.from(ngramMap.entries())
    .map(([phrase, frequency]) => ({
      phrase: phrase,
      frequency,
      distinctiveness: calculateDistinctiveness(phrase, frequency)
    }))
    .sort((a, b) => b.distinctiveness - a.distinctiveness)
    .slice(0, limit)
  
  return ngrams.map(({ phrase, frequency, distinctiveness }) => ({
    word: phrase,
    phrase,
    frequency,
    distinctiveness
  }))
}

/**
 * Calculate distinctiveness score for an n-gram
 */
function calculateDistinctiveness(phrase: string, frequency: number): number {
  // Simple distinctiveness: higher frequency + longer phrases get higher scores
  const lengthBonus = phrase.split(' ').length * 0.1
  const frequencyScore = Math.log(frequency + 1)
  return frequencyScore + lengthBonus
}

/**
 * Extract numbers from text response
 */
function extractNumbersFromText(text: string): number[] {
  const numberPattern = /\b\d*\.?\d+\b/g
  const matches = text.match(numberPattern)
  
  if (!matches) return []
  
  return matches
    .map(match => parseFloat(match))
    .filter(num => !isNaN(num) && num >= 0 && num <= 1)
}

// Helper functions for simple embedding features
function calculateFormalityFromText(text: string): number {
  const formalMarkers = ['however', 'therefore', 'consequently', 'furthermore', 'moreover']
  const informalMarkers = ['yeah', 'okay', 'stuff', 'things', 'really']
  
  const formal = formalMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  const informal = informalMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  
  return formal + informal > 0 ? formal / (formal + informal) : 0.5
}

function calculateCreativityFromText(text: string): number {
  const creativeMarkers = ['imagine', 'creativity', 'innovative', 'unique', 'original', 'artistic']
  const matches = creativeMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  return Math.min(matches / 10, 1)
}

function calculateTechnicalDepth(words: string[]): number {
  const technicalWords = words.filter(word => word.length > 8 || /^[A-Z]{2,}$/.test(word))
  return Math.min(technicalWords.length / words.length * 5, 1)
}

function calculateEmotionalTone(words: string[]): number {
  const emotionalWords = ['feel', 'love', 'hate', 'excited', 'sad', 'happy', 'angry', 'surprised']
  const matches = words.filter(word => emotionalWords.includes(word.toLowerCase()))
  return Math.min(matches.length / words.length * 10, 1)
}

function calculateClarity(sentences: string[]): number {
  if (sentences.length === 0) return 0
  const avgLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
  return Math.max(0, 1 - (avgLength - 15) / 30) // Optimal around 15 words per sentence
}

function calculatePersuasiveness(text: string): number {
  const persuasiveMarkers = ['should', 'must', 'need to', 'important', 'crucial', 'essential']
  const matches = persuasiveMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  return Math.min(matches / 5, 1)
}

function calculateNarrativeStyle(text: string): number {
  const narrativeMarkers = ['then', 'next', 'after', 'before', 'when', 'while', 'during']
  const matches = narrativeMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  return Math.min(matches / 5, 1)
}

function calculateAnalyticalThinking(text: string): number {
  const analyticalMarkers = ['analysis', 'because', 'therefore', 'result', 'conclusion', 'evidence']
  const matches = analyticalMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  return Math.min(matches / 5, 1)
}

function calculatePersonalVoice(text: string): number {
  const personalMarkers = ['I', 'my', 'me', 'personally', 'in my opinion', 'I believe']
  const matches = personalMarkers.reduce((count, marker) => count + (text.toLowerCase().includes(marker) ? 1 : 0), 0)
  return Math.min(matches / 10, 1)
}

function calculateVocabularyRichness(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  const uniqueWords = new Set(words)
  return uniqueWords.size / words.length
}

function calculateConceptualDepth(text: string): number {
  const abstractWords = ['concept', 'idea', 'theory', 'principle', 'philosophy', 'meaning']
  const matches = abstractWords.reduce((count, word) => count + (text.toLowerCase().includes(word) ? 1 : 0), 0)
  return Math.min(matches / 3, 1)
}

function calculateWritingTempo(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  if (sentences.length === 0) return 0.5
  
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length
  // Normalize to 0-1 where 0.5 is average tempo
  return Math.max(0, Math.min(1, 0.5 + (15 - avgSentenceLength) / 30))
}

/**
 * Default semantic signature for error cases
 */
function getDefaultSemanticSignature(): SemanticSignature {
  return {
    centroidVector: null,
    semanticCohesion: 0,
    topicDiversity: 0,
    distinctiveUnigrams: [],
    distinctiveBigrams: [],
    distinctiveTrigrams: [],
    vocabularyRichness: 0.5,
    conceptualDepth: 0.3,
    writingTempo: 0.5
  }
}