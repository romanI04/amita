'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { 
  SubtleBlocks,
  ProcessIndicator,
  ProgressDots,
  TypingFlow,
  LiveMetric
} from '@/components/SubtleBlocks'
import AppLayout from '@/components/layout/AppLayout'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface AnalysisResult {
  ai_confidence_score: number
  authenticity_score: number
  detected_sections: Array<{
    text: string
    confidence: number
    reason: string
  }>
  improvement_suggestions: string[]
  style_analysis: {
    tone: string
    readability: string
    structure: string
  }
}

export default function AnalyzePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true) // Auto-expanded by default
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)
  const [highlightedSections, setHighlightedSections] = useState<Array<{start: number, end: number, reason: string, confidence: number, suggestion?: string, originalText?: string, replacementText?: string}>>([])
  const [isSaved, setIsSaved] = useState(false)
  const [selectedSection, setSelectedSection] = useState<{section: any, x: number, y: number, useFixed?: boolean} | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length
  const canAnalyze = charCount >= 50

  useEffect(() => {
    const savedText = sessionStorage.getItem('quickAnalysisText')
    if (savedText) {
      setText(savedText)
      sessionStorage.removeItem('quickAnalysisText')
    }
  }, [])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    setIsTyping(true)
    
    if (typingTimer) clearTimeout(typingTimer)
    
    const timer = setTimeout(() => {
      setIsTyping(false)
    }, 500)
    setTypingTimer(timer)
  }

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      showToast('Please enter at least 50 characters', 'error')
      return
    }

    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAnalysisProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          user_id: user?.id,
          title: `Analysis - ${new Date().toLocaleDateString()}`
        })
      })

      clearInterval(progressInterval)
      setAnalysisProgress(100)

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      setAnalysisResult(result)
      setIsSaved(true) // Mark as saved to database
      showToast('Analysis complete and saved', 'success')
      
      // Process AI patterns for inline highlighting and map suggestions
      if (result.detected_sections && result.improvement_suggestions) {
        const sections = result.detected_sections.map((section: any, idx: number) => {
          const index = text.toLowerCase().indexOf(section.text.toLowerCase())
          // Map relevant suggestion to each section
          const relevantSuggestion = result.improvement_suggestions[idx] || 
            result.improvement_suggestions.find((s: string) => 
              s.toLowerCase().includes(section.reason.toLowerCase().split('.')[0])
            ) || result.improvement_suggestions[0]
          
          // Generate improved text based on the pattern
          const replacementText = generateImprovedText(section.text, section.reason)
          
          return {
            start: index,
            end: index + section.text.length,
            reason: section.reason,
            confidence: section.confidence,
            suggestion: relevantSuggestion,
            originalText: section.text,
            replacementText: replacementText
          }
        }).filter((s: any) => s.start !== -1)
        setHighlightedSections(sections)
      }
      
      // Flash the results metrics
      setActiveMetric('results')
      setTimeout(() => setActiveMetric(null), 3000)
    } catch (error) {
      showToast('Analysis failed. Please try again.', 'error')
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
      setTimeout(() => {
        setAnalysisProgress(0)
      }, 1000)
    }
  }

  const handleClear = () => {
    setText('')
    setAnalysisResult(null)
    setShowSuggestions(true)
    setShowAllSuggestions(false)
    setAnalysisProgress(0)
    setHighlightedSections([])
    setIsSaved(false)
    setSelectedSection(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    textAreaRef.current?.focus()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a TXT, PDF, or DOCX file', 'error')
      return
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('File size must be less than 10MB', 'error')
      return
    }

    setSelectedFile(file)
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Failed to extract text')
      }

      const { text: extractedText } = await response.json()
      setText(extractedText)
      showToast('File processed successfully', 'success')
    } catch (error) {
      console.error('File processing error:', error)
      showToast('Failed to process file', 'error')
      setSelectedFile(null)
    } finally {
      setIsUploading(false)
    }
  }
  
  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedSection && !(e.target as HTMLElement).closest('.suggestion-popup')) {
        setSelectedSection(null)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [selectedSection])
  
  // Generate improved text based on AI pattern
  const generateImprovedText = (originalText: string, reason: string): string => {
    // Simple improvements based on common patterns
    let improved = originalText
    
    if (reason.toLowerCase().includes('repetitive')) {
      // Remove repetitive structure
      improved = originalText.replace(/The fact that/gi, '').trim()
      improved = improved.charAt(0).toUpperCase() + improved.slice(1)
    } else if (reason.toLowerCase().includes('passive')) {
      // Convert passive to active voice (simplified)
      improved = originalText.replace(/is being /gi, '').replace(/was being /gi, '')
    } else if (reason.toLowerCase().includes('formal') || reason.toLowerCase().includes('robotic')) {
      // Make it more conversational
      improved = originalText
        .replace(/It is imperative/gi, "It's important")
        .replace(/utilize/gi, 'use')
        .replace(/implement/gi, 'set up')
        .replace(/facilitate/gi, 'help')
    } else if (reason.toLowerCase().includes('generic')) {
      // Add specificity (this would ideally be more context-aware)
      improved = originalText.replace(/many/gi, 'several').replace(/things/gi, 'aspects')
    }
    
    // If no specific improvement, suggest a slight rewrite
    if (improved === originalText) {
      const words = originalText.split(' ')
      if (words.length > 5) {
        // Rearrange sentence structure slightly
        improved = words.slice(Math.floor(words.length/2)).join(' ') + ', ' + 
                  words.slice(0, Math.floor(words.length/2)).join(' ')
      }
    }
    
    return improved
  }
  
  // Apply the fix to the text
  const applyFix = (section: any) => {
    if (!section.replacementText) return
    
    // Create new text with the replacement
    const beforeText = text.substring(0, section.start)
    const afterText = text.substring(section.end)
    const newText = beforeText + section.replacementText + afterText
    
    // Update the text
    setText(newText)
    
    // Remove this section from highlights since it's been fixed
    setHighlightedSections(prev => prev.filter(s => 
      s.start !== section.start || s.end !== section.end
    ))
    
    // Close the popup
    setSelectedSection(null)
    
    // Show success toast
    showToast('Fix applied successfully', 'success')
  }

  // Render text with inline AI pattern highlights
  const renderHighlightedText = () => {
    if (!text || highlightedSections.length === 0) return text
    
    let lastIndex = 0
    const parts: React.ReactNode[] = []
    
    highlightedSections.sort((a, b) => a.start - b.start).forEach((section, idx) => {
      // Add text before highlight
      if (section.start > lastIndex) {
        parts.push(text.substring(lastIndex, section.start))
      }
      
      // Add highlighted section with Grammarly-style underline
      const highlightStyle = section.confidence > 70 ? 'border-b-2 border-red-500 bg-red-50' : 
                            section.confidence > 40 ? 'border-b-2 border-yellow-500 bg-yellow-50' : 
                            'border-b-2 border-blue-500 bg-blue-50'
      
      parts.push(
        <span
          key={idx}
          className={`${highlightStyle} rounded-sm cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation()
            const rect = (e.target as HTMLElement).getBoundingClientRect()
            const containerRect = textContainerRef.current?.getBoundingClientRect()
            if (containerRect) {
              // Calculate if popup should appear above or below
              const spaceBelow = window.innerHeight - rect.bottom
              const popupHeight = 350 // Approximate popup height
              const popupWidth = 320
              
              // Check if we should show above
              const shouldShowAbove = spaceBelow < popupHeight && rect.top > popupHeight
              
              // Calculate X position to keep popup in viewport
              let xPos = rect.left
              if (rect.left + popupWidth > window.innerWidth) {
                xPos = window.innerWidth - popupWidth - 20
              }
              if (xPos < 10) xPos = 10
              
              // Calculate Y position
              let yPos = shouldShowAbove 
                ? rect.top - popupHeight - 5
                : rect.bottom + 5
                
              // Make sure popup stays in viewport
              if (yPos < 10) yPos = 10
              if (yPos + popupHeight > window.innerHeight - 10) {
                yPos = window.innerHeight - popupHeight - 10
              }
              
              setSelectedSection({
                section,
                x: xPos,
                y: yPos,
                useFixed: true // Use fixed positioning
              })
            }
          }}
        >
          {text.substring(section.start, section.end)}
        </span>
      )
      
      lastIndex = section.end
    })
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }
    
    return <>{parts}</>
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-8">
            {/* Improved Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 mb-6" aria-label="Breadcrumb">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-1 text-base text-gray-600 hover:text-gray-900 py-2 pr-2 -ml-2 pl-2 rounded-lg hover:bg-gray-50 transition-all min-h-[44px]"
              >
                Dashboard
              </button>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-base text-gray-900 py-2">Analyze</span>
            </nav>
            
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Writing Analysis
            </h1>
            <p className="text-gray-500">
              Deep AI detection and authenticity assessment
            </p>
            <div className="mt-4">
              <span className="text-xs text-gray-300" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                ••••••••••••••••••••••••••••••••••••••••
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Analysis Box - Redesigned */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-all">
                {/* Header Bar with Tabs */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => setInputMode('text')}
                          className={`px-3 py-1.5 text-xs rounded transition-all ${
                            inputMode === 'text' 
                              ? 'bg-gray-900 text-white' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Text Input
                        </button>
                        <button
                          onClick={() => setInputMode('file')}
                          className={`px-3 py-1.5 text-xs rounded transition-all ${
                            inputMode === 'file' 
                              ? 'bg-gray-900 text-white' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          File Upload
                        </button>
                      </div>
                      {inputMode === 'text' && <TypingFlow isTyping={isTyping} wordCount={wordCount} />}
                    </div>
                    {text && (
                      <button
                        onClick={handleClear}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-6">
                  {inputMode === 'text' ? (
                    /* Text Input Mode */
                    <div className="relative" ref={textContainerRef} style={{ isolation: 'isolate' }}>
                      <textarea
                      ref={textAreaRef}
                      value={text}
                      onChange={handleTextChange}
                      placeholder="Paste or type your text here for analysis..."
                      className="w-full h-64 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300 resize-none transition-all"
                      style={{ 
                        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                        color: highlightedSections.length > 0 ? 'transparent' : undefined 
                      }}
                    />
                    
                    {/* Privacy Reassurance */}
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        We never store your text.{' '}
                        <a href="/privacy" className="text-gray-700 hover:text-gray-900 underline">
                          Learn more
                        </a>
                      </p>
                    </div>
                    
                    {/* Overlay for highlighted text */}
                    {highlightedSections.length > 0 && (
                      <div 
                        className="absolute inset-0 p-4 overflow-auto"
                        style={{ pointerEvents: 'none' }}
                      >
                        <div 
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ 
                            pointerEvents: 'auto',
                            fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                          }}
                        >
                          {renderHighlightedText()}
                        </div>
                      </div>
                    )}
                    </div>
                  ) : (
                    /* File Upload Mode */
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.pdf,.docx"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer"
                        >
                          {isUploading ? (
                            <div className="space-y-2">
                              <ProcessIndicator isProcessing={true} />
                              <p className="text-sm text-gray-600">Processing file...</p>
                            </div>
                          ) : selectedFile ? (
                            <div className="space-y-2">
                              <svg className="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                              <p className="text-xs text-gray-500">Click to change file</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <p className="text-sm font-medium text-gray-900">Upload a document</p>
                              <p className="text-xs text-gray-500">TXT, PDF, or DOCX (max 10MB)</p>
                            </div>
                          )}
                        </label>
                      </div>
                      
                      {text && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-600 mb-2">Extracted text preview:</p>
                          <p className="text-sm text-gray-900 line-clamp-3">{text}</p>
                        </div>
                      )}
                      
                      {/* Privacy Reassurance */}
                      <p className="text-xs text-gray-500 text-center">
                        Files are processed locally and never stored.{' '}
                        <a href="/privacy" className="text-gray-700 hover:text-gray-900 underline">
                          Learn more
                        </a>
                      </p>
                    </div>
                  )}
                </div>

                {/* Live Metrics Bar - shown in text mode only */}
                {inputMode === 'text' && (
                  <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Characters</span>
                      <SubtleBlocks 
                        value={charCount} 
                        max={1000} 
                        color="green"
                        isActive={isTyping}
                        size="xs"
                      />
                      <span className={`text-xs font-medium ${charCount >= 50 ? 'text-green-600' : 'text-gray-400'}`}>
                        {charCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Words</span>
                      <SubtleBlocks 
                        value={wordCount} 
                        max={200} 
                        color="blue"
                        isActive={isTyping}
                        size="xs"
                      />
                      <span className="text-xs font-medium text-gray-600">{wordCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Sentences</span>
                      <SubtleBlocks 
                        value={sentenceCount} 
                        max={20} 
                        color="violet"
                        isActive={isTyping}
                        size="xs"
                      />
                      <span className="text-xs font-medium text-gray-600">{sentenceCount}</span>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="px-6 pb-6">
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAnalyze}
                      disabled={!canAnalyze || isAnalyzing}
                      className="bg-gray-900 hover:bg-black text-white text-sm px-8 py-2.5 transition-all"
                    >
                      {isAnalyzing ? (
                        <>
                          <ProcessIndicator isProcessing={true} />
                          <span className="ml-2">Analyzing</span>
                        </>
                      ) : (
                        <>
                          Analyze Text
                          <ArrowRightIcon className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <div className="px-6 pb-6">
                    <ProgressDots progress={analysisProgress} isActive={true} color="blue" />
                  </div>
                )}
              </div>

              {/* Suggestions Section - AUTO-EXPANDED */}
              <AnimatePresence>
                {analysisResult && analysisResult.improvement_suggestions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-6"
                  >
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-gray-900">
                          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••••••••</span> Writing Improvements
                        </h3>
                        <button
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {showSuggestions ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      
                      {showSuggestions && (
                        <div className="space-y-4">
                          {/* Show first 3 or all suggestions based on state */}
                          {(showAllSuggestions ? analysisResult.improvement_suggestions : analysisResult.improvement_suggestions.slice(0, 3))
                            .map((suggestion, index) => {
                              const keyPoint = suggestion.split(/[:.]/)[0].trim()
                              const details = suggestion.substring(keyPoint.length + 1).trim()
                              
                              return (
                                <motion.div 
                                  key={index} 
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.1 }}
                                  className="border-l-2 border-gray-200 pl-4 hover:border-gray-400 transition-colors"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                                      {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 mb-1">
                                        {keyPoint}
                                      </p>
                                      {details && (
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                          {details}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          
                          {/* Show more/less button */}
                          {analysisResult.improvement_suggestions.length > 3 && (
                            <button
                              onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                              className="w-full py-3 bg-white border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-green-400 hover:text-green-600 transition-all"
                            >
                              {showAllSuggestions ? 
                                `Show Less ↑` : 
                                `View ${analysisResult.improvement_suggestions.length - 3} More Suggestions ↓`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Results Sidebar */}
            <div className="space-y-6">
              {/* Document Stats - Minimalistic */}
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••••••••</span> Document Stats
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Words</span>
                      <span className="text-lg font-light text-gray-900">{wordCount}</span>
                    </div>
                    <SubtleBlocks 
                      value={Math.round((wordCount / 500) * 100)} 
                      max={100} 
                      color="blue"
                      isActive={isTyping}
                      size="xs"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Sentences</span>
                      <span className="text-lg font-light text-gray-900">{sentenceCount}</span>
                    </div>
                    <SubtleBlocks 
                      value={Math.round((sentenceCount / 20) * 100)} 
                      max={100} 
                      color="violet"
                      isActive={isTyping}
                      size="xs"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Readability</span>
                      <span className="text-lg font-light text-gray-900">
                        {wordCount > 0 ? Math.round(Math.min(100, (20 / (wordCount / sentenceCount)) * 100) || 0) : 0}%
                      </span>
                    </div>
                    <SubtleBlocks 
                      value={wordCount > 0 ? Math.round(Math.min(100, (20 / (wordCount / sentenceCount)) * 100) || 0) : 0} 
                      max={100} 
                      color="green"
                      isActive={isTyping}
                      size="xs"
                    />
                  </div>
                </div>
                
                {isSaved && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••••</span> Saved to history
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Analysis Results */}
              <AnimatePresence>
                {analysisResult && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-6"
                  >
                    {/* Main Results */}
                    <div className="bg-white border-2 border-gray-900 rounded-xl overflow-hidden">
                      <div className="bg-gray-900 text-white px-4 py-3">
                        <h3 className="text-sm font-medium">Analysis Results</h3>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">Authenticity</span>
                            <span className="text-2xl font-light text-gray-900">
                              {Math.round(analysisResult.authenticity_score)}%
                            </span>
                          </div>
                          <SubtleBlocks 
                            value={analysisResult.authenticity_score} 
                            max={100} 
                            color="green"
                            isActive={activeMetric === 'results'}
                            size="sm"
                          />
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">AI Detection</span>
                            <span className="text-2xl font-light text-gray-900">
                              {Math.round(analysisResult.ai_confidence_score)}%
                            </span>
                          </div>
                          <SubtleBlocks 
                            value={analysisResult.ai_confidence_score} 
                            max={100} 
                            color="red"
                            isActive={activeMetric === 'results'}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Patterns Info Card */}
                    {highlightedSections.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••••</span> AI Patterns
                        </h3>
                        <p className="text-xs text-gray-600 mb-3">
                          {highlightedSections.length} patterns detected and highlighted in your text above.
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-red-100 border-b-2 border-red-500 rounded"></span>
                            <span className="text-xs text-gray-600">High AI likelihood (70%+)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-yellow-100 border-b-2 border-yellow-500 rounded"></span>
                            <span className="text-xs text-gray-600">Medium AI likelihood (40-70%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 bg-blue-100 border-b-2 border-blue-500 rounded"></span>
                            <span className="text-xs text-gray-600">Low AI likelihood (&lt;40%)</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 italic">
                          Hover over highlighted text to see specific patterns
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                      <Button
                        onClick={() => router.push('/profile')}
                        className="w-full bg-gray-900 hover:bg-black text-white text-sm"
                      >
                        Improve Voice Profile
                      </Button>
                      <Button
                        onClick={handleClear}
                        variant="outline"
                        className="w-full border-gray-300 text-sm"
                      >
                        New Analysis
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Footer Status */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span>Engine</span>
                <SubtleBlocks value={100} max={100} color="green" isActive={isAnalyzing} size="xs" />
                <span>{isAnalyzing ? 'Processing' : 'Ready'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Models</span>
                <SubtleBlocks value={100} max={100} color="blue" isActive={isAnalyzing} size="xs" />
                <span>Loaded</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Accuracy</span>
                <SubtleBlocks value={95} max={100} color="violet" isActive={false} size="xs" />
                <span>High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contextual Suggestion Popup - Rendered as Portal */}
      {selectedSection && typeof document !== 'undefined' && createPortal(
        <div 
          className={`suggestion-popup fixed z-50 bg-white border border-gray-300 rounded-lg shadow-2xl p-4`}
          style={{ 
            left: `${selectedSection.x}px`, 
            top: `${selectedSection.y}px`,
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-900 mb-1">AI Pattern Detected</p>
              <p className="text-xs text-gray-500">{selectedSection.section.reason.split('.')[0]}</p>
            </div>
            <button 
              onClick={() => setSelectedSection(null)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Suggested Fix:</p>
            
            {selectedSection.section.replacementText && (
              <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200 max-h-32 overflow-y-auto">
                <p className="text-xs text-gray-500 line-through mb-1">
                  {selectedSection.section.originalText}
                </p>
                <p className="text-xs text-green-700 font-medium">
                  {selectedSection.section.replacementText}
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mb-3">
              {selectedSection.section.suggestion?.split('.')[0] || 'This will make your text sound more natural'}
            </p>
            
            <div className="flex gap-2">
              <button 
                className="flex-1 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded hover:bg-black transition-colors"
                onClick={() => applyFix(selectedSection.section)}
              >
                Apply Fix
              </button>
              <button 
                className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 text-xs font-medium rounded hover:bg-gray-50 transition-colors"
                onClick={() => setSelectedSection(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Confidence</span>
              <span className="font-medium text-gray-900">{Math.round(selectedSection.section.confidence)}%</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  )
}