'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface VoiceTeaseProps {
  similarity?: number
  isPremium: boolean
  hasVoiceProfile: boolean
  className?: string
}

export function VoiceTease({
  similarity = 75,
  isPremium,
  hasVoiceProfile,
  className = ''
}: VoiceTeaseProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  if (isPremium && hasVoiceProfile) return null // Don't show teaser to premium users
  
  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Blurred voice indicator */}
      <div className="relative">
        <div className={`${!isPremium ? 'blur-sm' : ''} select-none pointer-events-none`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Voice Impact:</span>
            <span className="font-mono text-sm">
              {'●'.repeat(Math.round(similarity / 10))}{'○'.repeat(10 - Math.round(similarity / 10))}
            </span>
            <span className="text-xs font-medium text-gray-700">{similarity}%</span>
          </div>
        </div>
        
        {/* Lock overlay */}
        {!isPremium && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LockClosedIcon className="w-4 h-4 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Hover tooltip */}
      <AnimatePresence>
        {isHovered && !isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-full mt-2 left-0 z-50 w-64 p-3 bg-gray-900 text-white rounded-lg shadow-xl"
          >
            <p className="text-xs mb-2">
              {hasVoiceProfile 
                ? "Upgrade to see how this edit affects your unique voice"
                : "Create a voice profile to see personalized impact scores"
              }
            </p>
            <Link
              href={hasVoiceProfile ? "/pricing" : "/profile"}
              className="inline-flex items-center gap-1 text-xs font-medium text-green-400 hover:text-green-300"
            >
              {hasVoiceProfile ? "Upgrade to Pro" : "Create Voice Profile"}
              <SparklesIcon className="w-3 h-3" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline teaser for suggestion cards
export function InlineVoiceTeaser({
  isPremium,
  hasVoiceProfile,
  className = ''
}: {
  isPremium: boolean
  hasVoiceProfile: boolean
  className?: string
}) {
  if (isPremium) return null
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 ${className}`}>
      <LockClosedIcon className="w-4 h-4 text-gray-400" />
      <div className="flex-1">
        <p className="text-xs text-gray-600">
          {hasVoiceProfile 
            ? "Voice impact scores available in Pro"
            : "Create a voice profile for personalized suggestions"
          }
        </p>
      </div>
      <Link
        href={hasVoiceProfile ? "/pricing" : "/profile"}
        className="text-xs font-medium text-primary-600 hover:text-primary-700"
      >
        {hasVoiceProfile ? "Upgrade" : "Get Started"}
      </Link>
    </div>
  )
}

// Feature preview for landing/pricing pages
export function VoiceFeaturePreview({ className = '' }: { className?: string }) {
  const [activeDemo, setActiveDemo] = useState<'before' | 'after'>('before')
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setActiveDemo('before')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeDemo === 'before' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Without Voice Profile
        </button>
        <button
          onClick={() => setActiveDemo('after')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeDemo === 'after' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          With Voice Profile
        </button>
      </div>
      
      <AnimatePresence mode="wait">
        {activeDemo === 'before' ? (
          <motion.div
            key="before"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-6 bg-white rounded-xl border border-gray-200"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-3">Generic Suggestions</h3>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Change "got" to "received"</p>
                <p className="text-xs text-gray-500">Standard formal improvement</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Change "really good" to "excellent"</p>
                <p className="text-xs text-gray-500">Generic vocabulary enhancement</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="after"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-6 bg-white rounded-xl border border-green-200"
          >
            <h3 className="text-sm font-medium text-gray-900 mb-3">Voice-Aware Suggestions</h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-700">Keep "got" (your style)</p>
                  <span className="text-xs font-mono text-green-600">●●●●●●●●○○ 85%</span>
                </div>
                <p className="text-xs text-gray-500">Preserves your casual tone</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-700">Change "really good" to "solid"</p>
                  <span className="text-xs font-mono text-yellow-600">●●●●●●○○○○ 62%</span>
                </div>
                <p className="text-xs text-gray-500">Matches your concise style</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Call-to-action for voice profile creation
export function VoiceProfileCTA({ 
  sampleCount = 0,
  className = '' 
}: { 
  sampleCount?: number
  className?: string 
}) {
  const progress = Math.min((sampleCount / 3) * 100, 100)
  const isReady = sampleCount >= 3
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200 ${className}`}
    >
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-green-600 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {isReady ? "Voice Profile Ready!" : "Create Your Voice Profile"}
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            {isReady 
              ? "Your voice profile is ready to provide personalized suggestions"
              : `Add ${3 - sampleCount} more writing sample${3 - sampleCount !== 1 ? 's' : ''} to unlock voice-aware editing`
            }
          </p>
          
          {!isReady && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Progress</span>
                <span className="text-gray-700 font-medium">{sampleCount}/3 samples</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                />
              </div>
            </div>
          )}
          
          <Link
            href={isReady ? "/pricing" : "/profile"}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors"
          >
            {isReady ? "Upgrade to Use" : "Add Samples"}
            <SparklesIcon className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.div>
  )
}