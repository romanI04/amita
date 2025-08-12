'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { ArrowPathIcon, DocumentDuplicateIcon, CheckCircleIcon, XMarkIcon, EyeIcon, EyeSlashIcon, SparklesIcon, ArrowUturnLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { useSearchParams } from 'next/navigation'
import type { WritingSample, VoiceAnalysis, AIDetectedSection } from '@/types'

interface SectionState {
  status: 'idle' | 'previewing' | 'applying' | 'applied' | 'failed'
  rewrittenText?: string
  error?: string
}

export default function AnalyzePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const searchParams = useSearchParams()
  const editorRef = useRef<HTMLTextAreaElement>(null)
  
  // Main text state - single source of truth
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [sections, setSections] = useState<AIDetectedSection[]>([])
  const [sectionStates, setSectionStates] = useState<Record<number, SectionState>>({})
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set())
  const [showReviewPanel, setShowReviewPanel] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)
  const [requestId, setRequestId] = useState<string>('')
  
  // Load past analysis if sample_id is present
  useEffect(() => {
    const sampleId = searchParams.get('sample_id')
    if (sampleId) {
      loadPastAnalysis(sampleId)
    }
  }, [searchParams])

  const loadPastAnalysis = async (id: string) => {
    try {
      const response = await fetch(`/api/user/history?sample_id=${id}`)
      if (!response.ok) throw new Error('Failed to load analysis')
      
      const data = await response.json()
      if (data.analyses && data.analyses.length > 0) {
        const sample = data.analyses[0]
        setText(sample.content || '')
        setOriginalText(sample.content || '')
        
        // Reconstruct analysis from voice_analysis
        if (sample.voice_analysis && sample.voice_analysis.length > 0) {
          const voiceAnalysis = sample.voice_analysis[0]
          const reconstructedAnalysis = {
            ai_confidence_score: sample.ai_confidence_score || voiceAnalysis.overall_score?.ai_likelihood || 0,
            authenticity_score: sample.authenticity_score || voiceAnalysis.overall_score?.authenticity || 0,
            voice_fingerprint: sample.voice_fingerprint || null,
            detected_sections: voiceAnalysis.ai_detected_sections || [],
            improvement_suggestions: voiceAnalysis.improvement_suggestions || [],
            style_analysis: voiceAnalysis.style_characteristics || {}
          }
          setAnalysis(reconstructedAnalysis)
          setSections(voiceAnalysis.ai_detected_sections || [])
          
          // Initialize all sections as selected for review
          const initialSelected = new Set<number>(voiceAnalysis.ai_detected_sections?.map((_: any, i: number) => i) || [])
          setSelectedSections(initialSelected)
        }
        
        showToast('Past analysis loaded', 'success')
      }
    } catch (error) {
      console.error('Error loading past analysis:', error)
      showToast('Failed to load past analysis', 'error')
    }
  }

  const handleAnalyze = async () => {
    if (!text || text.length < 50) {
      showToast('Please enter at least 50 characters to analyze', 'warning')
      return
    }

    setIsAnalyzing(true)
    setRequestId('')
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          title: `Analysis ${new Date().toLocaleDateString()}`,
          user_id: user?.id 
        })
      })

      const reqId = response.headers.get('X-Request-Id') || ''
      setRequestId(reqId)

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`)
      }

      const result = await response.json()
      setAnalysis(result)
      setSections(result.detected_sections || [])
      setOriginalText(text)
      
      // Initialize all sections as selected
      const initialSelected = new Set<number>(result.detected_sections?.map((_: any, i: number) => i) || [])
      setSelectedSections(initialSelected)
      
      showToast('Analysis complete', 'success')
    } catch (error) {
      console.error('Analysis error:', error)
      showToast(`Analysis failed. Request ID: ${requestId}`, 'error', {
        label: 'Retry',
        onClick: handleAnalyze
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handlePreviewSection = async (index: number) => {
    const section = sections[index]
    if (!section) return

    setSectionStates(prev => ({
      ...prev,
      [index]: { status: 'previewing' }
    }))

    try {
      const sectionText = text.substring(section.start_index, section.end_index)
      
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rewrite this text to reduce AI detection while preserving meaning: "${sectionText}"`,
          originalText: sectionText,
          constraints: {
            maxLengthDiff: 20,
            preserveKeyTerms: true
          },
          user_id: user?.id
        })
      })

      if (!response.ok) throw new Error('Rewrite failed')
      
      const result = await response.json()
      setSectionStates(prev => ({
        ...prev,
        [index]: { 
          status: 'previewing',
          rewrittenText: result.rewrittenText
        }
      }))
    } catch (error) {
      setSectionStates(prev => ({
        ...prev,
        [index]: { 
          status: 'failed',
          error: 'Failed to generate preview'
        }
      }))
    }
  }

  const handleApplySection = (index: number) => {
    const section = sections[index]
    const state = sectionStates[index]
    
    if (!section || !state?.rewrittenText) return

    setSectionStates(prev => ({
      ...prev,
      [index]: { ...prev[index], status: 'applying' }
    }))

    // Apply the change to the text
    const before = text.substring(0, section.start_index)
    const after = text.substring(section.end_index)
    const newText = before + state.rewrittenText + after
    
    setText(newText)
    
    // Update section positions
    const lengthDiff = state.rewrittenText.length - (section.end_index - section.start_index)
    setSections(prev => prev.map((s, i) => {
      if (i < index) return s
      if (i === index) {
        return {
          ...s,
          end_index: s.start_index + (state.rewrittenText?.length || 0)
        }
      }
      return {
        ...s,
        start_index: s.start_index + lengthDiff,
        end_index: s.end_index + lengthDiff
      }
    }))

    setSectionStates(prev => ({
      ...prev,
      [index]: { status: 'applied', rewrittenText: state.rewrittenText }
    }))
    
    showToast('Change applied', 'success')
  }

  const handleSkipSection = (index: number) => {
    setSectionStates(prev => ({
      ...prev,
      [index]: { status: 'idle' }
    }))
    setSelectedSections(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  const handleApplyAll = async () => {
    if (selectedSections.size === 0) {
      showToast('No sections selected', 'warning')
      return
    }

    let appliedCount = 0
    let failedCount = 0
    let newText = text

    // Sort sections by start index to apply in order
    const sortedIndices = Array.from(selectedSections).sort((a, b) => 
      sections[a].start_index - sections[b].start_index
    )

    for (const index of sortedIndices) {
      const section = sections[index]
      
      try {
        // Generate rewrite if not already previewed
        let rewrittenText = sectionStates[index]?.rewrittenText
        
        if (!rewrittenText) {
          const sectionText = newText.substring(section.start_index, section.end_index)
          const response = await fetch('/api/rewrite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Rewrite this text to reduce AI detection while preserving meaning: "${sectionText}"`,
              originalText: sectionText,
              constraints: {
                maxLengthDiff: 20,
                preserveKeyTerms: true
              },
              user_id: user?.id
            })
          })
          
          if (!response.ok) throw new Error('Rewrite failed')
          const result = await response.json()
          rewrittenText = result.rewrittenText
        }

        // Apply the change
        if (!rewrittenText) throw new Error('No rewritten text available')
        
        const before = newText.substring(0, section.start_index)
        const after = newText.substring(section.end_index)
        newText = before + rewrittenText + after
        
        // Update positions for remaining sections
        const lengthDiff = rewrittenText.length - (section.end_index - section.start_index)
        sections.forEach((s, i) => {
          if (i > index) {
            s.start_index += lengthDiff
            s.end_index += lengthDiff
          }
        })
        
        appliedCount++
        setSectionStates(prev => ({
          ...prev,
          [index]: { status: 'applied', rewrittenText }
        }))
      } catch (error) {
        failedCount++
        setSectionStates(prev => ({
          ...prev,
          [index]: { status: 'failed', error: 'Failed to apply' }
        }))
      }
    }

    setText(newText)
    setShowReviewPanel(false)
    
    showToast(
      `Applied ${appliedCount} changes${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      appliedCount > 0 ? 'success' : 'error'
    )
  }

  const handleUndoAll = () => {
    setText(originalText)
    setSectionStates({})
    showToast('All changes undone', 'info')
  }

  const handleCopyText = () => {
    navigator.clipboard.writeText(text)
    showToast('Text copied to clipboard', 'success')
  }

  const getRiskLevel = (confidence: number) => {
    if (confidence >= 80) return { label: 'High', color: 'text-red-600 bg-red-50' }
    if (confidence >= 50) return { label: 'Medium', color: 'text-yellow-600 bg-yellow-50' }
    return { label: 'Low', color: 'text-green-600 bg-green-50' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || text.length < 50}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
            
            {sections.length > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowReviewPanel(true)}
                  className="flex items-center gap-2"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  Apply All ({selectedSections.size})
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleUndoAll}
                  className="flex items-center gap-2"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                  Undo All
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2"
            >
              {showOriginal ? (
                <EyeSlashIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
              {showOriginal ? 'Show Edited' : 'Show Original'}
            </Button>
            
            <Button
              variant="ghost"
              onClick={handleCopyText}
              className="flex items-center gap-2"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              Copy
            </Button>
          </div>
        </div>
        
        {text.length < 50 && text.length > 0 && (
          <p className="text-sm text-yellow-600 mt-2">
            Add {50 - text.length} more characters to analyze
          </p>
        )}
      </div>

      <div className="flex h-[calc(100vh-60px)]">
        {/* Main Editor */}
        <div className="flex-1 p-6">
          <textarea
            ref={editorRef}
            value={showOriginal ? originalText : text}
            onChange={(e) => !showOriginal && setText(e.target.value)}
            readOnly={showOriginal}
            placeholder="Paste or type your text here to analyze..."
            className="w-full h-full p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          />
        </div>

        {/* Right Panel - Flagged Sections */}
        {sections.length > 0 && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Flagged Sections ({sections.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                AI confidence: {Math.round(analysis?.ai_confidence_score || 0)}%
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {sections.map((section, index) => {
                const state = sectionStates[index] || { status: 'idle' }
                const risk = getRiskLevel(section.confidence)
                const sectionText = text.substring(section.start_index, section.end_index)
                
                return (
                  <div key={index} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${risk.color}`}>
                        {risk.label} Risk
                      </span>
                      {state.status === 'applied' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                      "{sectionText}"
                    </p>

                    <p className="text-xs text-gray-600 mb-3">
                      {section.reason}
                    </p>

                    {state.status === 'previewing' && state.rewrittenText && (
                      <div className="mb-3 p-2 bg-green-50 rounded text-sm">
                        <p className="text-xs font-medium text-green-800 mb-1">Preview:</p>
                        <p className="text-green-900">{state.rewrittenText}</p>
                      </div>
                    )}

                    {state.status === 'failed' && (
                      <div className="mb-3 p-2 bg-red-50 rounded">
                        <p className="text-xs text-red-600">{state.error}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {state.status === 'idle' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewSection(index)}
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSkipSection(index)}
                          >
                            Skip
                          </Button>
                        </>
                      )}
                      
                      {state.status === 'previewing' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApplySection(index)}
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSkipSection(index)}
                          >
                            Skip
                          </Button>
                        </>
                      )}
                      
                      {state.status === 'applying' && (
                        <Button size="sm" disabled>
                          <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" />
                          Applying...
                        </Button>
                      )}
                      
                      {state.status === 'applied' && (
                        <span className="text-sm text-green-600">Applied</span>
                      )}
                      
                      {state.status === 'failed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewSection(index)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Review Panel Modal */}
      {showReviewPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Review Changes</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select which sections to rewrite
              </p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {sections.map((section, index) => {
                const risk = getRiskLevel(section.confidence)
                const sectionText = text.substring(section.start_index, section.end_index)
                
                return (
                  <div key={index} className="flex items-start gap-3 mb-4 p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedSections.has(index)}
                      onChange={(e) => {
                        const newSet = new Set(selectedSections)
                        if (e.target.checked) {
                          newSet.add(index)
                        } else {
                          newSet.delete(index)
                        }
                        setSelectedSections(newSet)
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${risk.color}`}>
                          {risk.label}
                        </span>
                        <span className="text-xs text-gray-600">
                          Expected risk drop: {Math.round(section.confidence * 0.7)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">"{sectionText}"</p>
                      <p className="text-xs text-gray-600">{section.reason}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setShowReviewPanel(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyAll}
                disabled={selectedSections.size === 0}
              >
                Apply {selectedSections.size} Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}