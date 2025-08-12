'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { useVoiceProfile, useVoiceProfileSelectors } from '@/lib/context/VoiceProfileContext'
import { useConstraintChanges, useSampleEvents } from '@/lib/events/VoiceProfileEvents'
import { useVoiceProfileAnalytics } from '@/lib/hooks/useAnalytics'
import { Button } from '@/components/ui/Button'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyStates } from '@/components/ui/EmptyState'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  UserCircleIcon, 
  ChartBarIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  LockOpenIcon,
  EyeIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Voiceprint, VoiceprintTraits, WritingSample } from '@/types'

interface VoiceProfileData {
  voiceprint: Voiceprint | null;
  traits: VoiceprintTraits | null;
  sampleCount: number;
  totalWords: number;
  recentSamples: WritingSample[];
  averageAuthenticity: number;
  averageAIRisk: number;
  voiceDrift: 'stable' | 'slight' | 'major';
  coverage: 'low' | 'medium' | 'high';
}

interface VoiceLock {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface RiskDriver {
  name: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  actionText: string;
}

const INITIAL_VOICE_LOCKS: VoiceLock[] = [
  { id: 'sentence_length', name: 'Sentence length ±10%', description: 'Maintain your natural sentence rhythm', enabled: true },
  { id: 'idioms', name: 'Keep idioms/slang', description: 'Preserve your unique expressions', enabled: true },
  { id: 'hedge_frequency', name: 'Hedge frequency stable', description: 'Keep your level of uncertainty words', enabled: false },
  { id: 'punctuation', name: 'Punctuation style', description: 'Maintain your punctuation patterns', enabled: true },
]

const DOMAIN_TABS = ['General', 'Academic', 'Email', 'Creative']

export default function ProfilePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const { state: voiceProfileState, toggleLock, switchDomain } = useVoiceProfile()
  const selectors = useVoiceProfileSelectors()
  const profileAnalytics = useVoiceProfileAnalytics()
  
