'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import AppLayout from '@/components/layout/AppLayout'
import { 
  SparklesIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  RocketLaunchIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'

// Sample text for quick start
const SAMPLE_TEXT = `The rapid advancement of artificial intelligence has fundamentally transformed how we approach problem-solving across industries. Machine learning algorithms now process vast datasets with unprecedented speed, identifying patterns that would take humans years to discover. This technological revolution isn't just about automation; it's about augmenting human capabilities and creating new possibilities for innovation.

However, as we integrate AI into critical decision-making processes, we must carefully consider the ethical implications. Questions about bias in algorithms, transparency in AI decision-making, and the future of human employment demand thoughtful consideration. The challenge isn't whether to embrace AI, but how to do so responsibly while maintaining human oversight and values.`

export default function WelcomePage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  const [text, setText] = useState(SAMPLE_TEXT)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  
  // Check if user has already completed onboarding
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('onboarding_completed')
      const hasAnalyses = localStorage.getItem('has_first_analysis')
      
      if (completed === 'true' || hasAnalyses === 'true') {
        router.push('/dashboard')
      }
    }
  }, [router])

  const handleQuickAnalysis = async () => {
    setIsAnalyzing(true)
    setProgress(25)
    
    try {
      // Save text to session for analyze page
      sessionStorage.setItem('quickAnalysisText', text)
      setProgress(50)
      
      // Mark step as completed
      setCompletedSteps(['analyze'])
      setProgress(75)
      
      // Store that user has done their first analysis
      localStorage.setItem('has_first_analysis', 'true')
      setProgress(100)
      
      // Redirect to analyze page
      setTimeout(() => {
        router.push('/analyze')
      }, 500)
      
    } catch (error) {
      console.error('Quick analysis error:', error)
      showToast('Failed to start analysis', 'error')
      setIsAnalyzing(false)
      setProgress(0)
    }
  }

  const skipOnboarding = () => {
    localStorage.setItem('onboarding_skipped', 'true')
    router.push('/dashboard')
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {/* Welcome Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <RocketLaunchIcon className="h-8 w-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to amita.ai, {profile?.full_name || user?.email?.split('@')[0]}!
            </h1>
            <p className="text-lg text-gray-600">
              Let's analyze your first text in under 60 seconds
            </p>
          </motion.div>

          {/* Free Analyses Banner */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl p-4 mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              <span className="font-medium">Your first 5 analyses are completely free!</span>
              <SparklesIcon className="h-5 w-5" />
            </div>
            <p className="text-sm text-white/90 mt-1">No credit card required</p>
          </motion.div>

          {/* Quick Start Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    completedSteps.includes('analyze') 
                      ? 'bg-green-100' 
                      : 'bg-primary-100 animate-pulse'
                  }`}>
                    {completedSteps.includes('analyze') ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <span className="text-primary-600 font-bold">1</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Try Your First Analysis
                    </h2>
                    <p className="text-sm text-gray-500">
                      We've pre-filled some sample text - just click analyze!
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  ~30 seconds
                </span>
              </div>
            </div>

            <div className="p-6 bg-gray-50">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample Text (or paste your own)
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full h-40 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Paste your text here..."
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {text.split(/\s+/).length} words • {text.length} characters
                </div>
                <Button
                  onClick={handleQuickAnalysis}
                  disabled={isAnalyzing || text.length < 50}
                  className="relative overflow-hidden"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <span className="relative z-10">Preparing Analysis...</span>
                      <motion.div 
                        className="absolute inset-0 bg-primary-600"
                        initial={{ x: '-100%' }}
                        animate={{ x: `${progress - 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </>
                  ) : (
                    <>
                      <DocumentTextIcon className="h-5 w-5 mr-2" />
                      Try Analysis Now
                      <ArrowRightIcon className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Onboarding Steps */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl border border-gray-200 p-6 mb-8"
          >
            <h3 className="font-medium text-gray-900 mb-4">Your Quick Start Journey</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  completedSteps.includes('analyze') 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  {completedSteps.includes('analyze') ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <span className="text-gray-400 text-sm">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Analyze your first text
                  </p>
                  <p className="text-xs text-gray-500">30 seconds</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    View your AI detection results
                  </p>
                  <p className="text-xs text-gray-500">Instant</p>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-50">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <ChartBarIcon className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Create voice profile
                  </p>
                  <p className="text-xs text-gray-400">Optional - Unlock with 3+ analyses</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Skip Option */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <button
              onClick={skipOnboarding}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip and go to dashboard
            </button>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}