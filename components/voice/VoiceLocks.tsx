'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface VoiceLock {
  id: string
  name: string
  description: string
  enabled: boolean
  category: 'style' | 'tone' | 'structure'
}

interface VoiceLocksProps {
  locks?: VoiceLock[]
  onToggle?: (lockId: string, enabled: boolean) => void
  isPremium?: boolean
}

const DEFAULT_LOCKS: VoiceLock[] = [
  { 
    id: 'humor', 
    name: 'Keep my humor', 
    description: 'Preserve jokes and witty remarks',
    enabled: true,
    category: 'tone'
  },
  { 
    id: 'technical', 
    name: 'Technical depth', 
    description: 'Maintain technical terminology',
    enabled: false,
    category: 'style'
  },
  { 
    id: 'sentence_length', 
    name: 'Sentence rhythm', 
    description: 'Keep sentence length variation',
    enabled: true,
    category: 'structure'
  },
  { 
    id: 'formality', 
    name: 'Formality level', 
    description: 'Preserve professional tone',
    enabled: false,
    category: 'tone'
  },
  { 
    id: 'idioms', 
    name: 'Personal phrases', 
    description: 'Keep unique expressions',
    enabled: true,
    category: 'style'
  },
  { 
    id: 'punctuation', 
    name: 'Punctuation style', 
    description: 'Maintain punctuation patterns',
    enabled: false,
    category: 'structure'
  }
]

export function VoiceLocks({ 
  locks = DEFAULT_LOCKS,
  onToggle,
  isPremium = false
}: VoiceLocksProps) {
  const [localLocks, setLocalLocks] = useState(locks)
  
  const handleToggle = (lockId: string) => {
    if (!isPremium) return
    
    setLocalLocks(prev => prev.map(lock => 
      lock.id === lockId ? { ...lock, enabled: !lock.enabled } : lock
    ))
    
    const lock = localLocks.find(l => l.id === lockId)
    if (lock && onToggle) {
      onToggle(lockId, !lock.enabled)
    }
  }

  // Group locks by category
  const groupedLocks = localLocks.reduce((acc, lock) => {
    if (!acc[lock.category]) acc[lock.category] = []
    acc[lock.category].push(lock)
    return acc
  }, {} as Record<string, VoiceLock[]>)

  const categoryLabels = {
    style: 'Writing Style',
    tone: 'Tone & Voice',
    structure: 'Structure'
  }

  // Count active locks
  const activeLockCount = localLocks.filter(l => l.enabled).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••
          </span>
          {' '}Smart Voice Locks™
        </h3>
        <p className="text-xs text-gray-500">
          Lock aspects of your voice that AI should never change
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <span>Active locks:</span>
          <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            {'•'.repeat(activeLockCount)}{'○'.repeat(localLocks.length - activeLockCount)}
          </span>
          <span>({activeLockCount}/{localLocks.length})</span>
        </div>
      </div>

      {/* Lock Categories */}
      <div className={`space-y-4 ${!isPremium ? 'filter blur-sm pointer-events-none' : ''}`}>
        {Object.entries(groupedLocks).map(([category, categoryLocks]) => (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-700 mb-3">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>
            <div className="space-y-2">
              {categoryLocks.map((lock) => (
                <motion.div
                  key={lock.id}
                  whileHover={{ x: isPremium ? 2 : 0 }}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {lock.name}
                      </span>
                      {lock.enabled && (
                        <span 
                          className="text-xs text-green-600"
                          style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                        >
                          ••
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {lock.description}
                    </p>
                  </div>
                  
                  {/* ASCII Toggle Switch */}
                  <button
                    onClick={() => handleToggle(lock.id)}
                    className={`
                      flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all
                      ${lock.enabled 
                        ? 'bg-gray-900 border-gray-900' 
                        : 'bg-white border-gray-300'
                      }
                      ${isPremium ? 'cursor-pointer hover:shadow-sm' : 'cursor-not-allowed'}
                    `}
                    disabled={!isPremium}
                  >
                    <span 
                      className={`text-xs ${lock.enabled ? 'text-white' : 'text-gray-400'}`}
                      style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                    >
                      {lock.enabled ? '••' : '○○'}
                    </span>
                    <span className={`text-xs ${lock.enabled ? 'text-white' : 'text-gray-600'}`}>
                      {lock.enabled ? 'Locked' : 'Unlocked'}
                    </span>
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Example of locked text */}
      {activeLockCount > 0 && isPremium && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Example with locks applied:</p>
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              Original: "The data <span className="bg-yellow-100 px-1 rounded">clearly demonstrates</span> significant improvements."
            </p>
            <p className="text-xs text-gray-600">
              AI suggestion: "The data <span className="bg-green-100 px-1 rounded line-through">shows</span> <span className="text-green-700">clearly demonstrates</span> significant improvements."
            </p>
            <p className="text-xs text-gray-500 italic mt-2">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••</span> Technical terminology locked and preserved
            </p>
          </div>
        </div>
      )}

      {/* Premium Upsell */}
      {!isPremium && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-white border border-gray-300 rounded-lg p-4 text-center max-w-xs shadow-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">Premium Feature</p>
              <p className="text-xs text-gray-500 mb-3">
                Protect your unique voice with Smart Locks
              </p>
              <button className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-black transition-colors">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}