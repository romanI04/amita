'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  LightBulbIcon,
  BeakerIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// Sample texts for quick demo
const sampleTexts = [
  {
    id: 'academic',
    title: 'Academic Essay Sample',
    category: 'academic',
    content: `Climate change represents one of the most pressing challenges facing humanity in the 21st century. The overwhelming scientific consensus indicates that human activities, particularly the emission of greenhouse gases, are the primary driver of observed warming since the mid-20th century. However, addressing climate change requires more than just understanding the science. It demands coordinated global action across multiple sectors.`
  },
  {
    id: 'business',
    title: 'Business Email Sample',
    category: 'business',
    content: `I hope this email finds you well. I wanted to provide a comprehensive update on our Q3 project milestones. First and foremost, I'm pleased to report that we have successfully completed Phase 1 of the implementation ahead of schedule. The development team has done an exceptional job in delivering the core functionality while maintaining high code quality standards.`
  },
  {
    id: 'creative',
    title: 'Creative Writing Sample',
    category: 'creative',
    content: `The coffee shop smelled wrong that Tuesday morning. Not bad, exactly—just wrong. Like someone had tried to recreate the scent of coffee from a description in a book. Maya noticed it the moment she pushed through the door, her laptop bag catching on the handle like it always did. But today, something was off.`
  }
]

