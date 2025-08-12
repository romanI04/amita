/**
 * Stylometric feature extraction for voiceprint analysis
 * Pure functions for reproducible text analysis
 */

export interface StylometricMetrics {
  // Lexical diversity
  typeTokenRatio: number
  uniqueWordRatio: number
  averageWordLength: number
  
  // Sentence structure
  averageSentenceLength: number
  sentenceLengthStdDev: number
  complexSentenceRatio: number
  
  // Syntactic patterns
  punctuationDensity: Record<string, number>
  clauseRatio: number
  passiveVoiceRatio: number
  
  // Vocabulary sophistication
  rareWordRatio: number
  clicheRatio: number
  formalityScore: number
}

export interface TextStats {
  wordCount: number
  sentenceCount: number
  paragraphCount: number
  characterCount: number
}

/**
 * Extract comprehensive stylometric features from text
 */
export function extractStylometricFeatures(text: string): StylometricMetrics {
  const stats = getBasicStats(text)
  const words = tokenizeWords(text)
  const sentences = tokenizeSentences(text)
  
  return {
    // Lexical diversity
    typeTokenRatio: calculateTypeTokenRatio(words),
    uniqueWordRatio: calculateUniqueWordRatio(words),
    averageWordLength: calculateAverageWordLength(words),
    
    // Sentence structure
    averageSentenceLength: stats.wordCount / stats.sentenceCount || 0,
    sentenceLengthStdDev: calculateSentenceLengthStdDev(sentences),
    complexSentenceRatio: calculateComplexSentenceRatio(sentences),
    
    // Syntactic patterns
    punctuationDensity: calculatePunctuationDensity(text),
    clauseRatio: calculateClauseRatio(sentences),
    passiveVoiceRatio: calculatePassiveVoiceRatio(sentences),
    
    // Vocabulary sophistication
    rareWordRatio: calculateRareWordRatio(words),
    clicheRatio: calculateClicheRatio(text),
    formalityScore: calculateFormalityScore(words)
  }
}

/**
 * Get basic text statistics
 */
export function getBasicStats(text: string): TextStats {
  const cleanText = text.trim()
  
  const words = tokenizeWords(cleanText)
  const sentences = tokenizeSentences(cleanText)
  const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    characterCount: cleanText.length
  }
}

/**
 * Tokenize text into words
 */
function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
}

/**
 * Tokenize text into sentences
 */
function tokenizeSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Calculate Type-Token Ratio (vocabulary diversity)
 */
function calculateTypeTokenRatio(words: string[]): number {
  if (words.length === 0) return 0
  const uniqueWords = new Set(words)
  return uniqueWords.size / words.length
}

/**
 * Calculate unique word ratio
 */
function calculateUniqueWordRatio(words: string[]): number {
  if (words.length === 0) return 0
  const wordCounts = new Map<string, number>()
  
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
  })
  
  const uniqueWords = Array.from(wordCounts.values()).filter(count => count === 1)
  return uniqueWords.length / words.length
}

/**
 * Calculate average word length
 */
function calculateAverageWordLength(words: string[]): number {
  if (words.length === 0) return 0
  const totalLength = words.reduce((sum, word) => sum + word.length, 0)
  return totalLength / words.length
}

/**
 * Calculate sentence length standard deviation
 */
function calculateSentenceLengthStdDev(sentences: string[]): number {
  if (sentences.length <= 1) return 0
  
  const lengths = sentences.map(s => tokenizeWords(s).length)
  const mean = lengths.reduce((sum, len) => sum + len, 0) / lengths.length
  
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - mean, 2), 0) / lengths.length
  return Math.sqrt(variance)
}

/**
 * Calculate complex sentence ratio (sentences with multiple clauses)
 */
