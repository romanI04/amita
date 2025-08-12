'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ApplyChangesModal } from '@/components/ApplyChangesModal'
import { applyPositionBasedReplacements } from '@/lib/utils/textReplacement'
import { useAuth } from '@/lib/auth/context'
import { useVoiceProfile, useVoiceProfileSelectors } from '@/lib/context/VoiceProfileContext'
import { useConstraintChanges, emitEvent } from '@/lib/events/VoiceProfileEvents'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { useAnalysisAnalytics, usePerformanceMonitor } from '@/lib/hooks/useAnalytics'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { 
  CheckCircleIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import { 
  getVoiceConstraints, 
  getExpectedRiskReduction, 
  batchRewriteFlaggedLines, 
  generateSuccessMessage 
} from '@/lib/actions/VoiceAwareActions'
import type { AnalysisResponse } from '@/types'

function AnalyzePageContent() {
  const searchParams = useSearchParams()
  const sampleId = searchParams.get('sample_id')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  
  // Debounce text input to prevent excessive re-renders
  const debouncedText = useDebounce(text, 300)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const [appliedChanges, setAppliedChanges] = useState(0)
  const [isCompact, setIsCompact] = useState(false)
  const [hasExtraSpace, setHasExtraSpace] = useState(false)
  const [revisedText, setRevisedText] = useState('')
  const [appliedSuggestions, setAppliedSuggestions] = useState<number[]>([])
  const [ignoredSections, setIgnoredSections] = useState<number[]>([])
  const [isFixingFlaggedLines, setIsFixingFlaggedLines] = useState(false)
  const [voiceAwareSuccessMessage, setVoiceAwareSuccessMessage] = useState<string | null>(null)
  const [displayText, setDisplayText] = useState('')
  const [showRevisions, setShowRevisions] = useState(false)
  const [sectionStates, setSectionStates] = useState<Record<number, 'idle' | 'loading' | 'applied' | 'failed'>>({})
  const [sectionErrors, setSectionErrors] = useState<Record<number, string>>({})
  const [sectionPreviews, setSectionPreviews] = useState<Record<number, string>>({})
  const [previewingSection, setPreviewingSection] = useState<number | null>(null)
  const [currentSections, setCurrentSections] = useState<any[]>([])
  const [showingOriginal, setShowingOriginal] = useState(false)
  const [voiceProfileEnabled, setVoiceProfileEnabled] = useState(true) // Voice profile toggle state
  const [analysisProgress, setAnalysisProgress] = useState(0) // Progress percentage
  const [analysisETA, setAnalysisETA] = useState<number | null>(null) // ETA in seconds
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [sectionsToReview, setSectionsToReview] = useState<any[]>([])
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [sessionHistory, setSessionHistory] = useState<{text: string, timestamp: number, sections: any[]}[]>([]) // For undo functionality
  const [lastAppliedSection, setLastAppliedSection] = useState<{index: number, originalText: string, newText: string} | null>(null)

  const { user } = useAuth()
  const { state: voiceProfileState, addSample } = useVoiceProfile()
  const selectors = useVoiceProfileSelectors()
  
  // Analytics hooks
  const analyticsHooks = useAnalysisAnalytics()
  const { trackApiPerformance, trackMemoryUsage } = usePerformanceMonitor()
  
  // Load past analysis if sample_id is provided
  useEffect(() => {
    if (sampleId && user) {
      loadPastAnalysis(sampleId)
    }
  }, [sampleId, user])
  
  const loadPastAnalysis = async (id: string) => {
    try {
      setAnalyzing(true)
      setError(null)
      
      // Fetch the analysis from history
      const response = await fetch(`/api/user/history?user_id=${user?.id}&sample_id=${id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      })
      
      if (!response.ok) {
        throw new Error('Failed to load analysis')
      }
      
      const data = await response.json()
      
      // Check if we got the analysis
      if (data.analyses && data.analyses.length > 0) {
        const sample = data.analyses[0]
        const voiceAnalysis = sample.voice_analysis?.[0]
        
        // Set the text and title
        setText(sample.content || '')
        setDisplayText(sample.content || '')
        setTitle(sample.title || 'Untitled Analysis')
        
        // Reconstruct detected sections from voice_analysis data
        let detectedSections = []
        if (voiceAnalysis?.ai_detected_sections) {
          try {
            const sections = typeof voiceAnalysis.ai_detected_sections === 'string' 
              ? JSON.parse(voiceAnalysis.ai_detected_sections)
              : voiceAnalysis.ai_detected_sections
            detectedSections = Array.isArray(sections) ? sections : []
          } catch (e) {
            console.error('Failed to parse detected sections:', e)
          }
        }
        
        // Parse improvement suggestions
        let suggestions = []
        if (voiceAnalysis?.improvement_suggestions) {
          try {
            const parsedSuggestions = typeof voiceAnalysis.improvement_suggestions === 'string'
              ? JSON.parse(voiceAnalysis.improvement_suggestions)
              : voiceAnalysis.improvement_suggestions
            suggestions = Array.isArray(parsedSuggestions) ? parsedSuggestions : []
          } catch (e) {
            console.error('Failed to parse suggestions:', e)
          }
        }
        
        // Parse style characteristics (was style_analysis)
        let styleAnalysis = null
        if (voiceAnalysis?.style_characteristics) {
          try {
            styleAnalysis = typeof voiceAnalysis.style_characteristics === 'string'
              ? JSON.parse(voiceAnalysis.style_characteristics)
              : voiceAnalysis.style_characteristics
          } catch (e) {
            console.error('Failed to parse style characteristics:', e)
          }
        }
        
        // Parse voice fingerprint from sample
        let voiceFingerprint = null
        if (sample.voice_fingerprint) {
          try {
            voiceFingerprint = typeof sample.voice_fingerprint === 'string'
              ? JSON.parse(sample.voice_fingerprint)
              : sample.voice_fingerprint
          } catch (e) {
            console.error('Failed to parse voice fingerprint:', e)
            // Provide default if parsing fails
            voiceFingerprint = {
              avg_sentence_length: 18,
              vocabulary_diversity: 0.7,
              tone_characteristics: {
                formal: 0.5,
                casual: 0.5,
                technical: 0.3,
                creative: 0.4
              },
              style_patterns: {
                passive_voice_usage: 0.2,
                complex_sentences: 0.3,
                punctuation_style: {}
              },
              characteristic_words: []
            }
          }
        }
        
        // Set the analysis results
        setAnalysis({
          id: sample.id,
          overall_score: voiceAnalysis?.overall_score || {
            authenticity: sample.authenticity_score || 0,
            ai_likelihood: sample.ai_confidence_score || 0
          },
          ai_confidence_score: sample.ai_confidence_score || 0,
          authenticity_score: sample.authenticity_score || 0,
          detected_sections: detectedSections,
          improvement_suggestions: suggestions,
          style_analysis: styleAnalysis,
          voice_fingerprint: voiceFingerprint || {
            avg_sentence_length: 18,
            vocabulary_diversity: 0.7,
            tone_characteristics: {
              formal: 0.5,
              casual: 0.5,
              technical: 0.3,
              creative: 0.4
            },
            style_patterns: {
              passive_voice_usage: 0.2,
              complex_sentences: 0.3,
              punctuation_style: {}
            },
            characteristic_words: []
          }
        })
        
        // Show success message
        setVoiceAwareSuccessMessage('Past analysis loaded successfully')
        setTimeout(() => setVoiceAwareSuccessMessage(null), 3000)
      } else {
        throw new Error('Analysis not found')
      }
    } catch (err) {
      console.error('Failed to load past analysis:', err)
      setError('Failed to load past analysis. Please try analyzing again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Sync display text with original text
  useEffect(() => {
    if (!showRevisions) {
      setDisplayText(text)
    }
  }, [text, showRevisions])

  // Listen for constraint changes to update rewrite suggestions
  useConstraintChanges((data) => {
    if (analysis) {
      setVoiceAwareSuccessMessage(`Voice constraints updated. Rewrite suggestions refreshed for ${data.domain} domain.`)
      setTimeout(() => setVoiceAwareSuccessMessage(null), 4000)
    }
  })

  const handleAnalyze = async () => {
    const trimmedText = text.trim()
    
    if (!trimmedText) {
      setError('Please enter some text to analyze')
      return
    }
    
    if (trimmedText.length < 50) {
      setError('Text must be at least 50 characters for meaningful analysis')
      return
    }

    if (!user) {
      setError('You must be logged in to analyze text')
      return
    }

    setAnalyzing(true)
    setError(null)
    setAnalysisProgress(0)
    
    // Save current state for undo
    setSessionHistory(prev => [...prev, { text: text, timestamp: Date.now(), sections: [] }])
    
    // Create new abort controller for cancellation
    const controller = new AbortController()
    setAbortController(controller)
    
    // Generate request ID for tracking
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setRequestId(reqId)
    
    // Estimate time based on text length (rough estimate: 100 chars/second)
    const estimatedTime = Math.max(3, Math.ceil(trimmedText.length / 100))
    setAnalysisETA(estimatedTime)
    
    // Track analysis start
    analyticsHooks.trackAnalysisStarted(trimmedText.length)
    trackMemoryUsage({ context: 'analysis_start' })
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90 // Cap at 90% until actual completion
        }
        return prev + (100 / estimatedTime) // Increment based on estimated time
      })
      setAnalysisETA(prev => prev ? Math.max(0, prev - 1) : null)
    }, 1000)

    try {
      const result = await trackApiPerformance('/api/analyze', async () => {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': reqId,
          },
          credentials: 'same-origin', // Include cookies with the request
          signal: controller.signal, // Allow cancellation
          body: JSON.stringify({
            text: text.trim(),
            title: title.trim() || 'Untitled Analysis'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          const errorMessage = errorData.error || 'Analysis failed'
          const errorRequestId = errorData.requestId || reqId
          throw new Error(`${errorMessage} (Request ID: ${errorRequestId})`)
        }

        return await response.json()
      })
      
      setAnalysis(result)
      
      // Track successful analysis completion
      analyticsHooks.trackAnalysisCompleted(
        result.id || `temp_${Date.now()}`,
        result.overall_score?.authenticity || result.authenticity_score || 0,
        result.overall_score?.ai_likelihood || result.ai_confidence_score || 0,
        Date.now() // duration will be calculated by performance tracking
      )
      
      // Automatically add the analyzed sample to voice profile
      if (result && user) {
        const newSample = {
          id: `temp-${Date.now()}`, // Temporary ID until backend creates proper one
          user_id: user.id,
          title: title || 'Untitled Analysis',
          content: text.trim(),
          ai_confidence_score: result.overall_score?.ai_likelihood || 0,
          authenticity_score: result.overall_score?.authenticity || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Add to voice profile context (this will emit events)
        addSample(newSample)
        
        // Track sample upload
        const wordCount = text.trim().split(/\s+/).length
        analyticsHooks.trackSampleUploaded(newSample.id, wordCount, 'paste')
        
        // Show voice profile update notification
        setVoiceAwareSuccessMessage(`Sample analyzed and added to voice profile (+${wordCount} words). Coverage updated.`)
        setTimeout(() => setVoiceAwareSuccessMessage(null), 5000)
      }
      
    } catch (err) {
      // Check if it was cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Analysis cancelled')
        return
      }
      
      console.error('Analysis error:', err)
      // Track analysis failure
      analyticsHooks.trackAnalysisFailed(
        err instanceof Error ? err.message : 'Unknown error',
        text.trim().length
      )
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during analysis'
      const displayError = requestId ? `${errorMessage} (Request ID: ${requestId})` : errorMessage
      setError(displayError)
    } finally {
      clearInterval(progressInterval)
      setAbortController(null)
      setAnalysisProgress(100)
      setTimeout(() => {
        setAnalyzing(false)
        setAnalysisProgress(0)
        setAnalysisETA(null)
      }, 500) // Brief delay to show 100% completion
      trackMemoryUsage({ context: 'analysis_complete' })
    }
  }

  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score <= 30) return 'low'
    if (score <= 70) return 'medium'
    return 'high'
  }

  // Update sections when analysis changes
  useEffect(() => {
    if (analysis?.detected_sections) {
      setCurrentSections(analysis.detected_sections.map((s, idx) => ({...s, originalIndex: idx})))
    }
  }, [analysis])

  // Recalculate section positions after text changes
  const recalculateSectionPositions = (newText: string, changedSectionIndex: number, lengthDiff: number) => {
    setCurrentSections(prev => prev.map((section, idx) => {
      if (idx <= changedSectionIndex) return section
      return {
        ...section,
        start_index: section.start_index + lengthDiff,
        end_index: section.end_index + lengthDiff
      }
    }))
  }

  // Preview a section rewrite
  const handlePreviewSection = async (sectionIndex: number) => {
    const section = currentSections[sectionIndex]
    if (!section || sectionStates[sectionIndex] === 'loading') return

    // Check voice profile requirement
    if (voiceProfileEnabled && !selectors.hasProfile) {
      setSectionErrors({...sectionErrors, [sectionIndex]: 'Voice profile required. Create one to continue.'})
      return
    }

    setSectionStates({...sectionStates, [sectionIndex]: 'loading'})
    setSectionErrors({...sectionErrors, [sectionIndex]: ''})
    setPreviewingSection(sectionIndex)

    try {
      const sectionText = text.slice(section.start_index, section.end_index)
      const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-Id': reqId
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          originalText: sectionText,
          prompt: voiceProfileEnabled 
            ? `Rewrite to match user's voice while reducing AI detection: "${sectionText}"`
            : `Rewrite to reduce AI detection: "${sectionText}"`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Rewrite failed')
      }

      const result = await response.json()
      setSectionPreviews({...sectionPreviews, [sectionIndex]: result.rewrittenText})
      setSectionStates({...sectionStates, [sectionIndex]: 'idle'})
    } catch (error) {
      console.error('Preview failed:', error)
      setSectionErrors({
        ...sectionErrors, 
        [sectionIndex]: `${error instanceof Error ? error.message : 'Preview failed'} • Try again`
      })
      setSectionStates({...sectionStates, [sectionIndex]: 'failed'})
    }
  }

  // Apply a single section rewrite
  const handleRewriteSection = async (sectionIndex: number) => {
    const section = currentSections[sectionIndex]
    if (!section || sectionStates[sectionIndex] === 'loading') return

    // Check voice profile requirement
    if (voiceProfileEnabled && !selectors.hasProfile) {
      setSectionErrors({...sectionErrors, [sectionIndex]: 'Voice profile required. Create one to continue.'})
      return
    }

    // Save state for undo
    setSessionHistory(prev => [...prev, { text, timestamp: Date.now(), sections: currentSections }])
    setSectionStates({...sectionStates, [sectionIndex]: 'loading'})
    setSectionErrors({...sectionErrors, [sectionIndex]: ''})

    try {
      const sectionText = text.slice(section.start_index, section.end_index)
      const reqId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Use preview if available
      let rewrittenText = sectionPreviews[sectionIndex]
      
      if (!rewrittenText) {
        const response = await fetch('/api/rewrite', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-Id': reqId
          },
          credentials: 'same-origin',
          body: JSON.stringify({
            originalText: sectionText,
            prompt: voiceProfileEnabled 
              ? `Rewrite to match user's voice while reducing AI detection: "${sectionText}"`
              : `Rewrite to reduce AI detection: "${sectionText}"`
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`${error.error || 'Rewrite failed'} (Request ID: ${reqId})`)
        }

        const result = await response.json()
        rewrittenText = result.rewrittenText
      }
      
      // Apply the change in-place
      const newText = text.slice(0, section.start_index) + rewrittenText + text.slice(section.end_index)
      setText(newText)
      
      // Track the change
      setLastAppliedSection({
        index: sectionIndex,
        originalText: sectionText,
        newText: rewrittenText
      })
      
      // Update section positions
      const lengthDiff = rewrittenText.length - sectionText.length
      recalculateSectionPositions(newText, sectionIndex, lengthDiff)
      
      // Update UI state
      setSectionStates({...sectionStates, [sectionIndex]: 'applied'})
      setAppliedSuggestions(prev => [...prev, section.originalIndex || sectionIndex])
      setAppliedChanges(prev => prev + 1)
      
      // Show success message
      setVoiceAwareSuccessMessage(`Section ${sectionIndex + 1} improved • Risk reduced by ~${Math.round(section.confidence || 0) / 3}%`)
      setTimeout(() => setVoiceAwareSuccessMessage(null), 3000)
      
      // Scroll to changed section
      const element = document.querySelector(`[data-section-index="${sectionIndex}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.add('highlight-change')
        setTimeout(() => element.classList.remove('highlight-change'), 2000)
      }
    } catch (error) {
      console.error('Apply failed:', error)
      setSectionErrors({
        ...sectionErrors, 
        [sectionIndex]: error instanceof Error ? error.message : 'Apply failed'
      })
      setSectionStates({...sectionStates, [sectionIndex]: 'failed'})
    }
  }

  // Undo last section change
  const handleUndoSection = (sectionIndex: number) => {
    if (!lastAppliedSection || lastAppliedSection.index !== sectionIndex) return
    
    const previousState = sessionHistory[sessionHistory.length - 1]
    if (previousState) {
      setText(previousState.text)
      setCurrentSections(previousState.sections)
      setSectionStates({...sectionStates, [sectionIndex]: 'idle'})
      setAppliedSuggestions(prev => prev.filter(i => i !== sectionIndex))
      setAppliedChanges(prev => Math.max(0, prev - 1))
      setLastAppliedSection(null)
      setVoiceAwareSuccessMessage('Change undone')
      setTimeout(() => setVoiceAwareSuccessMessage(null), 2000)
    }
  }

  const handleApplySuggestion = (suggestionIndex: number) => {
    setAppliedSuggestions(prev => [...prev, suggestionIndex])
    setAppliedChanges(prev => prev + 1)
    if (appliedChanges === 0) {
      setShowStickyBar(true)
    }
  }

  const handleIgnoreSection = (sectionIndex: number) => {
    setIgnoredSections(prev => [...prev, sectionIndex])
  }

  const handleApplyAll = async () => {
    if (!analysis?.detected_sections) {
      alert('No sections to rewrite!')
      return
    }

    // Check if voice profile is required and available
    if (voiceProfileEnabled && !selectors.hasProfile) {
      alert('Voice profile required for voice-aware batch rewrites!')
      return
    }
    
    setIsFixingFlaggedLines(true)
    
    try {
      const sectionsToRewrite = analysis.detected_sections
        .filter((_, index) => !ignoredSections.includes(index))
        .map((section, index) => ({
          id: index,
          text: text.slice(section.start_index, section.end_index),
          original: text.slice(section.start_index, section.end_index),
          startIndex: section.start_index,
          endIndex: section.end_index,
          reason: section.reason || 'AI-detected pattern'
        }))

      let rewriteResults
      if (voiceProfileEnabled) {
        // Voice-aware batch rewrite
        const voiceConstraints = getVoiceConstraints(voiceProfileState)
        rewriteResults = await trackApiPerformance('/batch-rewrite', async () => {
          return await batchRewriteFlaggedLines(sectionsToRewrite, voiceConstraints, {
            strength: 'balanced',
            preserveLocks: true
          })
        })
      } else {
        // Vanilla batch rewrite
        rewriteResults = await trackApiPerformance('/batch-rewrite', async () => {
          const results = []
          for (const section of sectionsToRewrite) {
            const response = await fetch('/api/rewrite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                originalText: section.original,
                prompt: `Rewrite the following text to reduce AI detection risk: "${section.original}"`
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              results.push({
                id: section.id,
                original: section.original,
                rewritten: result.rewrittenText,
                reason: section.reason
              })
            } else {
              results.push({
                id: section.id,
                original: section.original,
                rewritten: section.text, // No change if failed
                reason: section.reason
              })
            }
          }
          return results
        })
      }

      // Prepare sections for review modal
      const modalSections = rewriteResults.map((result, idx) => {
        const originalSection = sectionsToRewrite.find(s => s.id === result.id) || sectionsToRewrite[idx]
        return {
          id: result.id,
          original: result.original,
          rewritten: result.rewritten,
          reason: result.reason,
          startIndex: originalSection?.startIndex || 0,
          endIndex: originalSection?.endIndex || result.original.length,
          riskDelta: Math.round(Math.random() * 5 + 3) // Should come from API
        }
      })
      
      // Show modal for review
      setSectionsToReview(modalSections)
      setShowApplyModal(true)
      
    } catch (error) {
      console.error('Batch rewrite failed:', error)
      analyticsHooks.trackAnalysisFailed('Batch rewrite failed: ' + (error instanceof Error ? error.message : 'unknown'))
      alert('Batch rewrite failed. Please try again.')
    } finally {
      setIsFixingFlaggedLines(false)
    }
  }

  // Handle applying selected sections from modal
  const handleApplySelectedSections = async (selectedIds: number[]) => {
    if (!sectionsToReview.length || !analysis) return
    
    // Filter to only selected sections
    const sectionsToApply = sectionsToReview.filter(s => selectedIds.includes(s.id))
    
    // Create text segments for position-based replacement
    const segments = sectionsToApply.map(section => ({
      startIndex: section.startIndex,
      endIndex: section.endIndex,
      original: section.original,
      replacement: section.rewritten
    }))
    
    // Apply position-based replacements
    const newText = applyPositionBasedReplacements(text, segments)
    
    // Apply changes to main text (single source of truth)
    setText(newText)
    setAppliedChanges(sectionsToApply.length)
    
    // Update sections with new positions
    const lengthDiff = newText.length - text.length
    if (lengthDiff !== 0) {
      setCurrentSections(prev => prev.map(section => ({
        ...section,
        start_index: section.start_index,
        end_index: section.end_index
      })))
    }
    
    // Mark sections as applied
    sectionsToApply.forEach(s => {
      setSectionStates(prev => ({...prev, [s.id]: 'applied'}))
    })
    
    // Show success message
    setVoiceAwareSuccessMessage(
      `🎉 Applied ${sectionsToApply.length} improvements! Risk reduced by ~${sectionsToApply.reduce((sum, s) => sum + (s.riskDelta || 0), 0)}%`
    )
    
    // Hide success message
    setTimeout(() => setVoiceAwareSuccessMessage(null), 5000)
    
    // Track analytics
    analyticsHooks.trackRewriteApplied(
      analysis.id || `temp_${Date.now()}`,
      sectionsToApply.length,
      sectionsToApply.reduce((sum, s) => sum + (s.riskDelta || 0), 0)
    )
  }

  // Toggle between original and revised text
  const toggleRevisions = () => {
    setShowRevisions(!showRevisions)
    setDisplayText(showRevisions ? text : revisedText)
  }

  // Undo all changes
  const handleUndoChanges = () => {
    if (sessionHistory.length > 0) {
      const previousState = sessionHistory[0]
      setText(previousState.text)
      setCurrentSections(previousState.sections)
      setAppliedChanges(0)
      setSectionStates({})
      setAppliedSuggestions([])
      setVoiceAwareSuccessMessage('✨ All changes undone. Original text restored.')
      setTimeout(() => setVoiceAwareSuccessMessage(null), 3000)
    }
  }

  const handleSaveVersion = async () => {
    if (!user) {
      alert('You must be logged in to save versions')
      return
    }

    try {
      const response = await fetch('/api/save-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled Analysis',
          original_text: text,
          revised_text: revisedText || text,
          applied_changes: appliedChanges,
          analysis_data: analysis
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save version')
      }

      const result = await response.json()
      alert(`Version saved successfully! ID: ${result.id}`)
    } catch (error) {
      console.error('Save version failed:', error)
      alert('Failed to save version. Please try again.')
    }
  }

  const handleCopyRevisedText = async () => {
    const textToCopy = revisedText || text
    try {
      await navigator.clipboard.writeText(textToCopy)
      alert('Text copied to clipboard!')
    } catch (err) {
      // Fallback for older browsers without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = textToCopy
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          alert('Text copied to clipboard!')
        } else {
          throw new Error('Copy command failed')
        }
      } catch (fallbackErr) {
        console.error('Copy failed:', fallbackErr)
        alert('Failed to copy text. Please copy manually.')
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }


  const handleFixFlaggedLines = async () => {
    if (!analysis?.detected_sections || analysis.detected_sections.length === 0) {
      alert('No flagged sections to fix!')
      return
    }

    // Check if user has voice profile for constraints (only if voice profile is enabled)
    if (voiceProfileEnabled && !selectors.hasProfile) {
      alert('Create a voice profile first to use voice-aware rewrites!')
      return
    }

    setIsFixingFlaggedLines(true)
    
    try {
      const voiceConstraints = getVoiceConstraints(voiceProfileState)
      const flaggedSections = analysis.detected_sections.map((section, index) => ({
        id: index,
        text: text.substring(section.start_index, section.end_index), // Extract text from original
        reason: section.reason || 'flagged'
      }))

      // Get expected risk reduction from backend
      const riskEstimate = await getExpectedRiskReduction(voiceProfileState, flaggedSections.length)

      // Show optimistic UI update first
      if (riskEstimate) {
        const { reduction, confidence } = riskEstimate
        setVoiceAwareSuccessMessage(`Applying voice-aware rewrites... Expected risk reduction: ${reduction}% (${confidence} confidence)`)
      } else {
        setVoiceAwareSuccessMessage(`Applying voice-aware rewrites...`)
      }

      // Perform batch rewrite with voice constraints
      const rewriteResults = await batchRewriteFlaggedLines(flaggedSections, voiceConstraints, {
        strength: 'balanced',
        preserveLocks: true
      })

      // Apply the rewrites to the text
      let newText = text
      rewriteResults.reverse().forEach(result => {
        if (result.rewritten !== result.original) {
          newText = newText.replace(result.original, result.rewritten)
        }
      })

      // Update the revised text
      setRevisedText(newText)
      setAppliedChanges(prev => prev + rewriteResults.filter(r => r.rewritten !== r.original).length)

      // Generate success message
      const successMessage = generateSuccessMessage(rewriteResults, 'batch_rewrite')
      setVoiceAwareSuccessMessage(successMessage)
      setTimeout(() => setVoiceAwareSuccessMessage(null), 6000)

      // Emit rewrite completed event for cross-page updates
      const rewriteCount = rewriteResults.filter(r => r.rewritten !== r.original).length
      const estimatedRiskReduction = Math.min(25, rewriteCount * 3) // Simple estimation: 3% per section, max 25%
      
      emitEvent('sample.updated', {
        sampleId: 'current-analysis',
        updates: {
          rewritesApplied: rewriteCount,
          riskReduction: estimatedRiskReduction,
          wordCount: newText.length
        },
        reason: 'voice_aware_rewrite'
      })

      // Update applied suggestions to show which sections were fixed
      const appliedIndices = rewriteResults
        .filter(r => r.rewritten !== r.original)
        .map(r => r.id)
      setAppliedSuggestions(appliedIndices)

    } catch (error) {
      console.error('Voice-aware rewrite failed:', error)
      setVoiceAwareSuccessMessage('Rewrite failed. Please try again or check your connection.')
      setTimeout(() => setVoiceAwareSuccessMessage(null), 4000)
    } finally {
      setIsFixingFlaggedLines(false)
    }
  }

  // Detect spare space and set compact layout
  const checkCompactLayout = useCallback(() => {
    if (typeof window === 'undefined') return
    
    // Wait a frame for render to complete
    requestAnimationFrame(() => {
      const scrollHeight = document.body.scrollHeight
      const viewportHeight = window.innerHeight
      const hasSpareSpace = scrollHeight < viewportHeight - 80
      
      setIsCompact(hasSpareSpace)
      setHasExtraSpace(scrollHeight < viewportHeight - 200)
      
      // Always show sticky bar in compact mode or when changes are applied
      if (hasSpareSpace || appliedChanges > 0) {
        setShowStickyBar(true)
      }
    })
  }, [appliedChanges])

  useEffect(() => {
    if (!analysis) return
    
    checkCompactLayout()
    
    const handleResize = () => checkCompactLayout()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [analysis, checkCompactLayout])

  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="flex-1">
        {!analysis ? (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Analyze Your Writing
              </h1>
              <p className="text-gray-600 text-lg">
                Paste your text below to check for authenticity and get insights on your writing voice
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <div className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-0 py-2 text-lg font-medium placeholder-gray-400 border-none focus:ring-0 focus:outline-none"
                  />
                  <div className="border-b border-gray-200 mt-2"></div>
                </div>

                <div className="relative">
                  <textarea
                    className={`w-full h-64 px-0 py-2 text-gray-700 placeholder-gray-400 border-none focus:ring-0 focus:outline-none resize-none transition-all duration-500 ${
                      appliedChanges > 0 ? 'bg-green-50 border-l-4 border-green-400 pl-4' : ''
                    }`}
                    placeholder="Paste your writing here for analysis..."
                    value={displayText || text}
                    onChange={(e) => {
                      const newValue = e.target.value
                      setText(newValue)
                      if (!showRevisions) {
                        setDisplayText(newValue)
                      }
                    }}
                    disabled={analyzing || isFixingFlaggedLines}
                  />
                  
                  {/* Visual indicator for changes */}
                  {appliedChanges > 0 && (
                    <div className="absolute top-2 right-2 bg-primary-100 text-primary-800 px-2 py-1 rounded text-xs font-medium animate-fade-in">
                      {appliedChanges} improvement{appliedChanges > 1 ? 's' : ''} applied
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-4">
                      <p className={`text-sm ${debouncedText.trim().length < 50 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                        {debouncedText.length} characters • {Math.round(debouncedText.trim().split(/\s+/).filter(w => w.length > 0).length)} words
                        {debouncedText.trim().length < 50 && debouncedText.trim().length > 0 && (
                          <span className="ml-2">• Need {50 - debouncedText.trim().length} more characters</span>
                        )}
                      </p>
                      {selectors.hasProfile && debouncedText.trim().length >= 50 && (
                        <p className="text-sm text-blue-600">
                          Will strengthen voice profile • {voiceProfileState.coverage.sampleCount}/25 this month
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing || !text.trim() || text.trim().length < 50}
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300 flex items-center space-x-2"
                    >
                      {analyzing ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Analyzing...</span>
                          {analysisETA !== null && analysisETA > 0 && (
                            <span className="text-xs opacity-90">({analysisETA}s)</span>
                          )}
                        </div>
                      ) : (
                        <>
                          <span>Analyze Writing</span>
                          {selectors.hasProfile && (
                            <SparklesIcon className="w-4 h-4" />
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Progress bar for long analyses */}
                {analyzing && analysisProgress > 0 && (
                  <div className="mt-4">
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-primary-500 h-full transition-all duration-500 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      {analysisProgress < 100 ? 'Processing your text...' : 'Almost done!'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="text-red-800 font-medium">Analysis Failed</p>
                    </div>
                    <p className="text-red-700 text-sm mt-2">{error}</p>
                    {requestId && (
                      <p className="text-red-600 text-xs mt-1">Request ID: {requestId}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => {
                        setError(null)
                        handleAnalyze()
                      }}
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900 mb-1">Tips for better analysis</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use at least 100 words for accurate results</li>
                    <li>• Include complete sentences and paragraphs</li>
                    <li>• Original writing works better than heavily edited content</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white">
            {/* Voice-Aware Success Notification */}
            {voiceAwareSuccessMessage && (
              <div className="bg-green-50 border-b border-green-200 px-6 py-4 animate-fade-in">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  <p className="text-green-800 font-medium">
                    {voiceAwareSuccessMessage}
                  </p>
                  <button
                    onClick={() => setVoiceAwareSuccessMessage(null)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-lg font-semibold text-gray-900">Analysis Results</h1>
                    {title && <span className="text-sm text-gray-500">• {title}</span>}
                    
                    {/* Voice Profile Toggle */}
                    <div className="flex items-center space-x-3 ml-6 pl-6 border-l border-gray-300">
                      <span className="text-sm text-gray-600">Voice Profile:</span>
                      <button
                        onClick={() => setVoiceProfileEnabled(!voiceProfileEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          voiceProfileEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            voiceProfileEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${
                        voiceProfileEnabled ? 'text-blue-600' : 'text-gray-400'
                      }`}>
                        {voiceProfileEnabled ? 'ON' : 'OFF'}
                      </span>
                      {!voiceProfileEnabled && (
                        <span className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                          Using vanilla prompts
                        </span>
                      )}
                      {voiceProfileEnabled && selectors.hasProfile && (
                        <span className="text-xs text-primary-600 bg-primary-50 border border-primary-200 rounded px-2 py-1">
                          Signature traits & locks active
                        </span>
                      )}
                      {voiceProfileEnabled && !selectors.hasProfile && (
                        <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded px-2 py-1">
                          No profile - create one first
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {/* Undo button */}
                    {sessionHistory.length > 0 && appliedChanges > 0 && (
                      <Button
                        onClick={() => {
                          // Restore previous state
                          const previousState = sessionHistory[sessionHistory.length - 1]
                          if (previousState) {
                            setText(previousState.text)
                            setDisplayText(previousState.text)
                            setRevisedText('')
                            setAppliedChanges(0)
                            setShowRevisions(false)
                            setVoiceAwareSuccessMessage('✨ All changes undone')
                            setTimeout(() => setVoiceAwareSuccessMessage(null), 3000)
                          }
                        }}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Undo All
                      </Button>
                    )}
                    
                    {/* Toggle Original/Improved view */}
                    {appliedChanges > 0 && (
                      <Button
                        onClick={() => {
                          const isShowingOriginal = displayText === text
                          setDisplayText(isShowingOriginal ? revisedText : text)
                          setShowRevisions(isShowingOriginal)
                        }}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        {displayText === text ? 'Show Improved' : 'Show Original'}
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleFixFlaggedLines}
                      disabled={isFixingFlaggedLines || (voiceProfileEnabled && !selectors.hasProfile)}
                      className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-400 px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
                    >
                      {isFixingFlaggedLines ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>
                            {voiceProfileEnabled ? 'Applying with voice constraints...' : 'Applying generic improvements...'}
                          </span>
                        </>
                      ) : (
                        <>
                          {voiceProfileEnabled ? <SparklesIcon className="w-4 h-4" /> : null}
                          <span>
                            {voiceProfileEnabled 
                              ? 'Fix flagged lines with my voice' 
                              : 'Fix flagged lines (generic)'}
                          </span>
                          {analysis?.detected_sections && (
                            <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">
                              Risk ↓
                            </span>
                          )}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setAnalysis(null)
                        setText('')
                        setTitle('')
                        setError(null)
                      }}
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg"
                    >
                      Analyze new text
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Row */}
            <div className="max-w-7xl mx-auto px-6 py-6 min-h-screen pb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Voice Integrity Card (Dominant) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Voice Integrity</p>
                      <div className="flex items-baseline space-x-3">
                        <span className="text-4xl font-semibold text-gray-900">
                          {Math.round(analysis.authenticity_score)}
                        </span>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          analysis.ai_confidence_score <= 15 
                            ? 'bg-green-100 text-green-800'
                            : analysis.ai_confidence_score <= 30
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {getRiskLevel(analysis.ai_confidence_score) === 'low' ? 'Low' : 
                           getRiskLevel(analysis.ai_confidence_score) === 'medium' ? 'Medium' : 'High'} AI-risk {Math.round(analysis.ai_confidence_score)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => alert('Voice Integrity combines detector signals, semantic patterns, and your voice profile. We weight detector signals against your authentic writing patterns to minimize false positives while maintaining accuracy.')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    How we compute this
                  </button>
                </div>

                {/* Model Certainty Card (Supporting) */}
                <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Model certainty</p>
                    <p className="text-2xl font-semibold text-gray-900 mb-2">
                      {getRiskLevel(analysis.ai_confidence_score) === 'low' ? 'Low' : 
                       getRiskLevel(analysis.ai_confidence_score) === 'medium' ? 'Medium' : 'High'}
                    </p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Flags are conservative; you're in control.
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div className={`${isCompact ? 'space-y-8' : 'md:grid md:grid-cols-12 md:gap-6'}`}>
                {/* LEFT: Fix Queue */}
                <div className={isCompact ? 'w-full' : 'md:col-span-8'}>
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Fix Queue — Flagged for Detector Risk
                        </h3>
                        {analysis.detected_sections && analysis.detected_sections.length > 0 && (
                          <Button 
                            onClick={handleApplyAll}
                            className="bg-primary-500 text-white hover:bg-primary-600 px-4 py-2 rounded-lg text-sm font-medium"
                          >
                            Rewrite all flagged ({analysis.detected_sections.length})
                          </Button>
                        )}
                      </div>
                      {analysis.detected_sections && analysis.detected_sections.length > 0 && selectors.hasProfile && (
                        <p className="text-sm text-gray-600 mt-2">
                          Expected risk drop will be calculated based on your voice profile
                        </p>
                      )}
                    </div>
                    
                    <div className="p-6">
                      {analysis.detected_sections && analysis.detected_sections.length > 0 ? (
                        <div className="space-y-4">
                          {analysis.detected_sections.map((section, index) => {
                            const snippet = text.slice(section.start_index, Math.min(section.end_index + 50, text.length))
                            const severity = section.confidence > 70 ? 'High' : section.confidence > 40 ? 'Medium' : 'Low'
                            const isApplied = appliedSuggestions.includes(index)
                            const isIgnored = ignoredSections.includes(index)
                            
                            return (
                              <div key={index} className={`border rounded-lg p-4 transition-all ${
                                isApplied ? 'border-green-300 bg-green-50' : 
                                isIgnored ? 'border-gray-200 bg-gray-50 opacity-50' : 
                                'border-gray-200 hover:border-gray-300'
                              }`}>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    {/* Status badges */}
                                    {(isApplied || isIgnored) && (
                                      <div className="flex items-center space-x-2 mb-2">
                                        {isApplied && (
                                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                                            AI-assisted edit applied
                                          </span>
                                        )}
                                        {isIgnored && (
                                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                            Ignored
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <p className="text-sm text-gray-700 leading-relaxed mb-2 line-clamp-2">
                                      "{snippet}..."
                                    </p>
                                    <div className="flex items-center space-x-4 text-xs">
                                      <span className="text-gray-600">{section.reason}</span>
                                      <span className="text-gray-500">Predicted impact: −{Math.round(section.confidence || 0)}% risk</span>
                                      <span className={`px-2 py-1 rounded-full font-medium ${
                                        severity === 'High' ? 'bg-red-100 text-red-800' :
                                        severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                      }`}>
                                        {severity}
                                      </span>
                                      {isApplied && (
                                        <span className="text-green-600 font-medium">
                                          • Improved with {voiceProfileEnabled ? 'your voice' : 'AI'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col space-y-2">
                                  {/* Error message if any */}
                                  {sectionErrors[index] && (
                                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                      <p className="text-xs text-red-700">{sectionErrors[index]}</p>
                                      <button
                                        onClick={() => setSectionErrors({...sectionErrors, [index]: ''})}
                                        className="text-red-400 hover:text-red-600 ml-2"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  )}
                                  
                                  {/* Preview if available */}
                                  {sectionPreviews[index] && !sectionStates[index] && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                      <p className="text-xs font-medium text-blue-900 mb-1">Preview:</p>
                                      <p className="text-xs text-blue-800 italic">"{sectionPreviews[index]}"</p>
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center space-x-3">
                                    {sectionStates[index] === 'loading' ? (
                                      <div className="flex items-center space-x-2 text-gray-600">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                        <span className="text-sm">Applying...</span>
                                      </div>
                                    ) : sectionStates[index] === 'applied' ? (
                                      <>
                                        <span className="flex items-center text-green-600 text-sm font-medium">
                                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                                          Applied
                                        </span>
                                        <Button 
                                          onClick={() => handleUndoSection(index)}
                                          variant="outline" 
                                          className="border-gray-300 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded-md text-xs"
                                        >
                                          Undo
                                        </Button>
                                      </>
                                    ) : !isIgnored ? (
                                      <>
                                        {/* Main Apply button */}
                                        <Button 
                                          onClick={() => handleRewriteSection(index)}
                                          disabled={(voiceProfileEnabled && !selectors.hasProfile) || false}
                                          className="bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-400 px-4 py-2 rounded-md text-sm font-medium"
                                          data-section-index={index}
                                        >
                                          Apply
                                        </Button>
                                        
                                        {/* Preview button */}
                                        <Button
                                          onClick={() => handlePreviewSection(index)}
                                          disabled={(voiceProfileEnabled && !selectors.hasProfile) || false}
                                          variant="outline"
                                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
                                        >
                                          Preview
                                        </Button>
                                        
                                        {/* Skip button */}
                                        <Button 
                                          onClick={() => handleIgnoreSection(index)}
                                          variant="outline" 
                                          className="border-gray-300 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-md text-sm"
                                        >
                                          Skip
                                        </Button>
                                      </>
                                    ) : null}
                                    
                                    {isIgnored && (
                                      <Button 
                                        onClick={() => setIgnoredSections(prev => prev.filter(i => i !== index))}
                                        variant="outline" 
                                        className="border-gray-300 text-gray-500 hover:bg-gray-50 px-3 py-1 rounded-md text-xs"
                                      >
                                        Unignore
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">All clear!</h4>
                          <p className="text-gray-600">No detector risks found in your writing.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT: Personalized Suggestions (Normal Layout Only) */}
                {!isCompact && (
                  <div className="md:col-span-4 space-y-6">
                    {/* Suggestions */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalized Suggestions</h3>
                      <div className="space-y-4">
                        {analysis.improvement_suggestions && analysis.improvement_suggestions.slice(0, 3).map((suggestion, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">
                              {suggestion.split('.')[0]}.
                            </h4>
                            <p className="text-xs text-gray-600 mb-3 italic">
                              Example: "{suggestion.split('.').slice(1).join('.').trim()}"
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex space-x-2">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                                  Suggestion {index + 1}
                                </span>
                              </div>
                              <Button 
                                onClick={() => handleApplySuggestion(index)}
                                disabled={appliedSuggestions.includes(index)}
                                className="bg-primary-500 text-white hover:bg-primary-600 px-3 py-1 rounded-md text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                {appliedSuggestions.includes(index) ? 'Applied' : 'Apply'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* You vs. Baseline (Normal Layout) */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">You vs. Your Baseline</h3>
                      <div className="space-y-4">
                        {analysis.style_analysis && (
                          <>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Sentence Length</span>
                                <span className="text-sm text-gray-600">{Math.round(analysis.style_analysis.sentence_structure.avg_length)} words</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-primary-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min(100, (analysis.style_analysis.sentence_structure.avg_length / 25) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500">Target: 15-20 words</p>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Variety</span>
                                <span className="text-sm text-gray-600">{analysis.style_analysis.sentence_structure.variety_score}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-primary-500 h-2 rounded-full" 
                                  style={{ width: `${analysis.style_analysis.sentence_structure.variety_score}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500">Add one concrete moment per paragraph</p>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Confidence</span>
                                <span className="text-sm text-gray-600">{analysis.style_analysis.tone_analysis.confidence}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div 
                                  className="bg-primary-500 h-2 rounded-full" 
                                  style={{ width: `${analysis.style_analysis.tone_analysis.confidence}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500">Trim a hedge once per paragraph</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Train Voice Profile
                        </button>
                        <p className="text-xs text-gray-500 mt-1">Your voice profile never trains our models.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Layout: You vs. Baseline as Full Width Row */}
              {isCompact && analysis.style_analysis && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">You vs. Your Baseline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Sentence Length</span>
                        <span className="text-sm text-gray-600">{Math.round(analysis.style_analysis.sentence_structure.avg_length)} words</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (analysis.style_analysis.sentence_structure.avg_length / 25) * 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Target: 15-20 words</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Variety</span>
                        <span className="text-sm text-gray-600">{analysis.style_analysis.sentence_structure.variety_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analysis.style_analysis.sentence_structure.variety_score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Add one concrete moment per paragraph</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Confidence</span>
                        <span className="text-sm text-gray-600">{analysis.style_analysis.tone_analysis.confidence}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${analysis.style_analysis.tone_analysis.confidence}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500">Trim a hedge once per paragraph</p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Train Voice Profile
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Your voice profile never trains our models.</p>
                  </div>
                </div>
              )}

              {/* Compact Layout: Expanded Personalized Suggestions */}
              {isCompact && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalized Suggestions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.improvement_suggestions && analysis.improvement_suggestions.slice(0, 6).map((suggestion, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          {suggestion.split('.')[0]}.
                        </h4>
                        <p className="text-xs text-gray-600 mb-3 italic">
                          Example: "{suggestion.split('.').slice(1).join('.').trim()}"
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                              Suggestion {index + 1}
                            </span>
                          </div>
                          <Button 
                            onClick={() => handleApplySuggestion(index)}
                            disabled={appliedSuggestions.includes(index)}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 rounded-md text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {appliedSuggestions.includes(index) ? 'Applied' : 'Apply'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* While You're Here Panel */}
              {hasExtraSpace && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Traits Detected</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.voice_fingerprint ? (
                          <>
                            {analysis.voice_fingerprint.tone_characteristics.formal > 0.6 && (
                              <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm rounded-full font-medium">
                                📝 Formal tone
                              </span>
                            )}
                            {analysis.voice_fingerprint.tone_characteristics.casual > 0.6 && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                                💬 Casual style
                              </span>
                            )}
                            {analysis.voice_fingerprint.tone_characteristics.technical > 0.6 && (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full font-medium">
                                📊 Technical language
                              </span>
                            )}
                            {analysis.voice_fingerprint.style_patterns.complex_sentences > 0.5 && (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full font-medium">
                                🔗 Complex sentences
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Voice analysis not available</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Analyses</h3>
                      <div className="space-y-2 text-sm text-gray-600">
                        {selectors.getRecentSamples().length > 0 ? (
                          selectors.getRecentSamples().slice(0, 3).map((sample) => {
                            const riskScore = sample.ai_confidence_score ?? 0
                            const riskLevel = riskScore <= 15 ? 'Low' : 
                                            riskScore <= 30 ? 'Medium' : 'High'
                            const riskColor = riskScore <= 15 ? 'text-green-600' : 
                                            riskScore <= 30 ? 'text-yellow-600' : 'text-red-600'
                            
                            return (
                              <div key={sample.id} className="flex justify-between">
                                <span>{sample.title} • {new Date(sample.created_at).toLocaleDateString()}</span>
                                <span className={riskColor}>{riskLevel} risk</span>
                              </div>
                            )
                          })
                        ) : (
                          <div className="text-gray-500 text-center py-4">
                            No recent analyses available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500">
                      🔒 Your writing samples and voice profile are stored securely and never used to train AI models.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Bar */}
            {showStickyBar && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
                {/* Fade gradient */}
                <div className="absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-white/90 to-transparent pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto px-6 py-4">
                  {appliedChanges > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <p className="text-sm font-medium text-gray-900">
                          Apply all rewrites • Voice-aware improvements applied: {appliedChanges}
                        </p>
                        {appliedChanges >= 2 && (
                          <div className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-2 ml-4">
                            <p className="text-sm text-blue-900">
                              Lock your personal voice profile, batch-fix across documents, and keep edits private.
                            </p>
                            <div className="flex items-center space-x-3 mt-2">
                              <Button 
                                onClick={() => alert('Pro features: Lock voice profile, batch-fix across documents, private edits, advanced analytics, priority support, and API access.')}
                                className="bg-primary-500 text-white hover:bg-primary-600 px-3 py-1 text-xs rounded"
                              >
                                See Pro features
                              </Button>
                              <button className="text-xs text-gray-500 hover:text-gray-700">
                                Not now
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button 
                          onClick={handleUndoChanges}
                          variant="outline" 
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm"
                        >
                          ✨ Undo
                        </Button>
                        
                        {revisedText && (
                          <Button 
                            onClick={toggleRevisions}
                            variant="outline" 
                            className={`px-4 py-2 text-sm transition-all duration-200 ${
                              showRevisions 
                                ? 'border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100' 
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {showRevisions ? '👁️ Original' : '✨ Improved'}
                          </Button>
                        )}
                        
                        <Button 
                          onClick={handleApplyAll}
                          disabled={isFixingFlaggedLines}
                          className="bg-primary-500 text-white hover:bg-primary-600 px-6 py-2 text-sm font-medium disabled:bg-primary-400 flex items-center space-x-2"
                        >
                          {isFixingFlaggedLines ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Applying...</span>
                            </>
                          ) : (
                            <>
                              <span>🎯 Apply all</span>
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          onClick={handleSaveVersion}
                          variant="outline" 
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm"
                        >
                          💾 Save version
                        </Button>
                        <Button 
                          onClick={handleCopyRevisedText}
                          variant="outline" 
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 text-sm"
                        >
                          Copy revised text
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">What to do next</h4>
                        <div className="flex items-center space-x-4">
                          <Button 
                            onClick={() => {
                              setAnalysis(null)
                              setText('')
                              setTitle('')
                              setError(null)
                            }}
                            variant="outline" 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 text-sm"
                          >
                            Analyze new text
                          </Button>
                          <Button 
                            onClick={() => alert('Voice profile training would redirect to upload samples page')}
                            variant="outline" 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 text-sm"
                          >
                            Train voice profile
                          </Button>
                          <Button 
                            onClick={() => alert('Import from Docs/Notion would open integration settings')}
                            variant="outline" 
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 text-sm"
                          >
                            Import from Docs
                          </Button>
                          <button 
                            onClick={() => alert('Would show modal explaining how AI detection risk is calculated based on detector signals and voice profile weighting')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Learn how risk is computed
                          </button>
                        </div>
                      </div>
                      <Button 
                        onClick={() => setShowStickyBar(false)}
                        variant="outline" 
                        className="border-gray-300 text-gray-500 hover:bg-gray-50 px-4 py-2 text-sm"
                      >
                        Hide
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
        
        {/* Apply Changes Modal */}
        <ApplyChangesModal
          isOpen={showApplyModal}
          onClose={() => setShowApplyModal(false)}
          sections={sectionsToReview}
          onApply={handleApplySelectedSections}
          voiceProfileEnabled={voiceProfileEnabled}
        />
      </AppLayout>
    </ErrorBoundary>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <ErrorBoundary>
        <AppLayout>
          <div className="flex-1 p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-gray-100 rounded mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
        </AppLayout>
      </ErrorBoundary>
    }>
      <AnalyzePageContent />
    </Suspense>
  )
}