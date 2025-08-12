'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
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
  language: string
}

export default function StepSamples({ onBack, language }: StepSamplesProps) {
  const [samples, setSamples] = useState<WritingSample[]>([
    { id: '1', title: '', text: '', wordCount: 0 },
    { id: '2', title: '', text: '', wordCount: 0 },
    { id: '3', title: '', text: '', wordCount: 0 }
  ])
  const [isComputing, setIsComputing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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

  const getValidSamples = () => {
    return samples.filter(sample => 
      sample.text.trim().length >= 50 && 
      sample.wordCount >= 10
    )
  }

  const canContinue = () => {
    const validSamples = getValidSamples()
    return validSamples.length >= 3
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
        const errorData = await createResponse.json()
        throw new Error(errorData.error || 'Failed to create voiceprint')
      }

      const { voiceprintId } = await createResponse.json()
      
      // Wait a bit for processing effect
      await new Promise(resolve => setTimeout(resolve, 2000))

      const computeResponse = await fetch('/api/voiceprint/compute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceprintId: voiceprintId
        })
      })

      if (!computeResponse.ok) {
        const errorData = await computeResponse.json()
        throw new Error(errorData.error || 'Failed to compute voice analysis')
      }

      // Mark user as onboarded after successful voiceprint creation
      await updateProfile({ onboarded: true })

      router.push('/dashboard?voiceprint_created=true')

    } catch (err) {
      console.error('Voice profile creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create voice profile')
      setIsComputing(false)
    }
  }

  const getSampleStatus = (sample: WritingSample) => {
    if (sample.text.trim().length === 0) return { status: 'empty', color: 'text-gray-500' }
    if (sample.text.trim().length < 50 || sample.wordCount < 10) return { status: 'short', color: 'text-orange-600' }
    return { status: 'good', color: 'text-green-600' }
  }

  if (isComputing) {
    return (
      <div className="text-center max-w-lg mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Creating your voice profile
          </h2>
          <p className="text-gray-600">
            This usually takes 15-20 seconds
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          Add your writing samples
        </h2>
        <p className="text-lg text-gray-600 mb-2">
          Share 3-5 examples of your natural writing style
        </p>
        <p className="text-sm text-gray-500">
          50+ words each • emails, posts, articles, etc.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {samples.map((sample, index) => {
          const status = getSampleStatus(sample)
          
          return (
            <div key={sample.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  placeholder={`Sample ${index + 1} title (optional)`}
                  value={sample.title}
                  onChange={(e) => updateSample(sample.id, 'title', e.target.value)}
                  className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
                />
                
                {samples.length > 3 && (
                  <button
                    onClick={() => removeSample(sample.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <textarea
                value={sample.text}
                onChange={(e) => {
                  if (e.target.value.length <= 5000) {
                    updateSample(sample.id, 'text', e.target.value)
                  }
                }}
                placeholder="Paste your writing here..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700 placeholder-gray-400 resize-none min-h-[100px] text-sm leading-relaxed"
                rows={4}
              />

              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs font-medium ${status.color}`}>
                  {sample.wordCount === 0 && 'Start typing...'}
                  {sample.wordCount > 0 && sample.wordCount < 10 && 'Need at least 10 words'}
                  {sample.wordCount >= 10 && `${sample.wordCount} words`}
                </span>
                <span className="text-xs text-gray-400">
                  {sample.text.length}/5,000 characters
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {samples.length < 5 && (
        <button
          onClick={addSample}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors mb-8 flex items-center justify-center space-x-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add another sample</span>
        </button>
      )}

      <div className="flex justify-between items-center">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          Back
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={!canContinue() || isComputing}
          className="bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
        >
          {isComputing ? 'Creating...' : 'Create Voice Profile'}
        </Button>
      </div>

      {!canContinue() && getValidSamples().length > 0 && (
        <p className="text-center text-sm text-gray-500 mt-4">
          Add {3 - getValidSamples().length} more sample{3 - getValidSamples().length > 1 ? 's' : ''} to continue
        </p>
      )}
    </div>
  )
}