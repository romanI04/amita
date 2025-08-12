/**
 * Position-based text replacement utility
 * Replaces text segments based on their position rather than string matching
 * This avoids issues with repeated phrases being replaced incorrectly
 */

export interface TextSegment {
  startIndex: number
  endIndex: number
  original: string
  replacement: string
}

/**
 * Apply multiple text replacements based on position
 * @param originalText The original text
 * @param segments Array of segments to replace, sorted by startIndex
 * @returns The text with all replacements applied
 */
export function applyPositionBasedReplacements(
  originalText: string,
  segments: TextSegment[]
): string {
  // Sort segments by startIndex in descending order
  // This ensures we replace from end to start, maintaining correct positions
  const sortedSegments = [...segments].sort((a, b) => b.startIndex - a.startIndex)
  
  let result = originalText
  
  for (const segment of sortedSegments) {
    // Validate segment boundaries
    if (segment.startIndex < 0 || segment.endIndex > originalText.length) {
      console.warn(`Invalid segment boundaries: ${segment.startIndex}-${segment.endIndex}`)
      continue
    }
    
    // Extract the actual text at this position
    const actualText = originalText.slice(segment.startIndex, segment.endIndex)
    
    // Verify the text matches what we expect (safety check)
    if (actualText !== segment.original) {
      console.warn(
        `Text mismatch at position ${segment.startIndex}-${segment.endIndex}. ` +
        `Expected: "${segment.original}", Found: "${actualText}"`
      )
      continue
    }
    
    // Apply the replacement at the specific position
    result = 
      result.slice(0, segment.startIndex) + 
      segment.replacement + 
      result.slice(segment.endIndex)
  }
  
  return result
}

/**
 * Find all occurrences of sections in text and return their positions
 * @param text The text to search in
 * @param sections Array of sections with their content
 * @returns Array of segments with position information
 */
export function findSectionPositions(
  text: string,
  sections: Array<{
    id: number
    original: string
    rewritten: string
    startIndex?: number
    endIndex?: number
  }>
): TextSegment[] {
  const segments: TextSegment[] = []
  
  for (const section of sections) {
    // If positions are already provided, use them
    if (section.startIndex !== undefined && section.endIndex !== undefined) {
      segments.push({
        startIndex: section.startIndex,
        endIndex: section.endIndex,
        original: section.original,
        replacement: section.rewritten
      })
    } else {
      // Otherwise, find the position (first occurrence)
      const index = text.indexOf(section.original)
      if (index !== -1) {
        segments.push({
          startIndex: index,
          endIndex: index + section.original.length,
          original: section.original,
          replacement: section.rewritten
        })
      }
    }
  }
  
  return segments
}

/**
 * Calculate the risk reduction for a set of changes
 * @param segments Array of text segments being replaced
 * @returns Estimated risk reduction percentage
 */
export function calculateRiskReduction(segments: TextSegment[]): number {
  // Simple heuristic: each replacement reduces risk by 3-8%
  // More sophisticated calculation would analyze the actual changes
  const baseReduction = 3
  const variableReduction = 5
  
  return segments.reduce((total, segment) => {
    const lengthRatio = segment.replacement.length / segment.original.length
    const adjustment = lengthRatio > 0.8 && lengthRatio < 1.2 ? 1 : 0.5
    return total + (baseReduction + Math.random() * variableReduction) * adjustment
  }, 0)
}

/**
 * Validate that segments don't overlap
 * @param segments Array of text segments
 * @returns True if no segments overlap
 */
export function validateSegments(segments: TextSegment[]): boolean {
  const sorted = [...segments].sort((a, b) => a.startIndex - b.startIndex)
  
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].endIndex > sorted[i + 1].startIndex) {
      console.error(
        `Overlapping segments detected: [${sorted[i].startIndex}-${sorted[i].endIndex}] ` +
        `overlaps with [${sorted[i + 1].startIndex}-${sorted[i + 1].endIndex}]`
      )
      return false
    }
  }
  
  return true
}