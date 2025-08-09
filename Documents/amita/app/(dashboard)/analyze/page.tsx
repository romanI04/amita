'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  DocumentTextIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { AnalysisResponse, AIDetectedSection } from '@/types'

export default function AnalyzePage() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { user, profile, refreshProfile } = useAuth()
  const router = useRouter()

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze')
      return
    }

    if (!user) {
      setError('You must be logged in to analyze text')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          title: title.trim() || 'Untitled Analysis',
          user_id: user.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Analysis failed')
      }

      const result = await response.json()
      setAnalysis(result)
      
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during analysis')
    } finally {
      setAnalyzing(false)
    }
  }

  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score <= 30) return 'low'
    if (score <= 70) return 'medium'
    return 'high'
  }

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-green-700 bg-green-100 border-green-200'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200'
      case 'high':
        return 'text-red-700 bg-red-100 border-red-200'
    }
  }

  const getScoreIcon = (score: number) => {
    if (score <= 30) return <CheckCircleIcon className="h-5 w-5 text-green-600" />
    if (score <= 70) return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
    return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
  }

  const highlightDetectedSections = (text: string, sections: AIDetectedSection[]) => {
    if (!sections || sections.length === 0) return text

    // Sort sections by start index to process them in order
    const sortedSections = sections.sort((a, b) => a.start_index - b.start_index)
    
    let result = ''
    let lastIndex = 0

    sortedSections.forEach(section => {
      // Add text before the detected section
      result += text.slice(lastIndex, section.start_index)
      
      // Add the highlighted detected section
      const detectedText = text.slice(section.start_index, section.end_index)
      result += `<mark class="bg-red-100 text-red-800 px-1 rounded" title="${section.reason}">${detectedText}</mark>`
      
      lastIndex = section.end_index
    })

    // Add remaining text
    result += text.slice(lastIndex)
    return result
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold font-heading text-neutral-900">
                amita.ai
              </Link>
              <nav className="flex space-x-6">
                <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                  Dashboard
                </Link>
                <span className="text-primary-600 font-medium">Analyze</span>
                <Link href="/profile" className="text-neutral-600 hover:text-neutral-900">
                  Profile
                </Link>
              </nav>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!analysis ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Analyze Your Writing
              </h1>
              <p className="text-neutral-600">
                Discover your authentic voice patterns and detect AI-generated content
              </p>
            </div>

            {/* Input Form */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Enter Your Text</CardTitle>
                <CardDescription>
                  Paste your writing below for comprehensive analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Input
                  label="Title (optional)"
                  placeholder="Give your text a title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Your Text
                  </label>
                  <textarea
                    className="w-full h-64 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                    placeholder="Paste your writing here for analysis..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={analyzing}
                  />
                  <p className="text-sm text-neutral-500 mt-2">
                    {text.length} characters ({Math.round(text.trim().split(/\s+/).length)} words)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-neutral-500">
                    Analysis typically takes 10-15 seconds
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzing || !text.trim()}
                    loading={analyzing}
                    size="lg"
                  >
                    {analyzing ? 'Analyzing...' : 'Analyze Writing'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Debug Section - Remove after fixing */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Debug Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p><strong>User:</strong> {user ? '✓ Logged in' : '✗ Not logged in'}</p>
                  <p><strong>Profile:</strong> {profile ? '✓ Loaded' : '✗ Not loaded'}</p>
                  {user && <p><strong>User ID:</strong> {user.id}</p>}
                  {profile && <p><strong>Profile Name:</strong> {profile.full_name}</p>}
                  <Button onClick={refreshProfile} variant="outline" size="sm">
                    Refresh Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <InformationCircleIcon className="h-5 w-5 mr-2" />
                  Analysis Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-neutral-600">
                  <li>• For best results, use at least 100 words of text</li>
                  <li>• Include complete sentences and paragraphs</li>
                  <li>• Original writing works better than edited content</li>
                  <li>• Technical and creative writing may have different patterns</li>
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Analysis Results */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900">Analysis Results</h1>
                  {title && <p className="text-neutral-600 mt-1">{title}</p>}
                </div>
                <Button
                  onClick={() => {
                    setAnalysis(null)
                    setText('')
                    setTitle('')
                    setError(null)
                  }}
                  variant="outline"
                >
                  New Analysis
                </Button>
              </div>
            </div>

            {/* Score Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600">AI Confidence Score</p>
                      <p className="text-3xl font-bold text-neutral-900">
                        {Math.round(analysis.ai_confidence_score)}%
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Likelihood of AI generation
                      </p>
                    </div>
                    <div className="text-right">
                      {getScoreIcon(analysis.ai_confidence_score)}
                      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(getRiskLevel(analysis.ai_confidence_score))}`}>
                        {getRiskLevel(analysis.ai_confidence_score)} risk
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-neutral-600">Authenticity Score</p>
                      <p className="text-3xl font-bold text-neutral-900">
                        {Math.round(analysis.authenticity_score)}%
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        Human writing confidence
                      </p>
                    </div>
                    <div className="text-right">
                      {getScoreIcon(100 - analysis.authenticity_score)}
                      <div className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Authentic
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detected Sections */}
            {analysis.detected_sections && analysis.detected_sections.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-700">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    Potentially AI-Generated Sections
                  </CardTitle>
                  <CardDescription>
                    Highlighted sections that may have been generated by AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="prose prose-sm max-w-none p-4 bg-neutral-50 rounded-lg border"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightDetectedSections(text, analysis.detected_sections) 
                    }}
                  />
                  
                  <div className="mt-4 space-y-3">
                    <h4 className="font-medium text-neutral-900">Detected Issues:</h4>
                    {analysis.detected_sections.map((section, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-900">
                            Confidence: {Math.round(section.confidence)}%
                          </p>
                          <p className="text-sm text-amber-700 mt-1">{section.reason}</p>
                          {section.suggested_revision && (
                            <p className="text-sm text-neutral-600 mt-2">
                              <strong>Suggestion:</strong> {section.suggested_revision}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Improvement Suggestions */}
            {analysis.improvement_suggestions && analysis.improvement_suggestions.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
                    Improvement Suggestions
                  </CardTitle>
                  <CardDescription>
                    Personalized tips to strengthen your authentic voice
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analysis.improvement_suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-900">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Style Analysis */}
            {analysis.style_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle>Writing Style Analysis</CardTitle>
                  <CardDescription>
                    Detailed breakdown of your writing characteristics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-neutral-900 mb-3">Sentence Structure</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Average Length:</span>
                          <span className="font-medium">{Math.round(analysis.style_analysis.sentence_structure.avg_length)} words</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Complexity:</span>
                          <span className="font-medium">{analysis.style_analysis.sentence_structure.complexity_score}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Variety:</span>
                          <span className="font-medium">{analysis.style_analysis.sentence_structure.variety_score}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-900 mb-3">Vocabulary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Diversity:</span>
                          <span className="font-medium">{analysis.style_analysis.vocabulary.diversity_index}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Sophistication:</span>
                          <span className="font-medium">{analysis.style_analysis.vocabulary.sophistication_level}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Uniqueness:</span>
                          <span className="font-medium">{Math.round(analysis.style_analysis.vocabulary.unique_word_ratio * 100)}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-900 mb-3">Tone Analysis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Formality:</span>
                          <span className="font-medium">{analysis.style_analysis.tone_analysis.formality}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Emotion:</span>
                          <span className="font-medium">{analysis.style_analysis.tone_analysis.emotion}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Confidence:</span>
                          <span className="font-medium">{analysis.style_analysis.tone_analysis.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}