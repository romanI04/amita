/**
 * Text chunking utilities for handling long content
 */

export interface TextChunk {
  id: string
  content: string
  startIndex: number
  endIndex: number
  wordCount: number
  charCount: number
}

export interface ChunkingOptions {
  maxChunkSize?: number // in characters
  overlap?: number // characters to overlap between chunks
  preserveParagraphs?: boolean // try to keep paragraphs intact
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 3000, // ~500-600 words
  overlap: 200,
  preserveParagraphs: true
}

/**
 * Split text into manageable chunks for processing
 */
export function chunkText(
  text: string, 
  options: ChunkingOptions = {}
): TextChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const chunks: TextChunk[] = []
  
  if (text.length <= opts.maxChunkSize!) {
    // Text is small enough to process as one chunk
    return [{
      id: 'chunk-0',
      content: text,
      startIndex: 0,
      endIndex: text.length,
      wordCount: text.trim().split(/\s+/).length,
      charCount: text.length
    }]
  }

  if (opts.preserveParagraphs) {
    // Try to split at paragraph boundaries
    const paragraphs = text.split(/\n\n+/)
    let currentChunk = ''
    let currentStartIndex = 0
    let chunkIndex = 0

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      const separator = i > 0 ? '\n\n' : ''
      
      // If adding this paragraph would exceed the limit
      if (currentChunk.length + separator.length + paragraph.length > opts.maxChunkSize!) {
        // Save current chunk if it has content
        if (currentChunk.length > 0) {
          chunks.push({
            id: `chunk-${chunkIndex++}`,
            content: currentChunk,
            startIndex: currentStartIndex,
            endIndex: currentStartIndex + currentChunk.length,
            wordCount: currentChunk.trim().split(/\s+/).length,
            charCount: currentChunk.length
          })
          
          // Start new chunk with overlap from previous
          if (opts.overlap! > 0 && currentChunk.length > opts.overlap!) {
            const overlapText = currentChunk.slice(-opts.overlap!)
            currentChunk = overlapText + separator + paragraph
            currentStartIndex = currentStartIndex + currentChunk.length - overlapText.length - separator.length - paragraph.length
          } else {
            currentStartIndex = text.indexOf(paragraph, currentStartIndex + currentChunk.length)
            currentChunk = paragraph
          }
        }
      } else {
        // Add paragraph to current chunk
        currentChunk += (currentChunk.length > 0 ? separator : '') + paragraph
      }
    }

    // Add final chunk
    if (currentChunk.length > 0) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentChunk,
        startIndex: currentStartIndex,
        endIndex: currentStartIndex + currentChunk.length,
        wordCount: currentChunk.trim().split(/\s+/).length,
        charCount: currentChunk.length
      })
    }
  } else {
    // Simple character-based chunking
    let position = 0
    let chunkIndex = 0

    while (position < text.length) {
      const chunkSize = Math.min(opts.maxChunkSize!, text.length - position)
      const chunk = text.slice(position, position + chunkSize)
      
      chunks.push({
        id: `chunk-${chunkIndex++}`,
        content: chunk,
        startIndex: position,
        endIndex: position + chunkSize,
        wordCount: chunk.trim().split(/\s+/).length,
        charCount: chunk.length
      })

      // Move position forward, accounting for overlap
      position += chunkSize - opts.overlap!
      if (position + opts.overlap! >= text.length) {
        break // Avoid creating a tiny final chunk
      }
    }
  }

  return chunks
}

/**
 * Merge analysis results from multiple chunks
 */
export function mergeChunkResults(
  chunks: Array<{
    chunk: TextChunk
    analysis: any
  }>
): any {
  // Aggregate scores across chunks
  const totalWords = chunks.reduce((sum, c) => sum + c.chunk.wordCount, 0)
  const weightedAiScore = chunks.reduce(
    (sum, c) => sum + (c.analysis.ai_confidence_score || 0) * c.chunk.wordCount,
    0
  ) / totalWords
  const weightedAuthScore = chunks.reduce(
    (sum, c) => sum + (c.analysis.authenticity_score || 0) * c.chunk.wordCount,
    0
  ) / totalWords

  // Combine detected sections from all chunks
  const allDetectedSections: any[] = []
  for (const { chunk, analysis } of chunks) {
    if (analysis.detected_sections) {
      for (const section of analysis.detected_sections) {
        allDetectedSections.push({
          ...section,
          // Adjust indices based on chunk position
          start_index: (section.start_index || 0) + chunk.startIndex,
          end_index: (section.end_index || 0) + chunk.startIndex
        })
      }
    }
  }

  // Combine improvement suggestions
  const allSuggestions = new Set<string>()
  for (const { analysis } of chunks) {
    if (analysis.improvement_suggestions) {
      for (const suggestion of analysis.improvement_suggestions) {
        allSuggestions.add(suggestion)
      }
    }
  }

  return {
    ai_confidence_score: Math.round(weightedAiScore),
    authenticity_score: Math.round(weightedAuthScore),
    detected_sections: allDetectedSections,
    improvement_suggestions: Array.from(allSuggestions),
    analysis_metadata: {
      chunks_analyzed: chunks.length,
      total_words: totalWords,
      processing_strategy: 'chunked'
    }
  }
}

/**
 * Estimate processing time based on text length
 */
export function estimateProcessingTime(textLength: number): {
  estimatedSeconds: number
  requiresChunking: boolean
  chunkCount: number
} {
  const maxChunkSize = DEFAULT_OPTIONS.maxChunkSize!
  const requiresChunking = textLength > maxChunkSize
  const chunkCount = requiresChunking 
    ? Math.ceil(textLength / (maxChunkSize - DEFAULT_OPTIONS.overlap!))
    : 1

  // Estimate ~5 seconds per chunk for API processing
  const baseTime = chunkCount * 5
  // Add overhead for chunking and merging
  const overhead = requiresChunking ? chunkCount * 0.5 : 0
  
  return {
    estimatedSeconds: Math.round(baseTime + overhead),
    requiresChunking,
    chunkCount
  }
}