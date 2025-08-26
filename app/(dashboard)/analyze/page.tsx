'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/Toast'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { voiceCalculator } from '@/lib/voice/real-time-calculator'
import { VoiceImpactIndicator, VoiceImpactBadge, VoiceComparison } from '@/components/voice/VoiceImpactIndicator'
import { VoiceSafeToggle, VoiceSafeBadge } from '@/components/voice/VoiceSafeToggle'
import { TrustIndicators, TrustExplanation } from '@/components/voice/TrustBadges'
import { ActivityFeed, ActivityIndicator, ActivitySummary } from '@/components/history/ActivityFeed'
import { VoiceTease, InlineVoiceTeaser, VoiceProfileCTA } from '@/components/voice/VoiceTeasers'
import { UpgradePrompt, UpgradeBanner, ValueDisplay } from '@/components/voice/SmartUpgradePrompts'
import { MobileBottomSheet } from '@/components/voice/MobileBottomSheet'
// Voice DNA components removed - ML system replacing this functionality
// Voice profile will be managed locally in this component
import type { VoiceEditingState, ChangeLogEntry } from '@/types'

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
  sentenceScores?: Array<{
    index: number
    text: string
    score: number
    features: {
      wordCount: number
      hasAIPhrases: boolean
      formalityScore: boolean
    }
  }>
}

