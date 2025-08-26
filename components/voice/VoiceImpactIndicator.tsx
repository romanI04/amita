'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface VoiceImpactIndicatorProps {
  similarity: number // 0-100
  size?: 'xs' | 'sm' | 'md'
  showPercentage?: boolean
  isActive?: boolean
  className?: string
}

export function VoiceImpactIndicator({
  similarity,
  size = 'sm',
  showPercentage = true,
  isActive = false,
  className = ''
}: VoiceImpactIndicatorProps) {
  // Calculate filled dots (out of 10)
  const filledDots = Math.round(similarity / 10)
  const emptyDots = 10 - filledDots
  
  // Determine color based on similarity
  const getColor = () => {
    if (similarity >= 70) return 'text-gray-900' // Voice-safe
    if (similarity >= 50) return 'text-yellow-600' // Caution
    return 'text-red-600' // Risk
  }
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  }
  
  const dotSpacing = {
    xs: 'tracking-tighter',
    sm: 'tracking-tight',
    md: 'tracking-normal'
  }
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span 
        className={`font-mono ${sizeClasses[size]} ${dotSpacing[size]} select-none`}
        aria-label={`Voice similarity: ${similarity}%`}
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const isFilled = i < filledDots
          const dotChar = isFilled ? '●' : '○'
          
          return (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale: isActive && i === filledDots - 1 ? [1, 1.15, 1] : 1
              }}
              transition={{
                opacity: { delay: i * 0.02 },
                scale: { duration: 0.3 }
              }}
              className={isFilled && isActive ? getColor() : 'text-gray-400'}
              style={{ marginRight: '1px' }}
            >
              {dotChar}
            </motion.span>
          )
        })}
      </span>
      
      {showPercentage && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-xs font-mono ${getColor()}`}
        >
          {similarity}%
        </motion.span>
      )}
    </div>
  )
}

// Compact variant for inline display
export function VoiceImpactBadge({ 
  similarity,
  className = '' 
}: { 
  similarity: number
  className?: string 
}) {
  const isVoiceSafe = similarity >= 70
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 ${className}`}
    >
      <span className="text-xs text-gray-600">Voice:</span>
      <VoiceImpactIndicator 
        similarity={similarity} 
        size="xs" 
        showPercentage={true}
        isActive={isVoiceSafe}
      />
    </span>
  )
}

// Voice comparison display
export function VoiceComparison({
  before,
  after,
  className = ''
}: {
  before: number
  after: number
  className?: string
}) {
  const delta = after - before
  const improved = delta >= 0
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Before:</span>
        <VoiceImpactIndicator similarity={before} size="xs" showPercentage={true} />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">After:</span>
        <VoiceImpactIndicator similarity={after} size="xs" showPercentage={true} isActive />
      </div>
      
      <div className="pt-2 border-t border-gray-100">
        <span className={`text-xs font-medium ${improved ? 'text-green-600' : 'text-red-600'}`}>
          {improved ? '↑' : '↓'} {Math.abs(delta)}% voice {improved ? 'improvement' : 'drift'}
        </span>
      </div>
    </div>
  )
}