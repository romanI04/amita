'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'

interface VoiceSafeToggleProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  isPremium: boolean
  suggestionCount?: number
  filteredCount?: number
  className?: string
}

export function VoiceSafeToggle({
  enabled,
  onChange,
  isPremium,
  suggestionCount = 0,
  filteredCount = 0,
  className = ''
}: VoiceSafeToggleProps) {
  const handleToggle = () => {
    if (!isPremium) return
    onChange(!enabled)
  }
  
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Voice-Safe Mode</span>
        
        {/* ASCII Toggle */}
        <button
          onClick={handleToggle}
          disabled={!isPremium}
          className={`
            relative inline-flex items-center h-6 rounded-full w-16 transition-colors
            ${enabled && isPremium ? 'bg-gray-900' : 'bg-gray-300'}
            ${!isPremium ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-label="Toggle Voice-Safe Mode"
        >
          <span className="sr-only">Voice-Safe Mode</span>
          
          {/* Dots indicator */}
          <motion.span
            animate={{ x: enabled ? 28 : 4 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inline-flex items-center justify-center w-8 text-xs font-mono select-none"
          >
            {enabled ? '●●' : '○○'}
          </motion.span>
        </button>
        
        {/* Lock icon */}
        {enabled && isPremium && (
          <LockClosedIcon className="w-3.5 h-3.5 text-gray-600" />
        )}
      </div>
      
      {/* Filter count */}
      {isPremium && suggestionCount > 0 && (
        <span className="text-xs text-gray-500">
          {enabled && filteredCount < suggestionCount
            ? `Showing ${filteredCount} of ${suggestionCount} (voice-safe only)`
            : `${suggestionCount} suggestions`
          }
        </span>
      )}
      
      {/* Premium upsell for free users */}
      {!isPremium && (
        <span className="text-xs text-gray-500 italic">
          Premium feature
        </span>
      )}
    </div>
  )
}

// Compact version for tight spaces
export function VoiceSafeBadge({ 
  enabled,
  isPremium,
  className = '' 
}: { 
  enabled: boolean
  isPremium: boolean
  className?: string 
}) {
  if (!isPremium) return null
  
  return (
    <span 
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
        ${enabled 
          ? 'bg-gray-900 text-white' 
          : 'bg-gray-100 text-gray-600 border border-gray-300'
        }
        ${className}
      `}
    >
      {enabled ? (
        <>
          <span className="font-mono">●●</span>
          <span>Voice-Safe</span>
        </>
      ) : (
        <>
          <span className="font-mono">○○</span>
          <span>All Edits</span>
        </>
      )}
    </span>
  )
}