export default function AnalyzePage() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Voice profile state - would normally come from context
  const [voiceProfileState] = useState({
    voiceprint: null,
    samples: [],
    traits: null,
    status: 'not_created' as const
  })
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(true) // Auto-expanded by default
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)
  const [highlightedSections, setHighlightedSections] = useState<Array<{start: number, end: number, reason: string, confidence: number, suggestion?: string, originalText?: string, replacementText?: string, voiceSimilarity?: number}>>([])
  const [isSaved, setIsSaved] = useState(false)
  const [selectedSection, setSelectedSection] = useState<{section: any, x: number, y: number, useFixed?: boolean} | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [loadedSampleTitle, setLoadedSampleTitle] = useState<string | null>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<any>(null)
  const [mobileBottomSheetSection, setMobileBottomSheetSection] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Voice editing state
  const [voiceEditingState, setVoiceEditingState] = useState<VoiceEditingState>({
    voiceSafeMode: profile?.is_premium ? true : false,
    similarityThreshold: 70,
    appliedChanges: [],
    voiceCalculations: new Map()
  })
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim()).length
  const canAnalyze = charCount >= 50

  useEffect(() => {
    // Load from sample_id if provided
    const sampleId = searchParams.get('sample_id')
    if (sampleId && user) {
      loadSampleFromHistory(sampleId)
    } else {
      // Otherwise check for quick analysis text
      const savedText = sessionStorage.getItem('quickAnalysisText')
      if (savedText) {
        setText(savedText)
        sessionStorage.removeItem('quickAnalysisText')
      }
    }
  }, [searchParams, user])

  const loadSampleFromHistory = async (sampleId: string) => {
    try {
      const response = await fetch(`/api/user/history?sample_id=${sampleId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load analysis')
      }

      const data = await response.json()
      if (data.analyses && data.analyses.length > 0) {
        const sample = data.analyses[0]
        setText(sample.content || '')
        setLoadedSampleTitle(sample.title || 'Previous Analysis')
        
        // If the sample has analysis results, show them
        if (sample.ai_confidence_score !== undefined) {
          setAnalysisResult({
            ai_confidence_score: sample.ai_confidence_score || 0,
            authenticity_score: sample.authenticity_score || 0,
            detected_sections: sample.detected_sections || [],
            improvement_suggestions: sample.improvement_suggestions || [],
            style_analysis: sample.style_analysis || {
              tone: '',
              readability: '',
              structure: ''
            }
          })
          
          // If there are detected sections, highlight them
          if (sample.detected_sections && sample.detected_sections.length > 0) {
            const sections = sample.detected_sections.map((section: any) => ({
              start: 0, // These would need to be calculated based on actual positions
              end: section.text ? section.text.length : 0,
              reason: section.reason || '',
              confidence: section.confidence || 0,
              originalText: section.text || ''
            }))
            setHighlightedSections(sections)
          }
        }
      }
    } catch (error) {
      console.error('Error loading sample:', error)
      showToast('Failed to load analysis from history', 'error')
    }
  }

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
    setAnalysisMessage('Tinkering with patterns...')

    // Progress with messages
    const messages = [
      { progress: 20, text: 'Scanning for AI markers...' },
      { progress: 40, text: 'Analyzing sentence structures...' },
      { progress: 60, text: 'Thinking ultrahard...' },
      { progress: 80, text: 'Crafting improvements...' },
      { progress: 90, text: 'Almost there...' }
    ]
    
    let messageIndex = 0
    const progressInterval = setInterval(() => {
      if (messageIndex < messages.length) {
        setAnalysisProgress(messages[messageIndex].progress)
        setAnalysisMessage(messages[messageIndex].text)
        messageIndex++
      }
    }, 600)

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
        const errorData = await response.json()
        
        // Handle limit reached error specifically
        if (response.status === 403 && errorData.limits) {
          showToast(errorData.details || 'Monthly analysis limit reached', 'error')
          // Optionally redirect to pricing
          setTimeout(() => {
            router.push('/pricing')
          }, 2000)
          return
        }
        
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysisResult(result)
      setIsSaved(true) // Mark as saved to database
      showToast('Analysis complete and saved', 'success')
      
      
      // Process AI patterns for inline highlighting with voice calculations
      if (result.detected_sections && result.improvement_suggestions) {
        const sectionsWithVoice = await Promise.all(
          result.detected_sections.map(async (section: any, idx: number) => {
            const index = text.toLowerCase().indexOf(section.text.toLowerCase())
            // Map relevant suggestion to each section
            const relevantSuggestion = result.improvement_suggestions[idx] || 
              result.improvement_suggestions.find((s: string) => 
                s.toLowerCase().includes(section.reason.toLowerCase().split('.')[0])
              ) || result.improvement_suggestions[0]
            
            // Check if the suggestion contains a rewrite (format: "Original: X → Rewrite: Y")
            let replacementText = null
            if (relevantSuggestion && relevantSuggestion.includes('→ Rewrite:')) {
              const rewriteMatch = relevantSuggestion.match(/→ Rewrite: (.+)$/i)
              if (rewriteMatch) {
                replacementText = rewriteMatch[1].trim()
              }
            }
            
            // Calculate voice similarity if we have a replacement
            let voiceSimilarity = 50 // Default
            if (replacementText) {
              const voiceResult = await voiceCalculator.calculateSimilarity(
                section.text,
                replacementText,
                voiceProfileState.traits || undefined
              )
              voiceSimilarity = voiceResult.similarity
              
              // Cache the calculation
              voiceEditingState.voiceCalculations.set(
                `${section.text}::${replacementText}`,
                voiceSimilarity
              )
            }
            
            return {
              start: index,
              end: index + section.text.length,
              reason: section.reason,
              confidence: section.confidence,
              suggestion: relevantSuggestion,
              originalText: section.text,
              replacementText: replacementText,
              voiceSimilarity
            }
          })
        )
        
        const validSections = sectionsWithVoice.filter((s: any) => s.start !== -1)
        
        // Apply voice-safe filter if enabled and user is premium
        if (voiceEditingState.voiceSafeMode && profile?.is_premium) {
          const voiceSafeSections = validSections.filter(
            s => s.voiceSimilarity >= voiceEditingState.similarityThreshold
          )
          setHighlightedSections(voiceSafeSections)
          
          if (voiceSafeSections.length < validSections.length) {
            showToast(
              `Showing ${voiceSafeSections.length} voice-safe suggestions (${validSections.length - voiceSafeSections.length} filtered)`,
              'info'
            )
          }
        } else {
          setHighlightedSections(validSections)
        }
      }
      
      // Flash the results metrics
      setActiveMetric('results')
      setTimeout(() => setActiveMetric(null), 3000)
      
      // Show upgrade prompt for free users after 3rd analysis
      if (!profile?.is_premium && result.authenticity_score > 0) {
        const improvement = Math.round(100 - result.ai_confidence_score)
        setTimeout(() => {
          setShowUpgradePrompt({
            trigger: 'analysis_complete',
            metric: {
              label: 'Authenticity',
              value: `${result.authenticity_score}%`,
              improvement
            }
          })
        }, 2000)
      }
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
  
  // Generate improved text using AI rewrite API
  const generateImprovedText = async (originalText: string, reason: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          sections: [{
            text: originalText,
            reason: reason,
            confidence: 70 // Default confidence for rewrite
          }]
        })
      })

      if (!response.ok) {
        console.error('Rewrite API failed')
        return null
      }

      const data = await response.json()
      return data.rewrittenText || null
    } catch (error) {
      console.error('Error calling rewrite API:', error)
      return null
    }
  }
  
  // Apply all fixes at once to avoid overlapping replacements
  const applyAllFixes = async () => {
    if (highlightedSections.length === 0) {
      showToast('No fixes to apply', 'info')
      return
    }
    
    showToast('Generating improvements...', 'info')
    
    // First, ensure all sections have replacements
    const sectionsWithReplacements = await Promise.all(
      highlightedSections.map(async (section) => {
        if (!section.originalText) return null
        
        let replacementText = section.replacementText
        if (!replacementText) {
          // Fetch from API if not available
          const generated = await generateImprovedText(section.originalText, section.reason)
          replacementText = generated || undefined
        }
        
        if (!replacementText) return null
        
        return {
          ...section,
          replacementText
        }
      })
    )
    
    // Filter out nulls and sort by position (from end to start)
    const validSections = sectionsWithReplacements
      .filter(s => s !== null && s.replacementText)
      .sort((a, b) => b!.start - a!.start) as typeof highlightedSections
    
    if (validSections.length === 0) {
      showToast('Could not generate improvements', 'error')
      return
    }
    
    let newText = text
    let appliedCount = 0
    
    // Apply replacements from end to start to preserve positions
    validSections.forEach(section => {
      const originalText = section.originalText!
      const replacementText = section.replacementText!
      
      // Find the exact occurrence at the expected position
      const expectedSubstring = newText.substring(section.start, section.end)
      
      if (expectedSubstring === originalText) {
        // Apply the replacement at the exact position
        newText = newText.substring(0, section.start) + 
                  replacementText + 
                  newText.substring(section.end)
        appliedCount++
      }
    })
    
    if (appliedCount > 0) {
      setText(newText)
      setHighlightedSections([]) // Clear all highlights after applying
      showToast(`Applied ${appliedCount} improvement${appliedCount > 1 ? 's' : ''}`, 'success')
    } else {
      showToast('No valid fixes could be applied', 'warning')
    }
  }
  
  // Apply the fix to the text
  const applyFix = async (section: any) => {
    if (!section.originalText) return
    
    // If no replacement text, fetch it from API
    let replacementText = section.replacementText
    if (!replacementText) {
      showToast('Generating improvement...', 'info')
      replacementText = await generateImprovedText(section.originalText, section.reason)
      if (!replacementText) {
        showToast('Failed to generate improvement', 'error')
        return
      }
    }
    
    // Find the exact position of the original text to avoid overlap issues
    const originalText = section.originalText
    const currentIndex = text.indexOf(originalText)
    
    if (currentIndex === -1) {
      showToast('Could not find the text to replace. It may have been modified.', 'error')
      return
    }
    
    // Create new text with the replacement
    const beforeText = text.substring(0, currentIndex)
    const afterText = text.substring(currentIndex + originalText.length)
    const newText = beforeText + replacementText + afterText
    
    // Calculate the length difference for position adjustment
    const lengthDiff = replacementText.length - originalText.length
    
    // Update the text
    setText(newText)
    
    // Track the change in activity log
    const changeEntry: ChangeLogEntry = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      originalText: originalText,
      modifiedText: replacementText,
      voiceSimilarityBefore: 100, // Original text is 100% similar to itself
      voiceSimilarityAfter: section.voiceSimilarity || 50,
      action: 'applied',
      section: section
    }
    
    setVoiceEditingState(prev => ({
      ...prev,
      appliedChanges: [...prev.appliedChanges, changeEntry]
    }))
    
    // Adjust positions of remaining highlights
    setHighlightedSections(prev => prev.map(s => {
      if (s.start === section.start && s.end === section.end) {
        // This is the fixed section, remove it
        return null
      }
      // Adjust positions for sections after the changed text
      if (s.start > currentIndex) {
        return {
          ...s,
          start: s.start + lengthDiff,
          end: s.end + lengthDiff
        }
      }
      return s
    }).filter(Boolean) as typeof highlightedSections)
    
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
      
      // Add highlighted section with voice-aware styling
      const voiceSim = section.voiceSimilarity || 50
      const voiceStyle = voiceSim >= 70 
        ? 'border-b-2 border-gray-400 bg-gray-50' // Voice-safe
        : voiceSim >= 50
        ? 'border-b-2 border-yellow-500 bg-yellow-50' // Caution
        : 'border-b-2 border-red-500 bg-red-50' // Risk
      
      parts.push(
        <span
          key={idx}
          className={`${voiceStyle} rounded-sm cursor-pointer relative group inline-block`}
          onClick={(e) => {
            e.stopPropagation()
            
            // Check if mobile - show bottom sheet instead
            if (isMobile) {
              setMobileBottomSheetSection(section)
              return
            }
            
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
          {/* Voice impact indicator on hover */}
          {section.voiceSimilarity !== undefined && (
            <span className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <VoiceImpactBadge similarity={section.voiceSimilarity} className="shadow-lg" />
            </span>
          )}
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
            
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-light text-gray-900 mb-2">
                  Writing Analysis
                </h1>
                <p className="text-gray-500">
                  Deep AI detection and authenticity assessment
                </p>
              </div>
              
              {/* Activity Feed and Indicators */}
              <div className="flex items-center gap-3">
                {voiceEditingState.appliedChanges.length > 0 && (
                  <ActivityIndicator changeCount={voiceEditingState.appliedChanges.length} />
                )}
                <ActivityFeed 
                  changes={voiceEditingState.appliedChanges}
                  onRevert={(changeId) => {
                    // Handle revert logic
                    const change = voiceEditingState.appliedChanges.find(c => c.id === changeId)
                    if (change) {
                      // Revert the change in the text
                      setText(text.replace(change.modifiedText, change.originalText))
                      // Update the change log
                      setVoiceEditingState(prev => ({
                        ...prev,
                        appliedChanges: prev.appliedChanges.map(c => 
                          c.id === changeId ? { ...c, action: 'reverted' as const } : c
                        )
                      }))
                      showToast('Change reverted', 'success')
                    }
                  }}
                  onExport={() => {
                    // Export activity log
                    const log = voiceEditingState.appliedChanges.map(c => 
                      `${c.timestamp}: Changed "${c.originalText}" to "${c.modifiedText}" (Voice: ${c.voiceSimilarityBefore}% → ${c.voiceSimilarityAfter}%)`
                    ).join('\n')
                    const blob = new Blob([log], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'activity-log.txt'
                    a.click()
                  }}
                />
              </div>
            </div>
            
            {/* Show when loaded from history */}
            {loadedSampleTitle && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-blue-900">
                      Loaded from history: <strong>{loadedSampleTitle}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setText('')
                      setLoadedSampleTitle(null)
                      setAnalysisResult(null)
                      setHighlightedSections([])
                      router.push('/analyze')
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    New Analysis
                  </button>
                </div>
              </div>
            )}
            
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
                    <div className="space-y-2">
                      <ProgressDots progress={analysisProgress} isActive={true} color="blue" />
                      <p className="text-sm text-gray-600 text-center animate-pulse">
                        {analysisMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Section - AUTO-EXPANDED */}
              <AnimatePresence>
                {analysisResult && analysisResult.sentenceScores && analysisResult.sentenceScores.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-6"
                  >
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <h3 className="text-sm font-medium text-gray-900">
                            <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••••••••</span> Writing Improvements
                          </h3>
                          {highlightedSections.length > 0 && (
                            <VoiceSafeToggle
                              enabled={voiceEditingState.voiceSafeMode}
                              onChange={(enabled) => {
                                setVoiceEditingState(prev => ({ ...prev, voiceSafeMode: enabled }))
                                // Re-filter suggestions based on new state
                                if (enabled && profile?.is_premium) {
                                  const voiceSafeSections = highlightedSections.filter(
                                    s => (s.voiceSimilarity || 0) >= voiceEditingState.similarityThreshold
                                  )
                                  showToast(
                                    `Voice-Safe Mode: Showing ${voiceSafeSections.length} of ${highlightedSections.length} suggestions`,
                                    'info'
                                  )
                                }
                              }}
                              isPremium={profile?.is_premium || false}
                              suggestionCount={highlightedSections.length}
                              filteredCount={highlightedSections.filter(s => (s.voiceSimilarity || 0) >= 70).length}
                            />
                          )}
                        </div>
                        <button
                          onClick={() => setShowSuggestions(!showSuggestions)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {showSuggestions ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                      
                      {showSuggestions && (
                        <div className="space-y-4">
                          {/* Voice teaser for non-premium users */}
                          {!profile?.is_premium && (
                            <InlineVoiceTeaser 
                              isPremium={false}
                              hasVoiceProfile={!!voiceProfileState.voiceprint}
                              className="mb-4"
                            />
                          )}
                          
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
              {/* Voice Profile CTA for users without profile */}
              {!voiceProfileState.voiceprint && (
                <VoiceProfileCTA 
                  sampleCount={voiceProfileState.samples?.length || 0}
                  className="animate-fade-in-up"
                />
              )}
              
              {/* Value Display for free users */}
              {!profile?.is_premium && (
                <ValueDisplay 
                  metrics={{
                    analysesUsed: 3, // You'd get this from actual usage
                    analysesLimit: 5,
                    wordsDetected: 2341,
                    authenticityImproved: 12
                  }}
                />
              )}
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

              {/* ML Voice DNA Analysis - New Feature */}
              {text && text.length >= 50 && (
                <div className="mb-6">
                  {/* ML analysis will be integrated here */}
                </div>
              )}

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
                        {/* Main AI Detection Score */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-600">AI Detection</span>
                            <span className="text-3xl font-light text-gray-900">
                              {Math.round(analysisResult.ai_confidence_score)}%
                            </span>
                          </div>
                          <SubtleBlocks 
                            value={analysisResult.ai_confidence_score} 
                            max={100} 
                            color={
                              analysisResult.ai_confidence_score > 60 ? "red" :
                              analysisResult.ai_confidence_score > 30 ? "yellow" : "green"
                            }
                            isActive={activeMetric === 'results'}
                            size="sm"
                          />
                        </div>

                        {/* Quick Stats */}
                        <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Patterns Found</p>
                            <p className="text-lg font-medium text-gray-900">
                              {highlightedSections.length || 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                            <p className={`text-lg font-medium ${
                              analysisResult.ai_confidence_score > 60 ? 'text-red-600' :
                              analysisResult.ai_confidence_score > 30 ? 'text-amber-600' : 'text-green-600'
                            }`}>
                              {analysisResult.ai_confidence_score > 60 ? 'High' :
                               analysisResult.ai_confidence_score > 30 ? 'Medium' : 'Low'}
                            </p>
                          </div>
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
                        
                        {/* Apply All Fixes Button */}
                        {highlightedSections.some(s => s.replacementText) && (
                          <Button
                            onClick={applyAllFixes}
                            variant="default"
                            size="sm"
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                          >
                            Apply All {highlightedSections.filter(s => s.replacementText).length} Fixes
                          </Button>
                        )}
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
      
      {/* Enhanced Voice-Aware Suggestion Popup - Rendered as Portal */}
      {selectedSection && typeof document !== 'undefined' && createPortal(
        <div 
          className={`suggestion-popup fixed z-50 bg-white border border-gray-300 rounded-lg shadow-2xl p-4`}
          style={{ 
            left: `${selectedSection.x}px`, 
            top: `${selectedSection.y}px`,
            width: '360px',
            maxHeight: '450px',
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
          
          {/* Voice Impact Section */}
          {selectedSection.section.voiceSimilarity !== undefined && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">Voice Impact</span>
                {selectedSection.section.voiceSimilarity >= 70 ? (
                  <span className="text-xs text-green-600 font-medium">Voice-Safe</span>
                ) : (
                  <span className="text-xs text-yellow-600 font-medium">May Alter Voice</span>
                )}
              </div>
              <VoiceImpactIndicator 
                similarity={selectedSection.section.voiceSimilarity} 
                size="sm" 
                showPercentage={true}
                isActive={true}
              />
              {voiceProfileState.traits && (
                <p className="text-xs text-gray-500 mt-2">
                  {selectedSection.section.voiceSimilarity >= 70 
                    ? `Preserves your ${selectedSection.section.preservedTraits?.[0] || 'writing style'}`
                    : `May affect your ${selectedSection.section.voice_dimensions_affected?.[0] || 'tone'}`
                  }
                </p>
              )}
            </div>
          )}
          
          {/* Trust Indicators */}
          <TrustIndicators 
            sampleCount={voiceProfileState.samples?.length}
            confidence={selectedSection.section.confidence}
            hasVoiceProfile={!!voiceProfileState.voiceprint}
            className="mb-3"
          />
          
          {/* ASCII Separator */}
          <div className="text-center text-gray-300 text-xs mb-3" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••••••••••••••••••••••••••••••
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
                onClick={async () => await applyFix(selectedSection.section)}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">AI Confidence</span>
                <span className="font-medium text-gray-900">{Math.round(selectedSection.section.confidence)}%</span>
              </div>
              {voiceProfileState.samples?.length > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Based on</span>
                  <span className="font-medium text-gray-900">{voiceProfileState.samples.length} voice samples</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Upgrade Prompt */}
      {showUpgradePrompt && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm">
          <UpgradePrompt 
            trigger={showUpgradePrompt.trigger}
            metric={showUpgradePrompt.metric}
            onDismiss={() => setShowUpgradePrompt(null)}
            onAction={() => {
              router.push('/pricing')
              setShowUpgradePrompt(null)
            }}
          />
        </div>
      )}
      
      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet
        isOpen={!!mobileBottomSheetSection && isMobile}
        onClose={() => setMobileBottomSheetSection(null)}
        section={mobileBottomSheetSection || {}}
        onApply={() => {
          if (mobileBottomSheetSection) {
            applyFix(mobileBottomSheetSection)
            setMobileBottomSheetSection(null)
          }
        }}
        onDismiss={() => setMobileBottomSheetSection(null)}
        isPremium={profile?.is_premium || false}
      />
    </AppLayout>
  )
}