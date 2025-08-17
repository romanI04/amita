'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVoiceProfile, useVoiceProfileSelectors } from '@/lib/context/VoiceProfileContext'
import { useProfileUpdates } from '@/lib/events/VoiceProfileEvents'
import { Button } from '@/components/ui/Button'
import { 
  SubtleBlocks,
  ProcessIndicator,
  LiveMetric,
  TypingFlow,
  StatusLine
} from '@/components/SubtleBlocks'
import { 
  ArrowRightIcon,
  DocumentTextIcon,
  SparklesIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface RecentAnalysis {
  id: string;
  title: string;
  created_at: string;
  ai_confidence_score: number;
  authenticity_score: number;
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: voiceProfileState } = useVoiceProfile()
  const selectors = useVoiceProfileSelectors()
  
  const [showVoiceprintSuccess, setShowVoiceprintSuccess] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [processingMetric, setProcessingMetric] = useState<string | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboardingChecklistDismissed') === 'true'
    }
    return false
  })
  const [statusExpanded, setStatusExpanded] = useState(false)
  
  const recentAnalyses: RecentAnalysis[] = selectors.getRecentSamples().map(sample => ({
    id: sample.id,
    title: sample.title || 'Untitled Analysis',
    created_at: sample.created_at,
    ai_confidence_score: Number(sample.ai_confidence_score) || 0,
    authenticity_score: Number(sample.authenticity_score) || 0
  }))

  useProfileUpdates((data) => {
    if (data.reason === 'add_sample') {
      setProcessingMetric('voice')
      setTimeout(() => setProcessingMetric(null), 3000)
    }
  })

  useEffect(() => {
    if (searchParams.get('voiceprint') === 'created') {
      setShowVoiceprintSuccess(true)
      setProcessingMetric('voice')
      setTimeout(() => {
        setShowVoiceprintSuccess(false)
        setProcessingMetric(null)
      }, 5000)
    }
  }, [searchParams])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value)
    setIsTyping(true)
    
    if (typingTimer) clearTimeout(typingTimer)
    
    const timer = setTimeout(() => {
      setIsTyping(false)
    }, 500)
    setTypingTimer(timer)
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <ProcessIndicator isProcessing={true} label="Loading" />
        </div>
      </AppLayout>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const wordCount = currentText.split(/\s+/).filter(w => w).length
  const charCount = currentText.length
  const totalAnalyses = voiceProfileState.coverage.sampleCount
  const avgAuthenticity = recentAnalyses.length > 0
    ? Math.round(recentAnalyses.reduce((acc, a) => acc + a.authenticity_score, 0) / recentAnalyses.length)
    : 0
  const avgAiScore = recentAnalyses.length > 0
    ? Math.round(recentAnalyses.reduce((acc, a) => acc + a.ai_confidence_score, 0) / recentAnalyses.length)
    : 0
    
  // Calculate checklist progress
  const hasAnalyzedText = totalAnalyses > 0
  const hasAddedSamples = voiceProfileState.coverage.sampleCount >= 3
  const hasReviewedProfile = voiceProfileState.status === 'active'
  const checklistComplete = hasAnalyzedText && hasAddedSamples && hasReviewedProfile
  
  const dismissChecklist = () => {
    setChecklistDismissed(true)
    localStorage.setItem('onboardingChecklistDismissed', 'true')
  }

  const handleAnalyze = () => {
    if (currentText.trim()) {
      sessionStorage.setItem('quickAnalysisText', currentText)
    }
    router.push('/analyze')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        {/* Success Notification - Subtle */}
        {showVoiceprintSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-gray-100 px-6 py-3"
          >
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SubtleBlocks value={100} max={100} color="green" isActive={true} size="xs" />
                <p className="text-sm text-gray-700">
                  Voice profile activated successfully
                </p>
              </div>
              <button
                onClick={() => setShowVoiceprintSuccess(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Content - Responsive container */}
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          {/* Header - Clean */}
          <div className="mb-12">
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-500">
              Analyze and improve your writing with AI detection
            </p>
            <div className="mt-4">
              <span className="font-mono text-xs text-gray-300">
                ••••••••••••••••••••••••••••••••••••••••
              </span>
            </div>
          </div>

          {/* Quick Analysis - Responsive padding */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 mb-8 hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">Quick Analysis</h2>
                <p className="text-sm text-gray-500">Start typing to activate metrics</p>
              </div>
              <TypingFlow isTyping={isTyping} wordCount={wordCount} />
            </div>

            <textarea
              value={currentText}
              onChange={handleTextChange}
              placeholder="Start typing or paste your text here..."
              className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 resize-none transition-all"
            />

            {/* Subtle Metrics Bar */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Characters</span>
                    <SubtleBlocks 
                      value={charCount} 
                      max={500} 
                      color="green"
                      isActive={isTyping}
                      size="xs"
                    />
                    <span className={`text-xs font-medium ${charCount >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                      {charCount}/50
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Words</span>
                    <SubtleBlocks 
                      value={wordCount} 
                      max={100} 
                      color="blue"
                      isActive={isTyping}
                      size="xs"
                    />
                    <span className="text-xs font-medium text-gray-600">{wordCount}</span>
                  </div>
                </div>
                
                <Button
                  onClick={handleAnalyze}
                  disabled={charCount < 50}
                  className="bg-gray-900 hover:bg-black text-white text-sm px-6 py-2 transition-all"
                >
                  Analyze
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* First Success Checklist - Responsive */}
          {!checklistDismissed && !checklistComplete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Getting Started</h3>
                <button
                  onClick={dismissChecklist}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-3">
                <Link href="/analyze" className="block">
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    hasAnalyzedText 
                      ? 'bg-white border border-green-200' 
                      : 'bg-white border border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      hasAnalyzedText
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {hasAnalyzedText && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        hasAnalyzedText ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        Analyze a text
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasAnalyzedText ? 'Completed' : 'Run your first analysis'}
                      </p>
                    </div>
                  </div>
                </Link>
                
                <Link href="/upload" className="block">
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    hasAddedSamples 
                      ? 'bg-white border border-green-200' 
                      : 'bg-white border border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      hasAddedSamples
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {hasAddedSamples && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        hasAddedSamples ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        Add samples to Voice Profile
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasAddedSamples 
                          ? `${voiceProfileState.coverage.sampleCount} samples added` 
                          : `${voiceProfileState.coverage.sampleCount}/3 samples required`}
                      </p>
                    </div>
                  </div>
                </Link>
                
                <Link href="/profile" className="block">
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    hasReviewedProfile 
                      ? 'bg-white border border-green-200' 
                      : 'bg-white border border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      hasReviewedProfile
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {hasReviewedProfile && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        hasReviewedProfile ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        Review your Voice Profile
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasReviewedProfile ? 'Voice profile active' : 'Complete setup to activate'}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}

          {/* Stats Row - Responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* Primary metric with gradient background */}
            <motion.div 
              whileHover={{ y: -2 }}
              onHoverStart={() => setHoveredCard('analyses')}
              onHoverEnd={() => setHoveredCard(null)}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer md:col-span-2 lg:col-span-1"
            >
              <div className="flex flex-col">
                <span className="text-sm text-gray-600 mb-2">Total Analyses</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-light text-gray-900">{totalAnalyses}</span>
                  <SubtleBlocks 
                    value={Math.min(100, totalAnalyses * 10)} 
                    max={100}
                    color="blue"
                    isActive={hoveredCard === 'analyses'}
                    size="xs"
                  />
                </div>
              </div>
            </motion.div>
            
            {/* Secondary metrics grouped */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 col-span-1 md:col-span-2 lg:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onHoverStart={() => setHoveredCard('authenticity')}
                  onHoverEnd={() => setHoveredCard(null)}
                  className=""
                >
                  <LiveMetric 
                    value={avgAuthenticity} 
                    label="Avg Authenticity" 
                    suffix="%"
                    color="green"
                    isActive={hoveredCard === 'authenticity'}
                  />
                </motion.div>
                
                {/* Divider line - hidden on mobile */}
                <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-y-1/2 w-px h-12 bg-gray-200"></div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  onHoverStart={() => setHoveredCard('voice')}
                  onHoverEnd={() => setHoveredCard(null)}
                  className="group"
                >
                  <div className="relative">
                    <LiveMetric 
                      value={voiceProfileState.status === 'active' ? 100 : Math.min(voiceProfileState.coverage.sampleCount * 20, 80)} 
                      label="Voice Profile Quality" 
                      suffix={voiceProfileState.status === 'active' ? ' Active' : ` ${Math.min(voiceProfileState.coverage.sampleCount * 20, 80)}%`}
                      color="violet"
                      isActive={hoveredCard === 'voice' || processingMetric === 'voice'}
                    />
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <button className="text-gray-400 hover:text-gray-600 p-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <div className="absolute right-0 top-6 w-48 p-3 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                          <p className="text-xs text-gray-600">
                            Add more writing samples to improve your voice profile quality. 5+ samples recommended for best results.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Action Cards - Responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            <Link href="/analyze">
              <motion.div 
                whileHover={{ y: -2 }}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Deep Analysis</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Comprehensive AI detection
                </p>
                <ProcessIndicator isProcessing={false} />
              </motion.div>
            </Link>

            <Link href="/upload">
              <motion.div 
                whileHover={{ y: -2 }}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <CloudArrowUpIcon className="h-5 w-5 text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Batch Upload</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Process multiple documents
                </p>
                <ProcessIndicator isProcessing={false} />
              </motion.div>
            </Link>

            <Link href="/profile">
              <motion.div 
                whileHover={{ y: -2 }}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <SparklesIcon className="h-5 w-5 text-gray-400 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Voice Profile</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Train your writing style
                </p>
                <ProcessIndicator isProcessing={processingMetric === 'voice'} />
              </motion.div>
            </Link>
          </div>

          {/* Recent Activity - Clean list with subtle blocks */}
          {recentAnalyses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                <Link href="/history" className="text-sm text-gray-500 hover:text-gray-700">
                  View all
                </Link>
              </div>
              
              <div className="space-y-3">
                {recentAnalyses.slice(0, 3).map((analysis) => (
                  <Link key={analysis.id} href={`/analyze?sample_id=${analysis.id}`}>
                    <motion.div 
                      whileHover={{ x: 2 }}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm mb-1">
                            {analysis.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {getTimeAgo(new Date(analysis.created_at))}
                          </p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Authenticity</div>
                            <div className="flex items-center gap-2">
                              <SubtleBlocks 
                                value={analysis.authenticity_score} 
                                max={100} 
                                color="green"
                                isActive={false}
                                size="xs"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {analysis.authenticity_score}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">AI Score</div>
                            <div className="flex items-center gap-2">
                              <SubtleBlocks 
                                value={analysis.ai_confidence_score} 
                                max={100} 
                                color="red"
                                isActive={false}
                                size="xs"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {analysis.ai_confidence_score}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Footer Status Bar - Collapsed chip */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center">
              <button
                onClick={() => setStatusExpanded(!statusExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-all text-sm"
              >
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-gray-600">System Status: Good</span>
                </span>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    statusExpanded ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {statusExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <StatusLine 
                  items={[
                    { label: 'System', active: true, color: 'green' },
                    { label: 'API', active: true, color: 'blue' },
                    { label: 'Models', active: true, color: 'blue' },
                    { label: 'Voice', active: voiceProfileState.status === 'active', color: 'violet' },
                    { label: 'Accuracy', active: avgAuthenticity > 70, color: 'green' }
                  ]}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}