  const [isCreatingVoiceprint, setIsCreatingVoiceprint] = useState(false)
  const [showProofPanel, setShowProofPanel] = useState(false)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)
  const [constraintUpdateNotification, setConstraintUpdateNotification] = useState<string | null>(null)
  
  // Memoize profile data to prevent unnecessary re-renders
  const profileData = useMemo(() => ({
    voiceprint: voiceProfileState.voiceprint,
    traits: voiceProfileState.traits,
    sampleCount: voiceProfileState.coverage.sampleCount,
    totalWords: voiceProfileState.coverage.wordCount,
    recentSamples: selectors.getRecentSamples(),
    averageAuthenticity: voiceProfileState.averageIntegrity,
    averageAIRisk: voiceProfileState.averageRisk,
    voiceDrift: voiceProfileState.voiceDrift,
    coverage: voiceProfileState.coverage.confidence
  }), [
    voiceProfileState.voiceprint,
    voiceProfileState.traits,
    voiceProfileState.coverage,
    voiceProfileState.averageIntegrity,
    voiceProfileState.averageRisk,
    voiceProfileState.voiceDrift,
    selectors
  ])
  
  const isLoadingProfile = voiceProfileState.isLoading

  // Voice profile data is now loaded via the VoiceProfileProvider
  // No need for manual loading here anymore

  // Listen for constraint changes to show real-time feedback
  useConstraintChanges((data) => {
    if (data.reason === 'lock_change') {
      setConstraintUpdateNotification('Rewrites now respect your updated locks.')
      setTimeout(() => setConstraintUpdateNotification(null), 4000)
    } else if (data.reason === 'domain_change') {
      setConstraintUpdateNotification(`Switched to ${data.domain} domain. Analysis adapted.`)
      setTimeout(() => setConstraintUpdateNotification(null), 4000)
    }
  })

  // Listen for sample events to show coverage updates
  useSampleEvents((eventType, data) => {
    if (eventType === 'sample.created') {
      setConstraintUpdateNotification(`New sample added (+${data.wordCount} words). Profile strengthening.`)
      setTimeout(() => setConstraintUpdateNotification(null), 4000)
    } else if (eventType === 'sample.analyzed') {
      const integrity = data.analysis?.integrityScore || 0
      const risk = data.analysis?.riskScore || 0
      setConstraintUpdateNotification(`Analysis complete: ${Math.round(integrity)} integrity, ${Math.round(risk)}% risk. Profile updated.`)
      setTimeout(() => setConstraintUpdateNotification(null), 5000)
    } else if (eventType === 'sample.updated' && data.reason === 'voice_aware_rewrite') {
      const { rewritesApplied, riskReduction } = data.updates
      setConstraintUpdateNotification(`Voice-aware rewrite applied: ${rewritesApplied} sections improved, ${riskReduction}% risk reduced.`)
      setTimeout(() => setConstraintUpdateNotification(null), 5000)
    }
  })

  const handleToggleLock = (lockId: string) => {
    // Map UI lock IDs to shared state lock types
    const lockMapping = {
      'sentence_length': 'sentenceLength',
      'idioms': 'keepIdioms', 
      'hedge_frequency': 'hedgeFrequency',
      'punctuation': 'punctuationStyle'
    }
    
    const lockType = lockMapping[lockId as keyof typeof lockMapping] as keyof typeof voiceProfileState.locks
    if (lockType) {
      const currentValue = voiceProfileState.locks[lockType]
      const newValue = typeof currentValue === 'object' ? !currentValue.enabled : !currentValue
      
      // Track lock toggle analytics
      profileAnalytics.trackLockToggled(lockId, newValue, voiceProfileState.voiceprint?.id)
      
      toggleLock(lockType)
    }
  }

  // Convert shared state locks to UI format
  const voiceLocks = [
    { 
      id: 'sentence_length', 
      name: 'Sentence length ±10%', 
      description: 'Maintain your natural sentence rhythm', 
      enabled: voiceProfileState.locks.sentenceLength.enabled 
    },
    { 
      id: 'idioms', 
      name: 'Keep idioms/slang', 
      description: 'Preserve your unique expressions', 
      enabled: voiceProfileState.locks.keepIdioms 
    },
    { 
      id: 'hedge_frequency', 
      name: 'Hedge frequency stable', 
      description: 'Keep your level of uncertainty words', 
      enabled: voiceProfileState.locks.hedgeFrequency 
    },
    { 
      id: 'punctuation', 
      name: 'Punctuation style', 
      description: 'Maintain your punctuation patterns', 
      enabled: voiceProfileState.locks.punctuationStyle 
    },
  ]

  const getIntegrityColor = (score: number) => {
    if (score >= 85) return 'text-green-700'
    if (score >= 70) return 'text-amber-700'
    return 'text-red-700'
  }

  const getRiskColor = (risk: number) => {
    if (risk <= 15) return 'text-green-700 bg-green-50'
    if (risk <= 30) return 'text-amber-700 bg-amber-50'
    return 'text-red-700 bg-red-50'
  }

  const getCoverageColor = (coverage: string) => {
    if (coverage === 'high') return 'text-green-700'
    if (coverage === 'medium') return 'text-amber-700'
    return 'text-red-700'
  }

  const getRiskDrivers = (): RiskDriver[] => {
    // Use real risk drivers from voice profile state
    const { riskDrivers } = voiceProfileState
    return [
      { 
        name: 'Structure', 
        level: riskDrivers.structure.level, 
        description: 'Sentence pattern analysis', 
        actionText: 'Optimize structure' 
      },
      { 
        name: 'Repetition', 
        level: riskDrivers.repetition.level, 
        description: 'Word choice variety', 
        actionText: 'Increase variety' 
      },
      { 
        name: 'Perplexity', 
        level: riskDrivers.perplexity.level, 
        description: 'Predictability analysis', 
        actionText: 'Reduce predictability' 
      },
      { 
        name: 'Error scarcity', 
        level: riskDrivers.errorScarcity.level, 
        description: 'Natural imperfection', 
        actionText: 'Add naturalness' 
      },
    ]
  }

  const getSignatureTraits = () => {
    if (!profileData.traits?.trait_summary?.signature_traits) {
      return [] // No synthetic data - show empty state
    }
    
    return profileData.traits.trait_summary.signature_traits.slice(0, 5).map(trait => ({
      name: trait.name,
      description: trait.description,
      strength: trait.strength
    }))
  }

  const showProofExamples = (traitName: string) => {
    setSelectedProof(traitName)
    setShowProofPanel(true)
  }

  // Enhanced loading state with skeleton
  if (loading || isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-7xl mx-auto py-8 px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
              <div className="lg:col-span-8 space-y-6">
                <SkeletonLoader variant="profile" />
                <SkeletonLoader variant="profile" />
              </div>
              <div className="lg:col-span-4 space-y-6">
                <SkeletonLoader variant="card" />
                <SkeletonLoader variant="card" />
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Error state handling
  if (voiceProfileState.error && !voiceProfileState.isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 bg-gray-50">
          <div className="max-w-4xl mx-auto py-12 px-6">
            <EmptyStates.LoadingFailed 
              title="Failed to load voice profile"
              description={voiceProfileState.error}
              onAction={() => window.location.reload()}
            />
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex-1 bg-gray-50">
        {/* Real-time Constraint Update Notification */}
        {constraintUpdateNotification && (
          <div className="bg-purple-50 border-b border-purple-200 px-6 py-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-purple-800 font-medium">
                {constraintUpdateNotification}
              </p>
              <button
                onClick={() => setConstraintUpdateNotification(null)}
                className="text-purple-600 hover:text-purple-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {!profileData.voiceprint ? (
          // No voice profile - creation flow
          <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="text-center mb-8">
              <UserCircleIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Create Your Voice Profile</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Build a fingerprint of your authentic writing style to preserve your voice while reducing detector risk.
              </p>
            </div>

            {profileData.sampleCount >= 3 ? (
              <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to create your profile</h3>
                  <p className="text-gray-600">
                    {profileData.sampleCount} samples ({profileData.totalWords.toLocaleString()} words) ready for analysis
                  </p>
                </div>
                
                <Button 
                  onClick={() => {/* Create profile logic */}}
                  disabled={isCreatingVoiceprint}
                  className="w-full"
                >
                  {isCreatingVoiceprint ? 'Creating Profile...' : 'Create Voice Profile'}
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-amber-500 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Need more samples</h3>
                  <p className="text-gray-600">
                    Add {3 - profileData.sampleCount} more writing samples to create your voice profile
                  </p>
                </div>
                
                <Link href="/analyze">
                  <Button className="w-full">Analyze Your Writing</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          // Voice profile exists - main dashboard
          <div className="max-w-7xl mx-auto py-8 px-6">
            {/* 1. Overview Band */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl font-semibold text-gray-900">Voice Integrity</span>
                    <span className={`text-3xl font-bold ${getIntegrityColor(profileData.averageAuthenticity)}`}>
                      {Math.round(profileData.averageAuthenticity)}
                    </span>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <InformationCircleIcon className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Voice Profile Status Chip */}
                    {profileData.voiceprint && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${
                        profileData.voiceprint.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : profileData.voiceprint.status === 'computing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {profileData.voiceprint.status === 'active' && <CheckCircleIcon className="h-4 w-4" />}
                        {profileData.voiceprint.status === 'computing' && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                        )}
                        {profileData.voiceprint.status === 'failed' && <ExclamationTriangleIcon className="h-4 w-4" />}
                        {profileData.voiceprint.status === 'active' ? 'Active' : 
                         profileData.voiceprint.status === 'computing' ? 'Computing...' : 'Failed'}
                      </span>
                    )}
                    
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(profileData.averageAIRisk)}`}>
                      AI-Risk {Math.round(profileData.averageAIRisk)}%
                    </span>
                  </div>
                </div>

                <Link href="/analyze">
                  <Button variant="outline">Add samples</Button>
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Profile Coverage: {(profileData.totalWords / 1000).toFixed(1)}k words · {profileData.sampleCount} samples</span>
                  <span className={`font-medium ${getCoverageColor(profileData.coverage)}`}>
                    Confidence: {profileData.coverage.charAt(0).toUpperCase() + profileData.coverage.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">More diverse samples → stronger fingerprint</p>
              </div>

              {profileData.coverage === 'low' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Low coverage detected.</strong> Add more samples across different topics to increase fingerprint confidence.
                  </p>
                </div>
              )}
              
              {profileData.voiceprint?.status === 'computing' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Voice profile is being computed.</strong> This may take a few moments. Your analysis features will be available once complete.
                  </p>
                </div>
              )}
              
              {profileData.voiceprint?.status === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <strong>Voice profile computation failed.</strong> Please try creating a new voice profile or contact support if the issue persists.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
              {/* 2. Voice Locks & Proof (Left 8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                {/* Voice Locks */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Locks</h3>
                  <p className="text-sm text-gray-600 mb-4">Locked traits are preserved in rewrites</p>
                  
                  <div className="space-y-3">
                    {voiceLocks.map(lock => (
                      <div key={lock.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-3">
                          {lock.enabled ? (
                            <LockClosedIcon className="h-5 w-5 text-green-600" />
                          ) : (
                            <LockOpenIcon className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{lock.name}</p>
                            <p className="text-sm text-gray-600">{lock.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleLock(lock.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            lock.enabled ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              lock.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature Proof */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Signature Proof</h3>
                  
                  {getSignatureTraits().length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {getSignatureTraits().map((trait, index) => (
                          <button
                            key={index}
                            onClick={() => showProofExamples(trait.name)}
                            className="inline-flex items-center px-3 py-2 rounded-lg bg-blue-50 text-blue-800 text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            {trait.name}
                            <EyeIcon className="ml-2 h-4 w-4" />
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => setShowProofPanel(true)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        See examples →
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-2">No signature traits available yet</p>
                      <p className="text-sm text-gray-400">Add more writing samples to identify your unique patterns</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Risk & Drift (Right 4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                {/* Risk Drivers */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Drivers</h3>
                  
                  <div className="space-y-3">
                    {getRiskDrivers().map((driver, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-gray-900">{driver.name}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              driver.level === 'high' ? 'bg-red-100 text-red-800' :
                              driver.level === 'medium' ? 'bg-amber-100 text-amber-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {driver.level}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{driver.description}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          {driver.actionText}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice Drift */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Drift (30 days)</h3>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      profileData.voiceDrift === 'stable' ? 'bg-green-100 text-green-800' :
                      profileData.voiceDrift === 'slight' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {profileData.voiceDrift === 'stable' ? 'Stable' :
                       profileData.voiceDrift === 'slight' ? 'Slight drift' : 'Major drift'}
                    </span>
                  </div>
                  
                  {/* Voice Drift Chart - Real data needed */}
                  <div className="h-12 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    <p className="text-sm text-gray-500">Chart not available yet</p>
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {profileData.voiceDrift === 'stable' ? 'Consistent voice patterns' :
                     profileData.voiceDrift === 'slight' ? 'Minor formality changes' :
                     'Significant topic/style shift detected'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Domain Tabs */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  {DOMAIN_TABS.map(tab => (
                    <button
                      key={tab}
                      onClick={() => {
                        const previousDomain = voiceProfileState.domains.active
                        profileAnalytics.trackDomainSwitch(previousDomain, tab, voiceProfileState.voiceprint?.id)
                        switchDomain(tab)
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        voiceProfileState.domains.active === tab
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <Button size="sm" variant="outline">Set default domain</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Math.round(profileData.averageAuthenticity)}
                  </div>
                  <div className="text-sm text-gray-600">Voice Integrity</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Math.round(profileData.averageAIRisk)}%
                  </div>
                  <div className="text-sm text-gray-600">AI-Risk</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {profileData.sampleCount}
                  </div>
                  <div className="text-sm text-gray-600">Samples</div>
                </div>
              </div>
            </div>

            {/* 5. Areas to Improve */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Areas to Improve</h3>
              
              {profileData.traits?.trait_summary?.pitfalls?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profileData.traits.trait_summary.pitfalls.slice(0, 4).map((pitfall, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{pitfall.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {pitfall.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          pitfall.severity === 'high' ? 'bg-red-100 text-red-800' :
                          pitfall.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {pitfall.severity} severity
                        </span>
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          {pitfall.category}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm">Apply Fix</Button>
                        <Button size="sm" variant="outline">Explain</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No improvement suggestions available yet</p>
                  <p className="text-sm text-gray-400">Analyze more writing samples to receive personalized coaching</p>
                </div>
              )}
            </div>

            {/* 6. Recent Samples */}
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Samples</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Integrity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Risk</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Drift</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {profileData.recentSamples.map(sample => (
                      <tr key={sample.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{sample.title || 'Untitled'}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {new Date(sample.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-medium ${getIntegrityColor(Number(sample.authenticity_score))}`}>
                            {Math.round(Number(sample.authenticity_score) || 0)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(Number(sample.ai_confidence_score))}`}>
                            {Math.round(Number(sample.ai_confidence_score) || 0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-green-600 text-sm">Stable</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">Details</Button>
                            <Button size="sm" variant="outline">
                              <DocumentIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. Privacy & Control */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Control</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 mb-2">One-click trust</p>
                  <p className="text-sm text-gray-500">
                    Samples are encrypted and never used to train models
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Button variant="outline" size="sm">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export fingerprint
                  </Button>
                  <Button variant="outline" size="sm">
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete samples
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Proof Examples Side Panel */}
        {showProofPanel && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedProof || 'Signature Proof'}
                </h3>
                <button
                  onClick={() => setShowProofPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                {(() => {
                  const selectedTrait = profileData.traits?.trait_summary?.signature_traits?.find(
                    trait => trait.name === selectedProof
                  )
                  
                  if (!selectedTrait) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-2">No trait details available yet</p>
                        <p className="text-sm text-gray-400">This trait will have more details once analyzed</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900 font-medium mb-2">Trait Analysis</p>
                      <div className="text-sm text-blue-800 space-y-2">
                        <p><strong>Description:</strong> {selectedTrait.description}</p>
                        <p><strong>Category:</strong> {selectedTrait.category}</p>
                        <p><strong>Strength:</strong> {Math.round(selectedTrait.strength * 100)}%</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
        </div>
      </AppLayout>
    </ErrorBoundary>
  )
}