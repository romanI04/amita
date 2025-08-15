import React, { JSX } from 'react'

interface DiffViewProps {
  original: string
  modified: string
  className?: string
}

export function DiffView({ original, modified, className = '' }: DiffViewProps) {
  // Simple word-level diff highlighting
  const getWordDiff = () => {
    const originalWords = original.split(/\s+/)
    const modifiedWords = modified.split(/\s+/)
    
    const maxLength = Math.max(originalWords.length, modifiedWords.length)
    const diffElements: JSX.Element[] = []
    
    for (let i = 0; i < maxLength; i++) {
      const origWord = originalWords[i]
      const modWord = modifiedWords[i]
      
      if (origWord === modWord) {
        // Unchanged word
        diffElements.push(
          <span key={i} className="text-gray-700">
            {modWord}{' '}
          </span>
        )
      } else if (!origWord && modWord) {
        // Added word
        diffElements.push(
          <span key={i} className="bg-green-100 text-green-800 px-0.5 rounded">
            {modWord}{' '}
          </span>
        )
      } else if (origWord && !modWord) {
        // Removed word
        diffElements.push(
          <span key={i} className="bg-red-100 text-red-800 px-0.5 rounded line-through">
            {origWord}{' '}
          </span>
        )
      } else {
        // Changed word
        diffElements.push(
          <span key={i}>
            <span className="bg-red-100 text-red-800 px-0.5 rounded line-through">
              {origWord}
            </span>
            {' '}
            <span className="bg-green-100 text-green-800 px-0.5 rounded">
              {modWord}
            </span>
            {' '}
          </span>
        )
      }
    }
    
    return diffElements
  }
  
  return (
    <div className={`text-sm leading-relaxed ${className}`}>
      {getWordDiff()}
    </div>
  )
}

export function InlineDiff({ original, modified }: { original: string; modified: string }) {
  if (original === modified) {
    return <span className="text-gray-700">{modified}</span>
  }
  
  // Character-level diff for inline display
  const getCharDiff = () => {
    const result: JSX.Element[] = []
    let i = 0, j = 0
    
    while (i < original.length || j < modified.length) {
      if (i < original.length && j < modified.length && original[i] === modified[j]) {
        result.push(<span key={`${i}-${j}`}>{original[i]}</span>)
        i++
        j++
      } else if (i >= original.length) {
        result.push(
          <span key={`add-${j}`} className="bg-green-100 text-green-800">
            {modified[j]}
          </span>
        )
        j++
      } else if (j >= modified.length) {
        result.push(
          <span key={`del-${i}`} className="bg-red-100 text-red-800 line-through">
            {original[i]}
          </span>
        )
        i++
      } else {
        // Find next matching character
        let nextMatch = -1
        for (let k = j + 1; k < Math.min(j + 10, modified.length); k++) {
          if (original[i] === modified[k]) {
            nextMatch = k
            break
          }
        }
        
        if (nextMatch > 0) {
          // Insert characters up to next match
          for (let k = j; k < nextMatch; k++) {
            result.push(
              <span key={`ins-${k}`} className="bg-green-100 text-green-800">
                {modified[k]}
              </span>
            )
          }
          j = nextMatch
        } else {
          // Replace character
          result.push(
            <span key={`rep-${i}-${j}`}>
              <span className="bg-red-100 text-red-800 line-through">{original[i]}</span>
              <span className="bg-green-100 text-green-800">{modified[j]}</span>
            </span>
          )
          i++
          j++
        }
      }
    }
    
    return result
  }
  
  return <span className="text-sm">{getCharDiff()}</span>
}