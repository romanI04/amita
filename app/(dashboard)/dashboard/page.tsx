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

        {/* Main Content */}
        <div className="max-w-5xl mx-auto px-6 py-16">
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

          {/* Quick Analysis - Refined */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8 hover:border-gray-300 transition-all">
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

          {/* Stats Row - Subtle with hover activation */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <motion.div 
              whileHover={{ y: -2 }}
              onHoverStart={() => setHoveredCard('analyses')}
              onHoverEnd={() => setHoveredCard(null)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <LiveMetric 
                value={Math.min(100, totalAnalyses * 10)} 
                label="Total Analyses" 
                suffix={` (${totalAnalyses})`}
                color="blue"
                isActive={hoveredCard === 'analyses'}
              />
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -2 }}
              onHoverStart={() => setHoveredCard('authenticity')}
              onHoverEnd={() => setHoveredCard(null)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <LiveMetric 
                value={avgAuthenticity} 
                label="Avg Authenticity" 
                suffix="%"
                color="green"
                isActive={hoveredCard === 'authenticity'}
              />
            </motion.div>
            
            <motion.div 
              whileHover={{ y: -2 }}
              onHoverStart={() => setHoveredCard('voice')}
              onHoverEnd={() => setHoveredCard(null)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <LiveMetric 
                value={voiceProfileState.status === 'active' ? 100 : voiceProfileState.coverage.sampleCount * 20} 
                label="Voice Profile" 
                suffix={voiceProfileState.status === 'active' ? ' Active' : ' Building'}
                color="violet"
                isActive={hoveredCard === 'voice' || processingMetric === 'voice'}
              />
            </motion.div>
          </div>

          {/* Action Cards - Clean with subtle hover */}
          <div className="grid grid-cols-3 gap-6 mb-8">
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

          {/* Footer Status Bar - Subtle dots */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <StatusLine 
              items={[
                { label: 'System', active: true, color: 'green' },
                { label: 'API', active: true, color: 'blue' },
                { label: 'Voice', active: voiceProfileState.status === 'active', color: 'violet' }
              ]}
            />
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