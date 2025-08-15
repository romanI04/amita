'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import type { WritingSample } from '@/types'

interface SampleSelection {
  id: string
  title: string
  content: string
  wordCount: number
  authenticity: number
  aiRisk: number
  createdAt: string
  selected: boolean
}

export default function VoiceprintOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { showToast } = useToast()
  
  const [samples, setSamples] = useState<SampleSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch user's existing analyses
  useEffect(() => {
    if (!user) return
    
    const fetchSamples = async () => {
      try {
        const supabase = createClient()
        
        // Get user's analyzed texts
        const { data: analyses, error } = await supabase
          .from('writing_samples')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (error) throw error
        
        if (!analyses || analyses.length === 0) {
          setError('No analyzed texts found. Please analyze some text first.')
          setLoading(false)
          return
        }
        
        // Convert to our format and auto-select the best ones
        const sampleSelections: SampleSelection[] = analyses
          .map((a: any) => ({
            id: a.id,
            title: a.title || `Analysis from ${new Date(a.created_at).toLocaleDateString()}`,
            content: a.content || '',
            wordCount: a.content?.trim().split(/\s+/).filter(w => w.length > 0).length || 0,
            authenticity: (a.authenticity_score || 0) / 100, // Convert from 0-100 to 0-1
            aiRisk: (a.ai_risk_score || 0) / 100, // Convert from 0-100 to 0-1
            createdAt: a.created_at,
            selected: false
          }))
          .filter(s => s.wordCount >= 50) // Filter out samples with less than 50 words
        
        // Auto-select the best samples (high authenticity, good word count, diverse dates)
        const sorted = [...sampleSelections].sort((a, b) => {
          // Prioritize authenticity and word count
          const scoreA = a.authenticity * 0.6 + Math.min(a.wordCount / 500, 1) * 0.4
          const scoreB = b.authenticity * 0.6 + Math.min(b.wordCount / 500, 1) * 0.4
          return scoreB - scoreA
        })
        
        // Check if we have enough valid samples
        if (sampleSelections.length < 3) {
          setError('Not enough valid samples found. Each sample needs at least 50 words. Please analyze more text.')
          setSamples(sampleSelections)
          setLoading(false)
          return
        }
        
        // Select top 4 samples
        sorted.slice(0, 4).forEach(s => s.selected = true)
        
        setSamples(sampleSelections)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching samples:', err)
        setError('Failed to load your analyses. Please try again.')
        setLoading(false)
      }
    }
    
    fetchSamples()
  }, [user])
  
  // Toggle sample selection
  const toggleSample = (id: string) => {
    setSamples(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ))
  }
  
  // Create voiceprint
  const handleCreateVoiceprint = async () => {
    const selectedSamples = samples.filter(s => s.selected)
    
    if (selectedSamples.length < 3) {
      showToast('Please select at least 3 samples', 'error')
      return
    }
    
    if (selectedSamples.length > 5) {
      showToast('Please select at most 5 samples', 'error')
      return
    }
    
    setCreating(true)
    
    try {
      console.log('Creating voiceprint with:', {
        samplesCount: selectedSamples.length,
        samples: selectedSamples.map(s => ({
          title: s.title,
          wordCount: s.wordCount,
          contentLength: s.content.length
        }))
      })
      
      // Create voiceprint
      const createResponse = await fetch('/api/voiceprint/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'credentials': 'same-origin'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          samples: selectedSamples.map(s => ({
            title: s.title,
            content: s.content,
            source: 'analysis'
          })),
          name: 'My Voice Profile',
          user_id: user?.id
        })
      })
      
      if (!createResponse.ok) {
        let errorMessage = 'Failed to create voiceprint'
        try {
          const errorData = await createResponse.json()
          console.error('Create voiceprint error response:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (e) {
          console.error('Could not parse error response:', e)
        }
        throw new Error(errorMessage)
      }
      
      const createData = await createResponse.json()
      const voiceprint_id = createData.voiceprint_id || createData.voiceprintId
      
      if (!voiceprint_id) {
        throw new Error('No voiceprint ID returned from creation')
      }
      
      // Compute voiceprint
      const computeResponse = await fetch('/api/voiceprint/compute', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'credentials': 'same-origin'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          voiceprintId: voiceprint_id,  // API expects camelCase
          voiceprint_id,  // Also send snake_case for backward compatibility
          user_id: user?.id
        })
      })
      
      if (!computeResponse.ok) {
        let errorMessage = 'Failed to compute voiceprint'
        try {
          const errorData = await computeResponse.json()
          console.error('Compute voiceprint error response:', errorData)
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch (e) {
          console.error('Could not parse compute error response:', e)
        }
        throw new Error(errorMessage)
      }
      
      showToast('Voice profile created successfully!', 'success')
      
      // Add a small delay to ensure the database has updated
      setTimeout(() => {
        // Force a hard refresh to reload the profile data
        // This ensures the profile page gets the new voiceprint
        window.location.href = '/profile'
      }, 1000)
    } catch (err: any) {
      console.error('Error creating voiceprint:', err)
      const errorMessage = err?.message || err?.error || 'Failed to create voice profile. Please try again.'
      showToast(errorMessage, 'error')
      setCreating(false)
    }
  }
  
  // Check auth
  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-2xl text-gray-400">
                ••••••••
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Loading your analyses...</p>
          </div>
        </div>
      </AppLayout>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }
  
  if ((error || samples.length < 3) && samples.length === 0) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center max-w-md">
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-4xl text-gray-300">
              ○○○○○
            </span>
            <h2 className="text-xl font-light text-gray-900 mt-4 mb-2">
              {samples.length === 0 ? 'No Analyses Found' : 'Need More Samples'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {samples.length === 0 
                ? 'You need to analyze some text before creating a voice profile.'
                : `You need at least 3 samples with 50+ words each. Currently have ${samples.length} valid sample${samples.length === 1 ? '' : 's'}.`}
            </p>
            <Link href="/analyze">
              <Button>Analyze Text →</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }
  
  const selectedCount = samples.filter(s => s.selected).length
  const totalWords = samples.filter(s => s.selected).reduce((sum, s) => sum + s.wordCount, 0)
  
  return (
    <AppLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/profile')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
            >
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>←</span>
              Back to Profile
            </button>
            
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Create Voice Profile
            </h1>
            <p className="text-gray-500">
              Select 3-5 of your best writing samples to establish your voice baseline
            </p>
            <div className="mt-4">
              <span className="text-xs text-gray-300" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                ••••••••••••••••••••••••••••••••••••••••
              </span>
            </div>
          </div>
          
          {/* Selection Stats */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Selected Samples</p>
                <p className="text-2xl font-light text-gray-900">
                  {selectedCount}
                  <span className="text-sm text-gray-500 ml-1">/ 3-5</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Words</p>
                <p className="text-2xl font-light text-gray-900">{totalWords.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <p className="text-2xl font-light">
                  {selectedCount < 3 ? (
                    <span className="text-orange-500">Need {3 - selectedCount} more</span>
                  ) : selectedCount > 5 ? (
                    <span className="text-orange-500">Too many</span>
                  ) : (
                    <span className="text-green-600">Ready</span>
                  )}
                </p>
              </div>
            </div>
            
            {/* Progress Dots */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Selection Progress</span>
                <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-sm">
                  {selectedCount >= 1 ? '•' : '○'}
                  {selectedCount >= 2 ? '•' : '○'}
                  {selectedCount >= 3 ? '•' : '○'}
                  {selectedCount >= 4 ? '•' : '○'}
                  {selectedCount >= 5 ? '•' : '○'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Samples Grid */}
          <div className="space-y-4 mb-8">
            {samples.map((sample, idx) => (
              <motion.div
                key={sample.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => toggleSample(sample.id)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  sample.selected 
                    ? 'border-gray-400 bg-gray-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-sm">
                        {sample.selected ? '☑' : '☐'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {sample.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {sample.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className={`${sample.wordCount < 50 ? 'text-orange-500' : 'text-gray-500'}`}>
                          {sample.wordCount} words {sample.wordCount < 50 ? '(min 50)' : ''}
                        </span>
                        <span className="text-gray-500">
                          Authenticity: {Math.round(sample.authenticity * 100)}%
                        </span>
                        <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-gray-400">
                          {(() => {
                            const filled = Math.max(0, Math.min(5, Math.round(sample.authenticity * 5)))
                            const empty = 5 - filled
                            return '•'.repeat(filled) + '○'.repeat(empty)
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">
                      {new Date(sample.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/profile')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <Button
              onClick={handleCreateVoiceprint}
              disabled={selectedCount < 3 || selectedCount > 5 || creating}
              loading={creating}
              className="px-8"
            >
              {creating ? 'Creating Voice Profile...' : 'Create Voice Profile'}
            </Button>
          </div>
          
          {/* Tips */}
          <div className="mt-12 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-xs font-medium text-gray-700 mb-3">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>••</span>
              {' '}Selection Tips
            </h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p>• Choose diverse content types for better coverage</p>
              <p>• Prioritize samples with high authenticity scores</p>
              <p>• Include both formal and casual writing if available</p>
              <p>• Samples with 200+ words provide better analysis</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}