function calculateComplexSentenceRatio(sentences: string[]): number {
  if (sentences.length === 0) return 0
  
  const complexSentences = sentences.filter(sentence => {
    const conjunctions = (sentence.match(/\b(and|but|or|because|since|although|while|if|when)\b/gi) || []).length
    const commas = (sentence.match(/,/g) || []).length
    return conjunctions > 0 || commas > 1
  })
  
  return complexSentences.length / sentences.length
}

/**
 * Calculate punctuation density
 */
function calculatePunctuationDensity(text: string): Record<string, number> {
  const punctuationMarks = ['.', ',', ';', ':', '!', '?', '-', '(', ')', '"', "'"]
  const density: Record<string, number> = {}
  const totalChars = text.length
  
  punctuationMarks.forEach(mark => {
    const count = (text.match(new RegExp(`\\${mark}`, 'g')) || []).length
    density[mark] = totalChars > 0 ? count / totalChars : 0
  })
  
  return density
}

/**
 * Calculate clause ratio (approximate)
 */
function calculateClauseRatio(sentences: string[]): number {
  if (sentences.length === 0) return 0
  
  let totalClauses = 0
  sentences.forEach(sentence => {
    // Rough approximation: count conjunctions and comma-separated segments
    const conjunctions = (sentence.match(/\b(and|but|or|because|since|although|while|if|when|that|which)\b/gi) || []).length
    const commas = (sentence.match(/,/g) || []).length
    const clauses = Math.max(1, conjunctions + Math.floor(commas / 2) + 1)
    totalClauses += clauses
  })
  
  return totalClauses / sentences.length
}

/**
 * Calculate passive voice ratio (approximate)
 */
function calculatePassiveVoiceRatio(sentences: string[]): number {
  if (sentences.length === 0) return 0
  
  const passiveSentences = sentences.filter(sentence => {
    // Simple heuristic: look for "to be" + past participle patterns
    const passivePattern = /\b(is|are|was|were|been|being)\s+\w+(ed|en)\b/gi
    return passivePattern.test(sentence)
  })
  
  return passiveSentences.length / sentences.length
}

/**
 * Calculate rare word ratio (words longer than 6 characters)
 */
function calculateRareWordRatio(words: string[]): number {
  if (words.length === 0) return 0
  const rareWords = words.filter(word => word.length > 6)
  return rareWords.length / words.length
}

/**
 * Calculate cliché ratio (common phrases)
 */
function calculateClicheRatio(text: string): number {
  const commonCliches = [
    'at the end of the day',
    'think outside the box',
    'low hanging fruit',
    'game changer',
    'moving forward',
    'circle back',
    'touch base',
    'best practices',
    'leverage',
    'synergy'
  ]
  
  const lowerText = text.toLowerCase()
  const clicheCount = commonCliches.reduce((count, cliche) => {
    const matches = (lowerText.match(new RegExp(cliche, 'g')) || []).length
    return count + matches
  }, 0)
  
  const totalWords = tokenizeWords(text).length
  return totalWords > 0 ? clicheCount / totalWords : 0
}

/**
 * Calculate formality score (based on word choice)
 */
function calculateFormalityScore(words: string[]): number {
  if (words.length === 0) return 0
  
  const formalWords = [
    'therefore', 'consequently', 'furthermore', 'moreover', 'nevertheless',
    'subsequently', 'accordingly', 'thus', 'hence', 'whereas', 'wherein',
    'utilize', 'demonstrate', 'indicate', 'establish', 'maintain', 'acquire'
  ]
  
  const informalWords = [
    'yeah', 'okay', 'stuff', 'things', 'guys', 'gonna', 'wanna',
    'kinda', 'sorta', 'really', 'pretty', 'super', 'awesome', 'cool'
  ]
  
  let formalCount = 0
  let informalCount = 0
  
  words.forEach(word => {
    if (formalWords.includes(word)) formalCount++
    if (informalWords.includes(word)) informalCount++
  })
  
  const totalStyleMarkers = formalCount + informalCount
  if (totalStyleMarkers === 0) return 0.5 // Neutral
  
  return formalCount / totalStyleMarkers
}