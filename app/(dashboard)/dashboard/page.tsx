'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVoiceProfile, useVoiceProfileSelectors } from '@/lib/context/VoiceProfileContext'
import { useProfileUpdates } from '@/lib/events/VoiceProfileEvents'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
// Voice DNA components removed - ML system replacing this functionality
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
  CloudArrowUpIcon,
  XMarkIcon
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
  const { showToast } = useToast()
  
  const [showVoiceprintSuccess, setShowVoiceprintSuccess] = useState(false)
  const [currentText, setCurrentText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [processingMetric, setProcessingMetric] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [quickResult, setQuickResult] = useState<{
    ai_confidence: number
    riskLevel: 'low' | 'medium' | 'high'
    authenticity?: number
    band?: 'safe' | 'caution' | 'danger'
    cached?: boolean
    responseTime?: number
  } | null>(null)
  const [liveAnalysisTimeout, setLiveAnalysisTimeout] = useState<NodeJS.Timeout | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [checklistDismissed, setChecklistDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboardingChecklistDismissed') === 'true'
    }
    return false
  })
  const [voiceUpsellDismissed, setVoiceUpsellDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      const dismissTime = localStorage.getItem('voiceProfileUpsellDismissTime')
      if (!dismissTime) return false
      
      const minutesSinceDismiss = (Date.now() - parseInt(dismissTime)) / (1000 * 60)
      
      // Reappear after 30 minutes
      if (minutesSinceDismiss >= 30) {
        localStorage.removeItem('voiceProfileUpsellDismissTime')
        return false
      }
      
      return true
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
    const text = e.target.value
    setCurrentText(text)
    setIsTyping(true)
    
    // Clear previous timers
    if (typingTimer) clearTimeout(typingTimer)
    if (liveAnalysisTimeout) clearTimeout(liveAnalysisTimeout)
    
    // Set typing timer
    const timer = setTimeout(() => {
      setIsTyping(false)
    }, 500)
    setTypingTimer(timer)
    
    // Debounced live analysis (400ms after typing stops)
    if (text.length >= 50) {
      const analysisTimer = setTimeout(async () => {
        try {
          const response = await fetch('/api/analyze/quick', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text.slice(0, 2000) }) // Limit to 2k chars
          })
          
          if (response.ok) {
            const data = await response.json()
            setQuickResult({
              ai_confidence: Math.round(100 - data.authenticity),
              riskLevel: data.risk as 'low' | 'medium' | 'high',
              authenticity: data.authenticity,
              band: data.band,
              cached: data.cached,
              responseTime: data.responseTime
            })
            setAnalysisError(null)
          }
        } catch (error) {
          console.error('Live analysis error:', error)
        }
      }, 400)
      
      setLiveAnalysisTimeout(analysisTimer)
    } else {
      // Clear results if text is too short
      setQuickResult(null)
    }
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
    
  // Calculate checklist progress - simplified to 2 items
  const hasAnalyzedText = totalAnalyses > 0
  const hasViewedResults = hasAnalyzedText // Automatically true after first analysis
  const checklistComplete = hasAnalyzedText && hasViewedResults
  
  // Check if 30 minutes have passed since dismissal
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkDismissTime = () => {
      const dismissTime = localStorage.getItem('voiceProfileUpsellDismissTime')
      if (!dismissTime) return
      
      const minutesSinceDismiss = (Date.now() - parseInt(dismissTime)) / (1000 * 60)
      
      if (minutesSinceDismiss >= 30) {
        localStorage.removeItem('voiceProfileUpsellDismissTime')
        setVoiceUpsellDismissed(false)
      }
    }
    
    // Check every minute
    const interval = setInterval(checkDismissTime, 60000)
    
    return () => clearInterval(interval)
  }, [])
  
  const dismissChecklist = () => {
    setChecklistDismissed(true)
    localStorage.setItem('onboardingChecklistDismissed', 'true')
  }

  const handleAnalyze = async () => {
    if (!currentText.trim() || charCount < 50) {
      showToast('Please enter at least 50 characters', 'error')
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)
    setQuickResult(null)

    try {
      // Use REAL AI analysis endpoint - no synthetic data allowed
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: currentText,
          title: 'Quick Analysis from Dashboard',
          voiceprintId: undefined // Optional - quick analysis without voice profile
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const data = await response.json()
      
      // Determine risk level based on real AI confidence
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (data.ai_confidence_score > 60) riskLevel = 'high'
      else if (data.ai_confidence_score > 30) riskLevel = 'medium'
      
      setQuickResult({
        ai_confidence: data.ai_confidence_score || 0,
        riskLevel
      })
      
      showToast('Analysis complete', 'success')
      
    } catch (error: any) {
      console.error('Analysis error:', error)
      // Show specific error messages with guidance
      if (error.message?.includes('rate limit')) {
        setAnalysisError('Rate limit reached. Please wait a moment and try again.')
      } else if (error.message?.includes('timeout')) {
        setAnalysisError('Analysis is taking longer than expected. Please try again.')
      } else {
        setAnalysisError(`Analysis failed: ${error.message || 'Please try again'}`)
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleViewFullAnalysis = () => {
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

          {/* AI Analysis - Responsive padding */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 lg:p-8 mb-8 hover:border-gray-300 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">AI Analysis</h2>
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
                  disabled={charCount < 50 || isAnalyzing}
                  loading={isAnalyzing}
                  className="bg-gray-900 hover:bg-black text-white text-sm px-6 py-2 transition-all"
                >
                  {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Text'}
                  {!isAnalyzing && <ArrowRightIcon className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>
            
            {/* AI Analysis Results - Real-time Display */}
            {quickResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="mt-4 bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${
                      quickResult.riskLevel === 'high' ? 'bg-red-50' :
                      quickResult.riskLevel === 'medium' ? 'bg-amber-50' :
                      'bg-green-50'
                    }`}>
                      <SparklesIcon className={`h-6 w-6 ${
                        quickResult.riskLevel === 'high' ? 'text-red-600' :
                        quickResult.riskLevel === 'medium' ? 'text-amber-600' :
                        'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">AI Detection</p>
                      <p className={`text-2xl font-bold ${
                        quickResult.riskLevel === 'high' ? 'text-red-600' :
                        quickResult.riskLevel === 'medium' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        {quickResult.ai_confidence}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleViewFullAnalysis}
                      variant="default"
                      size="sm"
                    >
                      Deep Analysis
                      <ArrowRightIcon className="h-3 w-3 ml-1" />
                    </Button>
                    <button
                      onClick={() => {
                        setCurrentText('')
                        setQuickResult(null)
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Error Display */}
            {analysisError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{analysisError}</p>
              </div>
            )}
          </div>

          {/* Simplified Onboarding Checklist - Only 2 items */}
          {!checklistDismissed && !checklistComplete && (
            <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-lg p-4 sm:p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Quick Start Guide</h3>
                  <p className="text-xs text-gray-500 mt-1">Complete in under 60 seconds!</p>
                </div>
                <button
                  onClick={dismissChecklist}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Dismiss
                </button>
              </div>
              <div className="space-y-3">
                {/* Step 1: Analyze your first text */}
                <Link href="/analyze" className="block">
                  <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    hasAnalyzedText 
                      ? 'bg-white border border-green-200' 
                      : 'bg-white border border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                      hasAnalyzedText
                        ? 'border-green-500 bg-green-500'
                        : 'border-primary-400 bg-white animate-pulse'
                    }`}>
                      {hasAnalyzedText ? (
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span className="text-primary-600 font-bold text-sm">1</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        hasAnalyzedText ? 'text-green-700' : 'text-gray-900'
                      }`}>
                        Analyze your first text
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasAnalyzedText ? '✅ Completed!' : '~30 seconds • AI detection analysis'}
                      </p>
                    </div>
                    {!hasAnalyzedText && (
                      <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </Link>
                
                {/* Step 2: View your results */}
                <div className={`flex items-center gap-3 p-3 rounded-lg ${
                  hasViewedResults 
                    ? 'bg-white border border-green-200' 
                    : 'bg-white/50 border border-gray-100'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                    hasViewedResults
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {hasViewedResults ? (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-gray-400 font-bold text-sm">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      hasViewedResults ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      View your results
                    </p>
                    <p className="text-xs text-gray-500">
                      {hasViewedResults ? '✅ Completed!' : 'Instant • See AI patterns'}
                    </p>
                  </div>
                </div>

                {/* Celebration when complete */}
                {checklistComplete && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        Awesome! You're all set up 🎉
                      </p>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Tip: Create a voice profile after 3 analyses for personalized suggestions
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Voice DNA Dashboard - New ML Feature */}
          <div className="mb-8">
            {/* ML dashboard will be integrated here */}
          </div>

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


          {/* Voice Profile Upsell - Shows after 3 analyses */}
          {totalAnalyses >= 3 && voiceProfileState.status !== 'active' && !voiceUpsellDismissed && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white rounded-xl p-6 mb-8 relative overflow-hidden shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #0a0e27 0%, #1e3a8a 20%, #0891b2 40%, #06b6d4 50%, #fbbf24 70%, #f97316 85%, #ea580c 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradientShift 15s ease infinite'
              }}
            >
              {/* Dismiss button */}
              <button 
                onClick={() => {
                  // Save dismiss timestamp
                  localStorage.setItem('voiceProfileUpsellDismissTime', Date.now().toString())
                  setVoiceUpsellDismissed(true)
                }}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                title="Dismiss"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>

              {/* Content */}
              <div className="pr-8">
                <div className="flex items-center gap-3 mb-3">
                  <SparklesIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold">Unlock Voice Profile</h3>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs font-medium">
                    Pro Feature
                  </span>
                </div>
                
                <p className="text-white/90 mb-5">
                  You've completed {totalAnalyses} analyses! Create your voice profile for personalized, voice-aware suggestions.
                </p>
                
                <div className="flex items-center gap-4">
                  <Link href="/profile">
                    <button className="bg-white/95 backdrop-blur-sm text-gray-900 hover:bg-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
                      Create Voice Profile
                      <ArrowRightIcon className="h-4 w-4" />
                    </button>
                  </Link>
                  <p className="text-xs text-white/80">
                    Requires 3+ writing samples • Takes 2 minutes
                  </p>
                </div>
              </div>
            </motion.div>
          )}

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