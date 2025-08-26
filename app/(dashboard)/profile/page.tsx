'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { useVoiceProfile } from '@/lib/context/VoiceProfileContext'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { VoiceFingerprint, VoiceLocks, ProtectionScore, VoiceEvolution } from '@/components/voice'
import { TrendsChart, BeforeAfterCard, PatternInsights } from '@/components/history'
// Voice DNA components removed - ML system replacing this functionality
import AppLayout from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import type { Voiceprint, VoiceprintTraits, WritingSample } from '@/types'

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { state: voiceProfileState, refreshProfile } = useVoiceProfile()
  const { showToast } = useToast()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'fingerprint' | 'locks' | 'protection' | 'evolution' | 'dna'>('overview')
  const [analyses, setAnalyses] = useState<WritingSample[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(true)
  
  // Get isPremium from user profile
  const isPremium = profile?.is_premium || false
  
  // Fetch recent analyses for the overview
  useEffect(() => {
    if (!user) return
    
    const fetchAnalyses = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('writing_samples')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (error) throw error
        setAnalyses(data || [])
      } catch (err) {
        console.error('Error fetching analyses:', err)
      } finally {
        setLoadingAnalyses(false)
      }
    }
    
    fetchAnalyses()
  }, [user])
  
  // Calculate profile metrics
  const profileMetrics = useMemo(() => {
    // Use writing samples from analyses for metrics when no voiceprint exists
    const samples = analyses || []
    const totalWords = samples.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0)
    const avgAuthenticity = samples.length > 0 
      ? samples.reduce((sum, s) => sum + (s.authenticity_score || 0), 0) / samples.length 
      : 0
    const avgAIRisk = samples.length > 0
      ? samples.reduce((sum, s) => sum + (s.ai_confidence_score || 0), 0) / samples.length
      : 0
    
    return {
      sampleCount: samples.length,
      totalWords,
      avgAuthenticity,
      avgAIRisk,
      lastUpdated: voiceProfileState.voiceprint?.updated_at || null
    }
  }, [analyses, voiceProfileState.voiceprint])
  
  // Compute voice dimensions from real traits
  const voiceDimensions = useMemo(() => {
    const traits = voiceProfileState.traits
    if (!traits?.lexicalSignature) {
      // Return default dimensions if no traits yet
      return [
        { name: 'Vocabulary', value: 50, baseline: 50, description: 'Word choice sophistication' },
        { name: 'Flow', value: 50, baseline: 50, description: 'Rhythm and pacing' },
        { name: 'Formality', value: 50, baseline: 50, description: 'Professional vs casual' },
        { name: 'Emotion', value: 50, baseline: 50, description: 'Emotional expression' },
        { name: 'Clarity', value: 50, baseline: 50, description: 'Clear communication' },
        { name: 'Originality', value: 50, baseline: 50, description: 'Unique expression' },
        { name: 'Consistency', value: 50, baseline: 50, description: 'Style consistency' },
        { name: 'Authenticity', value: 50, baseline: 50, description: 'Human-like quality' }
      ]
    }
    
    // Map voice traits to dimensions (normalized to 0-100 scale)
    return [
      { 
        name: 'Vocabulary', 
        value: Math.round(traits.lexicalSignature.vocabularyRichness * 100), 
        baseline: 70, 
        description: 'Word choice sophistication' 
      },
      { 
        name: 'Flow', 
        value: Math.round(traits.syntacticSignature.paragraphRhythm.avgParagraphLength), 
        baseline: 65, 
        description: 'Rhythm and pacing' 
      },
      { 
        name: 'Formality', 
        value: Math.round(traits.semanticSignature.formalityLevel * 100), 
        baseline: 50, 
        description: 'Professional vs casual' 
      },
      { 
        name: 'Emotion', 
        value: Math.round(traits.stylisticSignature.voiceCharacteristics.personalPronounUsage * 100), 
        baseline: 75, 
        description: 'Emotional expression' 
      },
      { 
        name: 'Clarity', 
        value: Math.round(traits.syntacticSignature.sentenceComplexity * 100), 
        baseline: 80, 
        description: 'Clear communication' 
      },
      { 
        name: 'Originality', 
        value: Math.round(traits.lexicalSignature.vocabularyRichness * 100), 
        baseline: 60, 
        description: 'Unique expression' 
      },
      { 
        name: 'Consistency', 
        value: Math.round(traits.consistency * 100), 
        baseline: 70, 
        description: 'Style consistency' 
      },
      { 
        name: 'Authenticity', 
        value: Math.round(profileMetrics.avgAuthenticity), 
        baseline: 85, 
        description: 'Human-like quality' 
      }
    ]
  }, [voiceProfileState.traits, profileMetrics.avgAuthenticity])
  
  // Compute vulnerabilities from real traits
  const vulnerabilities = useMemo(() => {
    // For now, return empty array since trait_summary doesn't exist in VoiceprintTraits
    // This would need to be computed from actual trait analysis
    return []
  }, [])
  
  if (loading) {
    return (
      <ErrorBoundary>
        <AppLayout>
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse">
                <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-2xl text-gray-400">
                  ••••••••
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Loading profile...</p>
            </div>
          </div>
        </AppLayout>
      </ErrorBoundary>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }
  
  // Show computing status if voiceprint is being processed
  if (voiceProfileState.voiceprint?.status === 'computing') {
    return (
      <ErrorBoundary>
        <AppLayout>
          <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto py-16 px-6">
              <div className="text-center">
                <div className="animate-pulse">
                  <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-6xl text-gray-400">
                    ••••••••
                  </span>
                </div>
                <h1 className="text-3xl font-light text-gray-900 mt-6 mb-2">
                  Creating Your Voice Profile
                </h1>
                <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
                  We&apos;re analyzing your writing samples to build your unique voice fingerprint. This usually takes a few seconds.
                </p>
                <Button 
                  onClick={() => refreshProfile()}
                  className="px-8"
                >
                  Check Status
                </Button>
              </div>
            </div>
          </div>
        </AppLayout>
      </ErrorBoundary>
    )
  }
  
  // No voice profile yet
  if (!voiceProfileState.voiceprint || voiceProfileState.voiceprint?.status === 'failed') {
    return (
      <ErrorBoundary>
        <AppLayout>
          <div className="min-h-screen bg-white">
            <div className="max-w-4xl mx-auto py-16 px-6">
              <div className="text-center">
                <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-6xl text-gray-300">
                  ○○○○○
                </span>
                <h1 className="text-3xl font-light text-gray-900 mt-6 mb-2">
                  Create Your Voice Profile
                </h1>
                <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
                  Build a fingerprint of your authentic writing style to preserve your voice while reducing AI detection.
                </p>
                
                {profileMetrics.sampleCount >= 3 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Available Samples</p>
                        <p className="text-2xl font-light text-gray-900">{profileMetrics.sampleCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Words</p>
                        <p className="text-2xl font-light text-gray-900">{profileMetrics.totalWords.toLocaleString()}</p>
                      </div>
                    </div>
                    <p className="text-sm text-green-600">
                      ✓ Ready to create your voice profile
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-6">
                    <p className="text-sm text-orange-800">
                      You need at least 3 analyzed texts to create a voice profile.
                      Currently have {profileMetrics.sampleCount} sample{profileMetrics.sampleCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                )}
                
                <div className="flex gap-4 justify-center">
                  {profileMetrics.sampleCount >= 3 ? (
                    <Button 
                      onClick={() => router.push('/onboarding/voiceprint')}
                      className="px-8"
                    >
                      Create Voice Profile →
                    </Button>
                  ) : (
                    <Link href="/analyze">
                      <Button className="px-8">
                        Analyze Text First →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AppLayout>
      </ErrorBoundary>
    )
  }
  
  // Voice profile exists - show dashboard
  const tabs = [
    { id: 'overview', label: 'Overview', premium: false },
    { id: 'dna', label: 'Voice DNA (ML)', premium: false },
    { id: 'fingerprint', label: 'Voice Fingerprint', premium: false },
    { id: 'locks', label: 'Smart Locks', premium: true },
    { id: 'protection', label: 'Protection Score', premium: true },
    { id: 'evolution', label: 'Evolution', premium: false }
  ]
  
  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="min-h-screen bg-white">
          <div className="max-w-6xl mx-auto px-6 py-12">
            {/* Header */}
            <div className="mb-8">
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
            
            {/* Stats Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              <div className="grid grid-cols-5 gap-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="text-xl font-light">
                    <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-green-600">
                      ••• Active
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Samples</p>
                  <p className="text-2xl font-light text-gray-900">{profileMetrics.sampleCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Words Analyzed</p>
                  <p className="text-2xl font-light text-gray-900">{profileMetrics.totalWords.toLocaleString()}</p>
                </div>
                <div className="group relative">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-500 mb-1">Authenticity</p>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-2xl font-light text-gray-900">{Math.round(profileMetrics.avgAuthenticity)}%</p>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                    How human and original your writing appears, based on vocabulary, flow, and style patterns
                  </div>
                </div>
                <div className="group relative">
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-gray-500 mb-1">AI Risk</p>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-2xl font-light text-orange-600">{Math.round(profileMetrics.avgAIRisk)}%</p>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                    Likelihood that AI detection tools will flag your content as AI-generated
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/analyze">
                    <button className="text-sm text-gray-600 hover:text-gray-900">
                      Add More Samples →
                    </button>
                  </Link>
                  <Link href="/voice">
                    <button className="text-sm text-gray-600 hover:text-gray-900">
                      Advanced View →
                    </button>
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  <Link href="/analyze">
                    <button className="px-6 py-2 bg-gray-900 text-white text-sm rounded hover:bg-black transition-colors">
                      Train Voice (Add Samples)
                    </button>
                  </Link>
                  {!isPremium && (
                    <button 
                      onClick={() => showToast('Premium features coming soon!', 'info')}
                      className="px-4 py-2 border border-gray-900 text-gray-900 text-xs rounded hover:bg-gray-50 transition-colors"
                    >
                      Upgrade to Premium
                    </button>
                  )}
                </div>
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
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <TrendsChart 
                      data={analyses.map((a) => ({
                        date: a.created_at || new Date().toISOString(),
                        aiScore: Number(a.ai_confidence_score) || 0,
                        authenticityScore: Number(a.authenticity_score) || 0
                      }))}
                      period="week"
                    />
                  </div>
                  <div>
                    <PatternInsights patterns={[]} isPremium={isPremium} />
                  </div>
                </div>
              )}
              
              {activeTab === 'fingerprint' && (
                <div className="max-w-3xl mx-auto">
                  <VoiceFingerprint 
                    dimensions={voiceDimensions}
                    size="lg"
                    showBaseline={true}
                    isPremium={isPremium}
                  />
                </div>
              )}
              
              {activeTab === 'locks' && (
                <div className="max-w-3xl mx-auto">
                  <VoiceLocks 
                    isPremium={isPremium}
                    onToggle={(lockId, enabled) => {
                      showToast(`Lock ${lockId} ${enabled ? 'enabled' : 'disabled'}`, 'success')
                    }}
                  />
                </div>
              )}
              
              {activeTab === 'protection' && (
                <div className="max-w-3xl mx-auto">
                  <ProtectionScore 
                    score={Math.round(100 - profileMetrics.avgAIRisk)}
                    vulnerabilities={vulnerabilities}
                    isPremium={isPremium}
                  />
                </div>
              )}
              
              {activeTab === 'evolution' && (
                <div className="max-w-4xl mx-auto">
                  <VoiceEvolution isPremium={isPremium} />
                </div>
              )}
              
              {activeTab === 'dna' && (
                <div className="max-w-6xl mx-auto">
                  {/* ML visualization will be integrated here */}
                </div>
              )}
            </motion.div>
            
            {/* Recent Analyses */}
            {activeTab === 'overview' && analyses.length > 0 && (
              <div className="mt-12">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                    ••
                  </span>
                  {' '}Recent Analyses
                </h3>
                <div className="space-y-4">
                  {analyses.slice(0, 3).map((analysis) => (
                    <BeforeAfterCard
                      key={analysis.id}
                      id={analysis.id}
                      title={analysis.title || 'Untitled'}
                      date={analysis.created_at || new Date().toISOString()}
                      originalText={analysis.content?.substring(0, 100) + '...' || ''}
                      improvedText={analysis.content?.substring(0, 100) + '...' || ''}
                      aiReduction={Number(analysis.ai_confidence_score) || 0}
                      authenticityIncrease={Number(analysis.authenticity_score) || 0}
                      changesApplied={0}
                    />
                  ))}
                </div>
                <Link href="/dashboard">
                  <button className="mt-4 text-sm text-gray-600 hover:text-gray-900">
                    View all analyses →
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ErrorBoundary>
  )
}