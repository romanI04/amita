'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { 
  PlusIcon, 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'

interface WritingSample {
  id: string
  title: string
  text: string
  wordCount: number
}

interface StepSamplesProps {
  onBack: () => void
  onSkip?: () => void
  language: string
}

export default function StepSamples({ onBack, onSkip, language }: StepSamplesProps) {
  const [samples, setSamples] = useState<WritingSample[]>([
    { id: '1', title: '', text: '', wordCount: 0 },
    { id: '2', title: '', text: '', wordCount: 0 },
    { id: '3', title: '', text: '', wordCount: 0 }
  ])
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null)
  
  const { user, updateProfile } = useAuth()
  const router = useRouter()

  const updateSample = (id: string, field: 'title' | 'text', value: string) => {
    setSamples(prev => prev.map(sample => {
      if (sample.id === id) {
        const updated = { ...sample, [field]: value }
        if (field === 'text') {
          updated.wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
        }
        return updated
      }
      return sample
    }))
  }

  const addSample = () => {
    if (samples.length < 5) {
      setSamples(prev => [...prev, {
        id: Date.now().toString(),
        title: '',
        text: '',
        wordCount: 0
      }])
    }
  }

  const removeSample = (id: string) => {
    if (samples.length > 3) {
      setSamples(prev => prev.filter(sample => sample.id !== id))
    }
  }

  const handleFileUpload = async (id: string, file: File) => {
    if (!file) return
    
    // Check file type
    const allowedTypes = ['.txt', '.pdf', '.docx']
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedTypes.includes(fileExt)) {
      setError(`File type not supported. Please use ${allowedTypes.join(', ')}`)
      return
    }
    
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB')
      return
    }
    
    setUploadingFile(id)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to extract text from file')
      }
      
      const { text, title } = await response.json()
      
      updateSample(id, 'text', text)
      if (title) {
        updateSample(id, 'title', title)
      }
    } catch (err) {
      setError('Failed to process file. Please try typing or pasting instead.')
    } finally {
      setUploadingFile(null)
    }
  }

  const getValidSamples = () => {
    return samples.filter(sample => 
      sample.text.trim().length >= 150 && // 150 chars minimum
      sample.wordCount >= 50 // 50 words minimum
    )
  }

  const canContinue = () => {
    const validSamples = getValidSamples()
    return validSamples.length >= 3
  }

  const getSampleStatus = (sample: WritingSample) => {
    if (sample.text.trim().length === 0) {
      return { 
        status: 'empty', 
        message: 'Add your text', 
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200'
      }
    }
    if (sample.wordCount < 50) {
      return { 
        status: 'short', 
        message: `${50 - sample.wordCount} more words needed`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    }
    return { 
      status: 'good', 
      message: 'Ready',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  }

  const handleContinue = async () => {
    if (!user || !canContinue()) return
    
    setIsComputing(true)
    setError(null)

    try {
      const validSamples = getValidSamples()
      
      const createResponse = await fetch('/api/voiceprint/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          samples: validSamples.map(sample => ({
            title: sample.title || 'Untitled Sample',
            content: sample.text.trim(),
            source: 'onboarding'
          })),
          name: 'My Voice',
          language: language
        })
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create voice profile')
      }

      const { id: voiceprintId } = await createResponse.json()
      
      const computeResponse = await fetch('/api/voiceprint/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceprint_id: voiceprintId
        })
      })
      
      if (!computeResponse.ok) {
        throw new Error('Failed to compute voice profile')
      }

      await updateProfile({ has_completed_onboarding: true })
      router.push('/dashboard')

    } catch (err) {
      console.error('Voice profile creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create voice profile')
      setIsComputing(false)
    }
  }

  const validSamplesCount = getValidSamples().length

  if (isComputing) {
    return (
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Creating your voice profile
          </h2>
          <p className="text-gray-600">
            Analyzing your writing patterns...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This usually takes 15-20 seconds
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          Add your writing samples
        </h2>
        <p className="text-lg text-gray-600 mb-4">
          Share examples of your natural writing style
        </p>
        
        {/* Progress indicator */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
          <span className={`text-sm font-medium ${validSamplesCount >= 3 ? 'text-green-600' : 'text-gray-600'}`}>
            {validSamplesCount} of 3 samples ready
          </span>
          {validSamplesCount >= 3 && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {samples.map((sample, index) => {
          const status = getSampleStatus(sample)
          const isUploading = uploadingFile === sample.id
          
          return (
            <div key={sample.id} className={`border-2 rounded-xl p-5 transition-all ${status.borderColor} ${status.bgColor}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      Sample {index + 1}
                    </span>
                    {/* Word count badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                      status.status === 'good' ? 'bg-green-100 text-green-700' :
                      status.status === 'short' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {sample.wordCount > 0 ? (
                        <>
                          {sample.wordCount} words
                          {status.status === 'good' && <CheckCircleIcon className="h-3 w-3" />}
                          {status.status === 'short' && <ExclamationTriangleIcon className="h-3 w-3" />}
                        </>
                      ) : (
                        'No content'
                      )}
                    </span>
                    {status.status === 'short' && (
                      <span className="text-xs text-yellow-600">
                        {status.message}
                      </span>
                    )}
                  </div>
                </div>
                {samples.length > 3 && (
                  <button
                    onClick={() => removeSample(sample.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-500" />
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Title (optional)"
                value={sample.title}
                onChange={(e) => updateSample(sample.id, 'title', e.target.value)}
                className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />

              <div className="relative">
                <textarea
                  placeholder="Paste or type your writing sample here (minimum 50 words)..."
                  value={sample.text}
                  onChange={(e) => updateSample(sample.id, 'text', e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[120px] resize-none"
                />
                
                {/* File upload option */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                    {isUploading ? 'Processing...' : 'Upload file'}
                    <input
                      type="file"
                      accept=".txt,.pdf,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleFileUpload(sample.id, file)
                      }}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <span className="text-xs text-gray-500">
                    Supports TXT, PDF, DOCX
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {samples.length < 5 && (
        <button
          onClick={addSample}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add another sample (optional)
        </button>
      )}

      <div className="flex justify-between items-center mt-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          Back
        </Button>
        
        <div className="flex items-center gap-3">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Skip for now
            </button>
          )}
          
          <Button
            onClick={handleContinue}
            disabled={!canContinue() || isComputing}
            className={`px-6 ${
              canContinue() 
                ? 'bg-primary-600 text-white hover:bg-primary-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Create Voice Profile
          </Button>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-3">
          <DocumentTextIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">What makes a good sample?</p>
            <ul className="space-y-1 text-xs">
              <li>• Your own writing (emails, posts, articles)</li>
              <li>• At least 50 words each</li>
              <li>• Different topics show your range</li>
              <li>• Recent writing reflects your current style</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}