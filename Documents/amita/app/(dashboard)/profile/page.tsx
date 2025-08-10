'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
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
  const [profileData, setProfileData] = useState<VoiceProfileData>({
    voiceprint: null,
    traits: null,
    sampleCount: 0,
    totalWords: 0,
    recentSamples: [],
    averageAuthenticity: 0,
    averageAIRisk: 0,
    voiceDrift: 'stable',
    coverage: 'low'
  })
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isCreatingVoiceprint, setIsCreatingVoiceprint] = useState(false)
  const [voiceLocks, setVoiceLocks] = useState<VoiceLock[]>(INITIAL_VOICE_LOCKS)
  const [activeTab, setActiveTab] = useState('General')
  const [showProofPanel, setShowProofPanel] = useState(false)
  const [selectedProof, setSelectedProof] = useState<string | null>(null)

  // Load voice profile data
  useEffect(() => {
    if (!user || loading) return

    const loadVoiceProfile = async () => {
      try {
        const supabase = createClient()
        console.log('Loading voice profile for user:', user.id)

        // Get user's voiceprint (get the most recent active one)
        const { data: voiceprintList, error: voiceprintError } = await supabase
          .from('voiceprints')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)

        const voiceprint = voiceprintList?.[0] || null

        console.log('Voiceprint query result:', { voiceprint, voiceprintError })

        if (voiceprintError) {
          console.error('Error loading voiceprint:', voiceprintError)
        }

        let traits = null
        if (voiceprint) {
          // Get voice traits
          const { data: voiceprintTraits } = await supabase
            .from('voiceprint_traits')
            .select('*')
            .eq('voiceprint_id', voiceprint.id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle()

          traits = voiceprintTraits
        }

        // Get writing samples
        const { data: samples, error: samplesError } = await supabase
          .from('writing_samples')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (samplesError) {
          console.error('Error loading samples:', samplesError)
        }

        const sampleCount = samples?.length || 0
        const recentSamples = samples?.slice(0, 5) || []
        const totalWords = samples?.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0) || 0

        // Calculate averages
        let averageAuthenticity = 0
        let averageAIRisk = 0
        if (samples && samples.length > 0) {
          const totalAuth = samples.reduce((sum, s) => sum + (Number(s.authenticity_score) || 0), 0)
          const totalAI = samples.reduce((sum, s) => sum + (Number(s.ai_confidence_score) || 0), 0)
          averageAuthenticity = totalAuth / samples.length
          averageAIRisk = totalAI / samples.length
        }

        // Determine coverage
        let coverage: 'low' | 'medium' | 'high' = 'low'
        if (totalWords >= 3000 && sampleCount >= 5) coverage = 'high'
        else if (totalWords >= 1000 && sampleCount >= 3) coverage = 'medium'

        // Mock voice drift calculation
        const voiceDrift = averageAIRisk > 30 ? 'major' : averageAIRisk > 15 ? 'slight' : 'stable'

        setProfileData({
          voiceprint,
          traits,
          sampleCount,
          totalWords,
          recentSamples,
          averageAuthenticity,
          averageAIRisk,
          voiceDrift,
          coverage
        })
      } catch (error) {
        console.error('Error loading voice profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadVoiceProfile()
  }, [user, loading])

  const toggleVoiceLock = (lockId: string) => {
    setVoiceLocks(prev => prev.map(lock => 
      lock.id === lockId ? { ...lock, enabled: !lock.enabled } : lock
    ))
  }

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

  const getRiskDrivers = (): RiskDriver[] => [
    { name: 'Structure', level: 'medium', description: 'Repetitive sentence patterns', actionText: 'Reduce safely' },
    { name: 'Repetition', level: 'low', description: 'Word choice variety', actionText: 'Reduce safely' },
    { name: 'Perplexity', level: 'high', description: 'Predictable phrasing', actionText: 'Reduce safely' },
    { name: 'Error scarcity', level: 'medium', description: 'Too perfect grammar', actionText: 'Reduce safely' },
  ]

  const getSignatureTraits = () => {
    if (!profileData.traits?.trait_summary?.signature_traits) {
      return [
        { name: 'Favorite verbs', examples: ['leverage', 'integrate', 'optimize'] },
        { name: 'Idioms', examples: ['in the long run', 'at the end of the day'] },
        { name: 'Cadence', examples: ['16.2 avg words/sentence', '±4.3 variance'] },
        { name: 'Hedge phrases', examples: ['I think', 'perhaps', 'might be'] },
        { name: 'Punctuation', examples: ['em-dash heavy', 'serial comma'] },
      ]
    }
    
    return profileData.traits.trait_summary.signature_traits.slice(0, 5).map(trait => ({
      name: trait.name,
      examples: ['analyzing...'] // In real implementation, extract from content
    }))
  }

  const showProofExamples = (traitName: string) => {
    setSelectedProof(traitName)
    setShowProofPanel(true)
  }

  if (loading || isLoadingProfile) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your voice profile...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="flex-1 bg-gray-50">
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
                  
                  <div className="flex items-center">
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
                          onClick={() => toggleVoiceLock(lock.id)}
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
                  
                  {/* Mock sparkline */}
                  <div className="h-12 bg-gray-100 rounded-lg mb-3 flex items-end px-2 py-2">
                    <div className="flex-1 flex items-end space-x-1">
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-blue-500 rounded-sm opacity-70"
                          style={{ height: `${20 + Math.random() * 20}px` }}
                        />
                      ))}
                    </div>
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
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Too casual in professional contexts</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Your openings and closings lean informal for business settings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Clarity +2
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Risk −3%
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm">Apply</Button>
                    <Button size="sm" variant="outline">Explain</Button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Repetitive contrast pattern</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Overusing "sometimes" in dual comparisons
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Variety +3
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Risk −2%
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm">Apply</Button>
                    <Button size="sm" variant="outline">Explain</Button>
                  </div>
                </div>
              </div>
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
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">Example from "Marketing Brief"</p>
                  <p className="text-sm text-blue-800">
                    "We need to <mark className="bg-blue-200">leverage</mark> our existing customer base to <mark className="bg-blue-200">optimize</mark> conversion rates..."
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">Example from "Project Update"</p>
                  <p className="text-sm text-blue-800">
                    "The team will <mark className="bg-blue-200">integrate</mark> these changes to <mark className="bg-blue-200">leverage</mark> better outcomes..."
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium mb-2">Pattern Analysis</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• "leverage" appears 12 times (top 5% usage)</li>
                    <li>• "optimize" appears 8 times (top 10% usage)</li>
                    <li>• Often paired with business contexts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}