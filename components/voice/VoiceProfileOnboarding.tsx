'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { 
  SubtleBlocks,
  ProcessIndicator,
  ProgressDots
} from '@/components/SubtleBlocks'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { voiceProfileEngine } from '@/lib/voice/voice-profile-engine'

interface VoiceProfileOnboardingProps {
  userId: string
  onComplete: (voiceprintId: string) => void
  onSkip?: () => void
  existingSamples?: Array<{
    id: string
    content: string
    title: string
    word_count: number
  }>
}

interface WritingSample {
  id: string
  title: string
  content: string
  wordCount: number
  isValid: boolean
  validationErrors: string[]
  prompt?: string
}

const SAMPLE_PROMPTS = [
  {
    id: 'casual',
    title: 'Personal Story',
    prompt: 'Write about a recent accomplishment or memorable experience',
    minWords: 100,
    category: 'casual',
    icon: '📝'
  },
  {
    id: 'educational',
    title: 'Explain a Concept',
    prompt: 'Explain a complex topic you know well to someone unfamiliar with it',
    minWords: 150,
    category: 'educational',
    icon: '🎓'
  },
  {
    id: 'personal',
    title: 'Weekend Plans',
    prompt: 'Describe your ideal weekend or a recent leisure activity',
    minWords: 100,
    category: 'personal',
    icon: '🌟'
  },
  {
    id: 'formal',
    title: 'Professional Email',
    prompt: 'Write a professional email proposing a new idea or project',
    minWords: 100,
    category: 'formal',
    icon: '💼'
  },
  {
    id: 'narrative',
    title: 'Childhood Memory',
    prompt: 'Tell a story from your childhood that shaped who you are',
    minWords: 150,
    category: 'narrative',
    icon: '🌈'
  }
]

const MIN_SAMPLES = 3
const OPTIMAL_SAMPLES = 5
const MIN_WORDS_PER_SAMPLE = 50

