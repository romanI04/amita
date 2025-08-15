'use client'

import React, { useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { VoiceFingerprint, VoiceLocks, ProtectionScore, VoiceEvolution } from '@/components/voice'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { motion } from 'framer-motion'

// Mock data for demonstration - would come from API
const MOCK_VOICE_DATA = {
  dimensions: [
    { name: 'Vocabulary', value: 75, baseline: 70, description: 'Word choice sophistication' },
    { name: 'Flow', value: 60, baseline: 65, description: 'Rhythm and pacing' },
    { name: 'Formality', value: 45, baseline: 50, description: 'Professional vs casual' },
    { name: 'Emotion', value: 80, baseline: 75, description: 'Emotional expression' },
    { name: 'Clarity', value: 85, baseline: 80, description: 'Clear communication' },
    { name: 'Originality', value: 70, baseline: 60, description: 'Unique expression' },
    { name: 'Consistency', value: 65, baseline: 70, description: 'Style consistency' },
    { name: 'Authenticity', value: 90, baseline: 85, description: 'Human-like quality' }
  ],
  protectionScore: 72,
  vulnerabilities: [
    {
      id: 'transitions',
      severity: 'high' as const,
      description: 'Predictable transition phrases',
      fix: 'Vary your connecting words and phrases'
    },
    {
      id: 'sentence_starts',
      severity: 'medium' as const,
      description: 'Repetitive sentence openings',
      fix: 'Mix up how you begin sentences'
    },
    {
      id: 'vocabulary',
      severity: 'low' as const,
      description: 'Limited vocabulary range',
      fix: 'Introduce more varied word choices'
    }
  ],
  sampleCount: 12,
  totalWords: 4520,
  lastUpdated: '2024-01-15'
}

export default function VoicePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'fingerprint' | 'locks' | 'protection' | 'evolution'>('fingerprint')
  const [isPremium, setIsPremium] = useState(false) // Would come from subscription status
  
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-2xl text-gray-400">
                ••••••••
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Loading voice profile...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const tabs = [
    { id: 'fingerprint', label: 'Voice Fingerprint', premium: false },
    { id: 'locks', label: 'Smart Locks', premium: true },
    { id: 'protection', label: 'Protection Score', premium: true },
    { id: 'evolution', label: 'Evolution', premium: false }
  ]

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
            >
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>←</span>
              Back to Dashboard
            </button>
            
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Voice Profile
            </h1>
            <p className="text-gray-500">
              Your AI writing DNA - Track, protect, and perfect your unique voice
            </p>
            <div className="mt-4">
              <span className="text-xs text-gray-300" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                ••••••••••••••••••••••••••••••••••••••••
              </span>
            </div>
          </div>

          {/* Profile Stats Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Samples Analyzed</p>
                <p className="text-2xl font-light text-gray-900">{MOCK_VOICE_DATA.sampleCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Words</p>
                <p className="text-2xl font-light text-gray-900">{MOCK_VOICE_DATA.totalWords.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Protection Level</p>
                <p className="text-2xl font-light text-gray-900">{MOCK_VOICE_DATA.protectionScore}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                <p className="text-2xl font-light text-gray-900">
                  {new Date(MOCK_VOICE_DATA.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/analyze">
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Add More Samples →
                  </button>
                </Link>
                <button className="text-sm text-gray-600 hover:text-gray-900">
                  Export Voice Data →
                </button>
              </div>
              {!isPremium && (
                <button 
                  onClick={() => showToast('Premium features coming soon!', 'info')}
                  className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-black transition-colors"
                >
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-8 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm transition-all relative ${
                  activeTab === tab.id 
                    ? 'text-gray-900 font-medium' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.premium && !isPremium && (
                  <span className="ml-2 text-xs text-gray-400">Premium</span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900"></span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'fingerprint' && (
                  <VoiceFingerprint 
                    dimensions={MOCK_VOICE_DATA.dimensions}
                    size="md"
                    showBaseline={true}
                    isPremium={isPremium}
                  />
                )}
                
                {activeTab === 'locks' && (
                  <VoiceLocks 
                    isPremium={isPremium}
                    onToggle={(lockId, enabled) => {
                      showToast(`Lock ${lockId} ${enabled ? 'enabled' : 'disabled'}`, 'success')
                    }}
                  />
                )}
                
                {activeTab === 'protection' && (
                  <ProtectionScore 
                    score={MOCK_VOICE_DATA.protectionScore}
                    vulnerabilities={MOCK_VOICE_DATA.vulnerabilities}
                    isPremium={isPremium}
                  />
                )}
                
                {activeTab === 'evolution' && (
                  <VoiceEvolution 
                    isPremium={isPremium}
                  />
                )}
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Domain Switcher */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                    ••
                  </span>
                  {' '}Voice Domains
                </h3>
                <div className="space-y-2">
                  {['General', 'Academic', 'Email', 'Creative'].map((domain) => (
                    <button
                      key={domain}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${
                        domain === 'General' 
                          ? 'bg-gray-900 text-white' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      disabled={!isPremium && domain !== 'General'}
                    >
                      {domain}
                      {!isPremium && domain !== 'General' && (
                        <span className="float-right text-xs opacity-50">Premium</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Tips */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                    ••••
                  </span>
                  {' '}Quick Tips
                </h3>
                <div className="space-y-2 text-xs text-gray-600">
                  <p>• Analyze diverse content types for better coverage</p>
                  <p>• Lock your signature phrases to preserve your voice</p>
                  <p>• Check protection score weekly to prevent cloning</p>
                  <p>• Use domain switching for context-aware analysis</p>
                </div>
              </div>

              {/* Evolution Preview */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                    ••••••
                  </span>
                  {' '}Recent Evolution
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Vocabulary</span>
                    <span className="text-green-600">↑ 5%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Formality</span>
                    <span className="text-gray-500">→ 0%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Clarity</span>
                    <span className="text-green-600">↑ 3%</span>
                  </div>
                </div>
                <button className="mt-3 text-xs text-gray-600 hover:text-gray-900">
                  View Full Timeline →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}