export default function DemoMode() {
  const [selectedSample, setSelectedSample] = useState(sampleTexts[0])
  const [activeTab, setActiveTab] = useState<'analysis' | 'improvements'>('analysis')
  const [customText, setCustomText] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [demoUsage, setDemoUsage] = useState({ used: 0, limit: 3, remaining: 3 })
  const [processingTime, setProcessingTime] = useState<string | null>(null)

  // Check demo usage on mount
  useEffect(() => {
    checkDemoUsage()
  }, [])

  const checkDemoUsage = async () => {
    try {
      const response = await fetch('/api/analyze/demo', { method: 'GET' })
      if (response.ok) {
        const data = await response.json()
        setDemoUsage(data)
      }
    } catch (err) {
      console.error('Failed to check demo usage:', err)
    }
  }

  const analyzeText = async (text: string) => {
    setIsAnalyzing(true)
    setError(null)
    setAnalysisResult(null)
    
    try {
      const response = await fetch('/api/analyze/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Analysis failed')
      }
      
      setAnalysisResult(data.analysis)
      setDemoUsage(data.usage)
      setProcessingTime(data.processingTime)
      
      // Show success message if last demo
      if (data.usage.remaining === 0) {
        setError('You\'ve used all 3 free demos today. Sign up for unlimited analysis!')
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze text')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSampleSelect = (sample: typeof sampleTexts[0]) => {
    setSelectedSample(sample)
    setShowCustom(false)
    analyzeText(sample.content)
  }

  const handleCustomAnalysis = () => {
    if (customText.length >= 50) {
      analyzeText(customText)
    }
  }

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { label: 'High Risk', color: 'red' }
    if (score >= 40) return { label: 'Medium Risk', color: 'yellow' }
    return { label: 'Low Risk', color: 'green' }
  }

  const getAuthenticityLevel = (score: number) => {
    if (score >= 70) return { label: 'Highly Authentic', color: 'green' }
    if (score >= 40) return { label: 'Mixed', color: 'yellow' }
    return { label: 'Needs Improvement', color: 'red' }
  }

  const aiRisk = analysisResult ? getRiskLevel(analysisResult.ai_confidence_score) : null
  const authenticity = analysisResult ? getAuthenticityLevel(analysisResult.authenticity_score) : null

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BeakerIcon className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Try It Now - No Signup Required</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <SparklesIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Live Demo</span>
          </div>
        </div>
        <p className="text-white/90">
          Select an example below or paste your own text to see instant AI analysis
        </p>
      </div>

      {/* Example Selector */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {sampleTexts.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleSampleSelect(sample)}
                disabled={isAnalyzing || demoUsage.remaining === 0}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  selectedSample.id === sample.id && !showCustom
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span className="capitalize">{sample.category}</span>: {sample.title}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(true)}
              disabled={isAnalyzing || demoUsage.remaining === 0}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                showCustom
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              ✏️ Try Your Own Text
            </button>
          </div>
          
          {/* Demo Usage Counter */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`font-medium ${
              demoUsage.remaining === 0 ? 'text-red-600' : 
              demoUsage.remaining === 1 ? 'text-yellow-600' : 
              'text-gray-600'
            }`}>
              {demoUsage.remaining === 0 
                ? 'No demos left today'
                : `${demoUsage.remaining} demo${demoUsage.remaining === 1 ? '' : 's'} remaining`
              }
            </span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < demoUsage.used ? 'bg-gray-400' : 'bg-primary-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 divide-x divide-gray-200">
        {/* Left: Text Display */}
        <div className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
            {showCustom ? 'Your Text' : selectedSample.title}
          </h3>
          
          {showCustom ? (
            <div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Paste your text here to analyze... (minimum 50 characters)"
                className="w-full h-64 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {customText.length} characters
                </span>
                {customText.length >= 50 && (
                  <Button 
                    size="sm" 
                    onClick={handleCustomAnalysis}
                    disabled={isAnalyzing || demoUsage.remaining === 0}
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze This Text'}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                {selectedSample.content}
              </div>
              <div className="mt-3 text-sm text-gray-500">
                {selectedSample.content.split(/\s+/).length} words
              </div>
            </>
          )}
        </div>

        {/* Right: Analysis Results */}
        <div className="p-6 bg-gray-50">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <CpuChipIcon className="h-12 w-12 text-primary-500 mb-3 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing with Real AI...</h3>
              <p className="text-gray-600 mb-2">Processing your text with xAI Grok</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ClockIcon className="h-4 w-4" />
                <span>This may take a few seconds</span>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 mb-1">Analysis Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                  {demoUsage.remaining === 0 && (
                    <Link href="/signup">
                      <Button size="sm" className="mt-3">
                        Sign Up for Unlimited Analysis
                        <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ) : !analysisResult && !showCustom ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BeakerIcon className="h-12 w-12 text-primary-500 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Sample</h3>
              <p className="text-gray-600">Choose an example above to see real AI analysis</p>
            </div>
          ) : showCustom && customText.length < 50 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500">Enter at least 50 characters to see analysis</p>
            </div>
          ) : showCustom && !analysisResult ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <SparklesIcon className="h-12 w-12 text-primary-500 mb-3 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze!</h3>
              <p className="text-gray-600 mb-4">Click the button to get real AI analysis</p>
              <Button 
                onClick={handleCustomAnalysis}
                disabled={demoUsage.remaining === 0}
              >
                Analyze This Text
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : analysisResult ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Real AI Analysis</h3>
                <div className="flex items-center gap-3 text-xs">
                  {processingTime && (
                    <span className="text-gray-500">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      {processingTime}
                    </span>
                  )}
                  <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-medium">
                    Powered by xAI
                  </span>
                </div>
              </div>
              
              {/* Risk Scores */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">AI Detection Risk</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      aiRisk?.color === 'red' ? 'bg-red-100 text-red-700' :
                      aiRisk?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {aiRisk?.label || 'Analyzing...'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysisResult?.ai_confidence_score || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        aiRisk?.color === 'red' ? 'bg-red-500' :
                        aiRisk?.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${analysisResult?.ai_confidence_score || 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Authenticity</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      authenticity?.color === 'green' ? 'bg-green-100 text-green-700' :
                      authenticity?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {authenticity?.label || 'Analyzing...'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {analysisResult?.authenticity_score || 0}%
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        authenticity?.color === 'green' ? 'bg-green-500' :
                        authenticity?.color === 'yellow' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${analysisResult?.authenticity_score || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'analysis'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                  Issues Found
                </button>
                <button
                  onClick={() => setActiveTab('improvements')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all ${
                    activeTab === 'improvements'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:bg-white/50'
                  }`}
                >
                  <LightBulbIcon className="h-4 w-4 inline mr-1" />
                  Improvements
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'analysis' ? (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {analysisResult.detected_issues?.length > 0 ? (
                      analysisResult.detected_issues.map((issue: any, index: number) => (
                        <div key={index} className="bg-white p-3 rounded-lg flex gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-700">{issue.reason}</p>
                            {issue.text && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{issue.text}"</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-green-50 p-3 rounded-lg flex gap-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">No significant AI patterns detected</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="improvements"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    {analysisResult.improvements?.length > 0 ? (
                      analysisResult.improvements.map((improvement: string, index: number) => (
                        <div key={index} className="bg-white p-3 rounded-lg flex gap-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">{improvement}</p>
                        </div>
                      ))
                    ) : (
                      <div className="bg-green-50 p-3 rounded-lg flex gap-3">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">Your writing style is already authentic!</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA */}
              <div className="mt-6 p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-900 mb-3">
                  Want to fix these issues automatically? Sign up for free to:
                </p>
                <ul className="text-sm text-primary-700 space-y-1 mb-4">
                  <li>• Get personalized suggestions</li>
                  <li>• Build your unique voice profile</li>
                  <li>• Track improvement over time</li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full">
                    Start Writing Better
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}