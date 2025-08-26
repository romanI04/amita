'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckBadgeIcon, 
  SparklesIcon,
  DocumentTextIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline'

interface TrustBadgeProps {
  type: 'voice-based' | 'high-confidence' | 'samples' | 'verified'
  value?: string | number
  className?: string
}

export function TrustBadge({ type, value, className = '' }: TrustBadgeProps) {
  const badges = {
    'voice-based': {
      icon: SparklesIcon,
      label: 'Based on your voice',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    'high-confidence': {
      icon: CheckBadgeIcon,
      label: 'High confidence',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    'samples': {
      icon: DocumentTextIcon,
      label: `${value || 0} samples`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    'verified': {
      icon: ShieldCheckIcon,
      label: 'Verified',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  }
  
  const badge = badges[type]
  const Icon = badge.icon
  
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
        ${badge.bgColor} ${badge.color} border border-current border-opacity-20
        ${className}
      `}
    >
      <Icon className="w-3 h-3" />
      <span>{badge.label}</span>
    </motion.span>
  )
}

interface TrustIndicatorsProps {
  sampleCount?: number
  confidence?: number
  hasVoiceProfile?: boolean
  className?: string
}

export function TrustIndicators({
  sampleCount,
  confidence,
  hasVoiceProfile,
  className = ''
}: TrustIndicatorsProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {hasVoiceProfile && (
        <TrustBadge type="voice-based" />
      )}
      
      {sampleCount && sampleCount > 0 && (
        <TrustBadge type="samples" value={sampleCount} />
      )}
      
      {confidence && confidence >= 80 && (
        <TrustBadge type="high-confidence" />
      )}
      
      {/* ASCII separator */}
      {(hasVoiceProfile || sampleCount || confidence) && (
        <span className="text-gray-300 text-xs font-mono select-none">
          ••••
        </span>
      )}
    </div>
  )
}

// Compact trust indicator for inline use
export function TrustDot({ 
  hasVoiceProfile,
  className = '' 
}: { 
  hasVoiceProfile: boolean
  className?: string 
}) {
  if (!hasVoiceProfile) return null
  
  return (
    <span 
      className={`inline-block w-2 h-2 rounded-full bg-green-500 ${className}`}
      title="Based on your voice profile"
      aria-label="Voice-based suggestion"
    />
  )
}

// Explanation component for trust building
export function TrustExplanation({
  reason,
  confidence,
  sampleBasis,
  className = ''
}: {
  reason: string
  confidence?: number
  sampleBasis?: number
  className?: string
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer select-none">
        <span className="font-mono">●</span> Why this suggestion?
      </summary>
      
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-2"
      >
        <p className="text-gray-700">{reason}</p>
        
        {(confidence || sampleBasis) && (
          <>
            <div className="border-t border-gray-200 pt-2 space-y-1">
              {confidence && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Analysis confidence:</span>
                  <span className="font-medium text-gray-900">{confidence}%</span>
                </div>
              )}
              
              {sampleBasis && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Based on:</span>
                  <span className="font-medium text-gray-900">
                    {sampleBasis} similar patterns
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        
        <div className="text-center text-gray-300" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
          ••••••••••••••••
        </div>
      </motion.div>
    </details>
  )
}

// Loading state for trust calculation
export function TrustCalculating({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
      <motion.span
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="font-mono"
      >
        ●●●
      </motion.span>
      <span>Analyzing with your voice profile...</span>
    </div>
  )
}