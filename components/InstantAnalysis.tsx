'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  ArrowRightIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'

export function InstantAnalysis() {
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [quickResult, setQuickResult] = useState<any>(null)
  const router = useRouter()
  const { showToast } = useToast()

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  const canAnalyze = charCount >= 50

  const handleQuickAnalyze = async () => {
    if (!canAnalyze) {
      showToast('Please enter at least 50 characters', 'error')
      return
    }

    setIsAnalyzing(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
      const avgWordsPerSentence = Math.round(wordCount / sentences.length)
      const hasQuestions = /\?/.test(text)
      const hasExclamations = /!/.test(text)
      
      const aiLikelihood = 
        avgWordsPerSentence > 20 ? 65 :
        avgWordsPerSentence > 15 ? 45 : 25
      
      const authenticityScore = 
        hasQuestions && hasExclamations ? 85 :
        hasQuestions || hasExclamations ? 70 : 60

      setQuickResult({
        aiLikelihood,
        authenticityScore,
        avgWordsPerSentence,
        sentenceCount: sentences.length,
        wordCount
      })
      
      showToast('Analysis complete', 'success')
    } catch (error) {
      showToast('Analysis failed. Please try again.', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFullAnalysis = () => {
    sessionStorage.setItem('quickAnalysisText', text)
    router.push('/analyze')
  }

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setText(clipboardText)
      showToast('Text pasted', 'success')
    } catch (error) {
      showToast('Could not paste from clipboard', 'error')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-5 w-5 text-gray-700" />
          <div>
            <h3 className="font-semibold text-gray-900">Quick Analysis</h3>
            <p className="text-sm text-gray-500">Analyze text instantly</p>
          </div>
        </div>
        
        <button
          onClick={handlePaste}
          className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          title="Paste from clipboard"
        >
          <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type any text here for instant analysis..."
            className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm"
          />
          
          <div className="absolute bottom-2 right-2 text-xs text-gray-400">
            {charCount}/50 chars {charCount >= 50 && '✓'}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleQuickAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className="flex-1 bg-gray-700 hover:bg-gray-800 text-white"
          >
            {isAnalyzing ? 'Analyzing...' : 'Quick Check'}
          </Button>
          
          {text.length > 0 && (
            <Button
              onClick={handleFullAnalysis}
              variant="outline"
              className="border-gray-300"
            >
              Full Analysis
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>

        <AnimatePresence>
          {quickResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 text-xs mb-1">AI Likelihood</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {quickResult.aiLikelihood}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Authenticity</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {quickResult.authenticityScore}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Avg Words/Sentence</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {quickResult.avgWordsPerSentence}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs mb-1">Word Count</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {quickResult.wordCount}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  This is a preliminary analysis. For detailed insights and recommendations, 
                  use Full Analysis.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}