export default function VoiceProfileOnboarding({
  userId,
  onComplete,
  onSkip,
  existingSamples = []
}: VoiceProfileOnboardingProps) {
  const { showToast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [samples, setSamples] = useState<WritingSample[]>([])
  const [currentSampleText, setCurrentSampleText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [profileProgress, setProfileProgress] = useState(0)
  const [selectedPrompt, setSelectedPrompt] = useState(SAMPLE_PROMPTS[0])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  // Initialize with existing samples
  useEffect(() => {
    if (existingSamples.length > 0) {
      const formattedSamples = existingSamples.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        wordCount: s.word_count,
        isValid: s.word_count >= MIN_WORDS_PER_SAMPLE,
        validationErrors: s.word_count < MIN_WORDS_PER_SAMPLE 
          ? [`Sample needs at least ${MIN_WORDS_PER_SAMPLE} words`] 
          : []
      }))
      setSamples(formattedSamples)
      if (formattedSamples.length >= MIN_SAMPLES) {
        setCurrentStep(Math.min(formattedSamples.length, OPTIMAL_SAMPLES))
      }
    }
  }, [existingSamples])
  
  const wordCount = currentSampleText.trim().split(/\s+/).filter(w => w).length
  const charCount = currentSampleText.length
  const canAddSample = wordCount >= MIN_WORDS_PER_SAMPLE
  const canCreateProfile = samples.filter(s => s.isValid).length >= MIN_SAMPLES
  const progress = (samples.filter(s => s.isValid).length / OPTIMAL_SAMPLES) * 100
  
  const validateSample = (text: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    const words = text.trim().split(/\s+/).filter(w => w)
    
    if (words.length < MIN_WORDS_PER_SAMPLE) {
      errors.push(`Need at least ${MIN_WORDS_PER_SAMPLE} words (currently ${words.length})`)
    }
    
    // Check for repetitive content
    const uniqueWords = new Set(words.map(w => w.toLowerCase()))
    const uniqueRatio = uniqueWords.size / words.length
    if (uniqueRatio < 0.3) {
      errors.push('Text appears to be repetitive. Please write naturally.')
    }
    
    // Check for Lorem ipsum or placeholder text
    if (/lorem ipsum|placeholder|test text/i.test(text)) {
      errors.push('Please provide real writing samples, not placeholder text.')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  const handleAddSample = async () => {
    const validation = validateSample(currentSampleText)
    
    if (!validation.isValid) {
      showToast(validation.errors[0], 'error')
      return
    }
    
    setIsAnalyzing(true)
    
    try {
      // Quick analysis to ensure quality
      const metrics = voiceProfileEngine.analyzeWritingSample(currentSampleText)
      
      const newSample: WritingSample = {
        id: `sample-${Date.now()}`,
        title: selectedPrompt.title,
        content: currentSampleText,
        wordCount: wordCount,
        isValid: true,
        validationErrors: [],
        prompt: selectedPrompt.prompt
      }
      
      setSamples([...samples, newSample])
      setCurrentSampleText('')
      setCurrentStep(currentStep + 1)
      
      // Move to next prompt
      const nextPromptIndex = SAMPLE_PROMPTS.findIndex(p => p.id === selectedPrompt.id) + 1
      if (nextPromptIndex < SAMPLE_PROMPTS.length) {
        setSelectedPrompt(SAMPLE_PROMPTS[nextPromptIndex])
      }
      
      showToast(`Sample ${samples.length + 1} added successfully`, 'success')
      
      // Auto-create profile after 4+ quality samples
      if (samples.length + 1 >= 4 && validation.isValid) {
        showToast('Great! You have enough samples for an accurate voice profile.', 'success')
      }
    } catch (error) {
      console.error('Sample analysis error:', error)
      showToast('Failed to analyze sample. Please try again.', 'error')
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a TXT, PDF, or DOCX file', 'error')
      return
    }
    
    setUploadedFile(file)
    setIsAnalyzing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to extract text')
      
      const { text } = await response.json()
      setCurrentSampleText(text)
      showToast('File processed successfully', 'success')
    } catch (error) {
      console.error('File processing error:', error)
      showToast('Failed to process file', 'error')
      setUploadedFile(null)
    } finally {
      setIsAnalyzing(false)
    }
  }
  
  const handleCreateProfile = async () => {
    if (!canCreateProfile) {
      showToast('Need at least 3 valid samples to create profile', 'error')
      return
    }
    
    setIsCreatingProfile(true)
    setProfileProgress(0)
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProfileProgress(prev => Math.min(prev + 10, 90))
    }, 300)
    
    try {
      // Create voice fingerprint from samples
      const sampleTexts = samples.filter(s => s.isValid).map(s => s.content)
      const voiceTraits = voiceProfileEngine.createVoiceFingerprint(sampleTexts)
      
      // Save to database via API
      const response = await fetch('/api/voiceprint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          samples: samples.map(s => ({
            title: s.title,
            content: s.content,
            word_count: s.wordCount
          })),
          traits: voiceTraits
        })
      })
      
      if (!response.ok) throw new Error('Failed to create voice profile')
      
      const { voiceprint_id } = await response.json()
      
      clearInterval(progressInterval)
      setProfileProgress(100)
      
      showToast('Voice profile created successfully!', 'success')
      setTimeout(() => onComplete(voiceprint_id), 1000)
      
    } catch (error) {
      console.error('Profile creation error:', error)
      showToast('Failed to create voice profile. Please try again.', 'error')
      clearInterval(progressInterval)
      setProfileProgress(0)
    } finally {
      setIsCreatingProfile(false)
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-medium text-gray-900">Create Your Voice Profile</h2>
            <p className="text-sm text-gray-500 mt-1">
              Provide diverse writing samples to capture your authentic voice
            </p>
          </div>
          {onSkip && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-gray-500"
            >
              Skip for now
            </Button>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {samples.filter(s => s.isValid).length} of {OPTIMAL_SAMPLES} samples
            </span>
            <span className="text-gray-900 font-medium">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="relative">
            <SubtleBlocks 
              value={progress} 
              max={100} 
              color={progress >= 60 ? "green" : progress >= 30 ? "blue" : "gray"}
              isActive={true}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              Minimum: {MIN_SAMPLES} samples
            </span>
            <span className="text-xs text-gray-400">
              Optimal: {OPTIMAL_SAMPLES} samples
            </span>
          </div>
        </div>
      </div>
      
      {/* Sample Collection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Sample {samples.length + 1}: {selectedPrompt.title}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {selectedPrompt.icon} {selectedPrompt.prompt}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Text Input */}
            <div className="relative">
              <textarea
                value={currentSampleText}
                onChange={(e) => setCurrentSampleText(e.target.value)}
                placeholder="Start writing here..."
                className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-300 resize-none"
                disabled={isAnalyzing}
              />
              
              {/* Word Count Badge */}
              <div className="absolute bottom-2 right-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  wordCount >= MIN_WORDS_PER_SAMPLE 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {wordCount} words
                  {wordCount < MIN_WORDS_PER_SAMPLE && (
                    <span className="ml-1 text-gray-500">
                      (need {MIN_WORDS_PER_SAMPLE - wordCount} more)
                    </span>
                  )}
                </span>
              </div>
            </div>
            
            {/* File Upload Option */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Or</span>
              <label className="cursor-pointer text-gray-700 hover:text-gray-900 underline">
                upload a document
                <input
                  type="file"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isAnalyzing}
                />
              </label>
              <span>(TXT, PDF, DOCX)</span>
            </div>
            
            {/* Add Sample Button */}
            <Button
              onClick={handleAddSample}
              disabled={!canAddSample || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <ProcessIndicator isProcessing={true} />
                  <span className="ml-2">Analyzing...</span>
                </>
              ) : (
                <>
                  Add Sample
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            
            {/* ASCII Separator */}
            <div className="text-center text-gray-300 text-xs" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
              ••••••••••••••••••••••
            </div>
            
            {/* Tips */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-medium">Tips for quality samples:</p>
              <ul className="space-y-1 text-xs text-gray-500">
                <li className="flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  Write naturally, as you normally would
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  Include diverse topics and styles
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  Avoid copying text from other sources
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
        
        {/* Samples List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Samples</CardTitle>
            <p className="text-sm text-gray-500">
              {samples.filter(s => s.isValid).length} valid samples collected
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence>
                {samples.map((sample, index) => (
                  <motion.div
                    key={sample.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`p-3 rounded-lg border ${
                      sample.isValid 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {sample.isValid ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {sample.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({sample.wordCount} words)
                          </span>
                        </div>
                        {sample.prompt && (
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            {sample.prompt}
                          </p>
                        )}
                        {sample.validationErrors.length > 0 && (
                          <p className="text-xs text-red-600 mt-1 ml-6">
                            {sample.validationErrors[0]}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSamples(samples.filter(s => s.id !== sample.id))}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {samples.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No samples yet</p>
                  <p className="text-xs mt-1">Start writing to build your voice profile</p>
                </div>
              )}
            </div>
            
            {/* Create Profile Button */}
            {canCreateProfile && (
              <div className="mt-6">
                <Button
                  onClick={handleCreateProfile}
                  disabled={isCreatingProfile}
                  className="w-full bg-gray-900 hover:bg-black text-white"
                >
                  {isCreatingProfile ? (
                    <>
                      <ProcessIndicator isProcessing={true} />
                      <span className="ml-2">Creating Profile...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      Create Voice Profile
                    </>
                  )}
                </Button>
                
                {isCreatingProfile && (
                  <div className="mt-3">
                    <ProgressDots 
                      progress={profileProgress} 
                      isActive={true} 
                      color="green" 
                    />
                    <p className="text-xs text-center text-gray-500 mt-2">
                      Analyzing your unique writing patterns...
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Status Chips */}
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          Coverage: {Math.round((samples.length / OPTIMAL_SAMPLES) * 100)}%
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          Total Words: {samples.reduce((sum, s) => sum + s.wordCount, 0)}
        </span>
        {samples.length >= MIN_SAMPLES && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Ready to create profile
          </span>
        )}
      </div>
    </div>
  )
}