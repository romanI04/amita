'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useStreamingAnalysis } from '@/lib/hooks/useStreamingAnalysis'
import { 
  ArrowPathIcon, 
  DocumentDuplicateIcon, 
  CheckCircleIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  SparklesIcon, 
  ArrowUturnLeftIcon,
  BoltIcon,
  ClockIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useSearchParams } from 'next/navigation'
import type { AIDetectedSection } from '@/types'

interface SectionState {
  status: 'idle' | 'previewing' | 'applying' | 'applied' | 'failed'
  rewrittenText?: string
  error?: string
  voiceTrait?: string
  riskDelta?: number
  authenticityDelta?: number
}

export default function StreamingAnalyzePage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const searchParams = useSearchParams()
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const {
    status,
    progress,
    phase,
    quickFixes,
    analysis,
    error,
    requestId,
    cached,
    startAnalysis,
    cancel,
    reset
  } = useStreamingAnalysis()
  
  // Main text state - single source of truth
  const [text, setText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [sections, setSections] = useState<AIDetectedSection[]>([])
  const [sectionStates, setSectionStates] = useState<Record<number, SectionState>>({})
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set())
  const [showOriginal, setShowOriginal] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<string[]>([])
  
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

    setOriginalText(text)
    setSessionHistory([text])
    
    await startAnalysis(text, {
      title: `Analysis ${new Date().toLocaleDateString()}`,
      onQuickFixes: (fixes) => {
        // Quick fixes arrived - user sees value immediately
        console.log('Quick fixes received:', fixes)
      },
      onComplete: (result) => {
        setSections(result.detected_sections || [])
        const initialSelected = new Set(result.detected_sections?.map((_: any, i: number) => i) || [])
        setSelectedSections(initialSelected)
      }
    })
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
          prompt: `Rewrite this text to reduce AI detection while preserving meaning and voice: "${sectionText}"`,
          originalText: sectionText,
          constraints: {
            maxLengthDiff: 20,
            preserveKeyTerms: true,
            preserveVoice: true
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
          rewrittenText: result.rewrittenText,
          voiceTrait: section.voice_trait_preserved,
          riskDelta: section.risk_delta,
          authenticityDelta: section.authenticity_delta
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

    // Apply the change to the text
    const before = text.substring(0, section.start_index)
    const after = text.substring(section.end_index)
    const newText = before + state.rewrittenText + after
    
    setText(newText)
    setSessionHistory(prev => [...prev, newText])
    
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
      [index]: { 
        ...state,
        status: 'applied'
      }
    }))
    
    // Show inline feedback with deltas
    showToast(
      `Applied • Risk ${state.riskDelta}% • Authenticity +${state.authenticityDelta}%`,
      'success'
    )
  }

  const handleApplyAllSafe = async () => {
    // Only apply changes that preserve voice and have positive impact
    const safeIndices = Array.from(selectedSections).filter(index => {
      const section = sections[index]
      return section && 
        section.voice_trait_preserved && 
        (section.risk_delta || 0) < -5 &&
        (section.authenticity_delta || 0) > 0
    })

    if (safeIndices.length === 0) {
      showToast('No safe changes to apply', 'info')
      return
    }

    let appliedCount = 0
    let totalRiskReduction = 0
    let totalAuthenticityGain = 0
    let newText = text

    // Sort sections by start index to apply in order
    const sortedIndices = safeIndices.sort((a, b) => 
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
              prompt: `Rewrite this text to reduce AI detection while preserving voice: "${sectionText}"`,
              originalText: sectionText,
              constraints: {
                maxLengthDiff: 20,
                preserveKeyTerms: true,
                preserveVoice: true
              },
              user_id: user?.id
            })
          })
          
          if (!response.ok) throw new Error('Rewrite failed')
          const result = await response.json()
          rewrittenText = result.rewrittenText
        }

        if (!rewrittenText) throw new Error('No rewritten text available')

        // Apply the change
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
        totalRiskReduction += Math.abs(section.risk_delta || 0)
        totalAuthenticityGain += section.authenticity_delta || 0
        
        setSectionStates(prev => ({
          ...prev,
          [index]: { 
            status: 'applied', 
            rewrittenText,
            riskDelta: section.risk_delta,
            authenticityDelta: section.authenticity_delta
          }
        }))
      } catch (error) {
        console.error(`Failed to apply section ${index}:`, error)
      }
    }

    setText(newText)
    setSessionHistory(prev => [...prev, newText])
    
    showToast(
      `Applied ${appliedCount} safe changes • Risk -${totalRiskReduction}% • Authenticity +${totalAuthenticityGain}%`,
      'success'
    )
  }

  const handleUndo = () => {
    if (sessionHistory.length > 1) {
      const previousText = sessionHistory[sessionHistory.length - 2]
      setText(previousText)
      setSessionHistory(prev => prev.slice(0, -1))
      setSectionStates({})
      showToast('Change undone', 'info')
    }
  }

  const handleUndoAll = () => {
    setText(originalText)
    setSessionHistory([originalText])
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
              onClick={status === 'streaming' ? cancel : handleAnalyze}
              disabled={status === 'connecting' || (status === 'idle' && text.length < 50)}
              className="flex items-center gap-2"
            >
              {status === 'streaming' ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Cancel
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
            
            {sections.length > 0 && (
              <>
                <Button
                  onClick={handleApplyAllSafe}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <ShieldCheckIcon className="h-4 w-4" />
                  Apply All Safe
                </Button>
                
                {sessionHistory.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={handleUndo}
                      className="flex items-center gap-2"
                    >
                      <ArrowUturnLeftIcon className="h-4 w-4" />
                      Undo
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleUndoAll}
                      className="flex items-center gap-2"
                    >
                      Undo All
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {cached && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <BoltIcon className="h-3 w-3" />
                Cached
              </span>
            )}
            
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

      {/* Progress Bar */}
      {status === 'streaming' && (
        <div className="bg-white border-b border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">
              {phase === 'quick_scan' && 'Finding quick wins...'}
              {phase === 'deep_analysis' && 'Performing deep analysis...'}
              {phase === 'complete' && 'Analysis complete!'}
            </span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Fixes Panel */}
      {quickFixes.length > 0 && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-4">
          <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <BoltIcon className="h-5 w-5" />
            Top {quickFixes.length} Quick Fixes
          </h3>
          <div className="space-y-2">
            {quickFixes.map((fix, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  fix.impact === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {fix.impact}
                </span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 font-medium">{fix.issue}</p>
                  <p className="text-sm text-gray-600">{fix.fix}</p>
                </div>
                <span className="text-sm font-medium text-green-600">
                  -{fix.risk_reduction}% risk
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-120px)]">
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

        {/* Right Panel - Flagged Sections with Inline Actions */}
        {sections.length > 0 && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">
                Flagged Sections ({sections.length})
              </h3>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="text-gray-600">
                  AI Risk: {Math.round(analysis?.ai_confidence_score || 0)}%
                </span>
                {analysis?.voice_adherence_score && (
                  <span className="text-green-600">
                    Voice Match: {analysis.voice_adherence_score}%
                  </span>
                )}
              </div>
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

                    <p className="text-xs text-gray-600 mb-2">
                      {section.reason}
                    </p>

                    {/* Voice trait badges */}
                    {section.voice_trait_preserved && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                          Preserves: {section.voice_trait_preserved}
                        </span>
                        {section.voice_trait_enhanced && (
                          <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">
                            Enhances: {section.voice_trait_enhanced}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Inline diff preview */}
                    {state.status === 'previewing' && state.rewrittenText && (
                      <div className="mb-3 p-2 bg-green-50 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-green-800">Preview:</p>
                          <div className="flex gap-2 text-xs">
                            <span className="text-red-600">Risk {state.riskDelta}%</span>
                            <span className="text-green-600">Auth +{state.authenticityDelta}%</span>
                          </div>
                        </div>
                        <p className="text-sm text-green-900">{state.rewrittenText}</p>
                      </div>
                    )}

                    {state.status === 'failed' && (
                      <div className="mb-3 p-2 bg-red-50 rounded">
                        <p className="text-xs text-red-600">{state.error}</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {state.status === 'idle' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreviewSection(index)}
                        >
                          Preview
                        </Button>
                      )}
                      
                      {state.status === 'previewing' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApplySection(index)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Apply
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSectionStates(prev => ({
                              ...prev,
                              [index]: { status: 'idle' }
                            }))}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      
                      {state.status === 'applied' && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-600">Applied</span>
                          <span className="text-xs text-gray-500">
                            {state.riskDelta}% / +{state.authenticityDelta}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Analysis Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {requestId && (
                <p className="text-xs text-red-600 mt-2">Request ID: {requestId}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={reset}
              className="text-red-600"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}