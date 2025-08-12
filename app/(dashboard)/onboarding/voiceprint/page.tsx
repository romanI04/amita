'use client'

import React, { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { getBasicStats } from '@/lib/voiceprint/features'

interface VoiceprintSample {
  id: string
  title: string
  content: string
  source: string
  wordCount: number
}

interface SignatureTrait {
  name: string
  description: string
  category: string
}

interface Pitfall {
  name: string
  description: string
  severity: string
  suggestion: string
}

interface VoiceCard {
  signature_traits: SignatureTrait[]
  pitfalls: Pitfall[]
  summary: string
}

type Step = 'goal' | 'samples' | 'compute' | 'results'

export default function VoiceprintOnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State management
  const [currentStep, setCurrentStep] = useState<Step>('goal')
  const [samples, setSamples] = useState<VoiceprintSample[]>([])
  const [voiceprintName, setVoiceprintName] = useState('My Writing Voice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceCard, setVoiceCard] = useState<VoiceCard | null>(null)
  const [voiceprintId, setVoiceprintId] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Authentication check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary-600 mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    router.push('/login')
    return null
  }
  
  // Add sample
  const addSample = (title: string, content: string, source: string = 'paste') => {
    const stats = getBasicStats(content)
    const newSample: VoiceprintSample = {
      id: Date.now().toString(),
      title: title.trim() || `Sample ${samples.length + 1}`,
      content: content.trim(),
      source,
      wordCount: stats.wordCount
    }
    setSamples(prev => [...prev, newSample])
  }
  
  // Remove sample
  const removeSample = (id: string) => {
    setSamples(prev => prev.filter(s => s.id !== id))
  }
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return
    
    for (const file of Array.from(files)) {
      const fileName = file.name.toLowerCase()
      const fileExtension = fileName.substring(fileName.lastIndexOf('.'))
      
      // Check if file type is allowed
      if (['.txt', '.pdf', '.docx'].includes(fileExtension)) {
        try {
          let content = ''
          // let wordCount = 0 // Not used currently but available from API
          
          // Use the extract-text API for all file types for consistency
          const formData = new FormData()
          formData.append('file', file)
          
          const response = await fetch('/api/extract-text', {
            method: 'POST',
            body: formData,
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to process file')
          }
          
          const result = await response.json()
          content = result.content || ''
          // wordCount = result.wordCount || 0 // Available if needed
          
          if (content && content.trim().length >= 50) {
            addSample(file.name, content, 'upload')
          } else {
            alert(`File "${file.name}" must contain at least 50 characters of text.`)
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          alert(`Failed to process "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      } else {
        alert(`File type not supported: ${fileExtension}. Please use .txt, .pdf, or .docx files.`)
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }
  
  // Create voiceprint
  const createVoiceprint = async () => {
    if (samples.length < 3 || samples.length > 5) {
      setError('Please provide 3-5 writing samples')
      return
    }
    
    setLoading(true)
    setError(null)
    setCurrentStep('compute')
    
    try {
      console.log('Creating voiceprint with', samples.length, 'samples')
      
      // Step 1: Create voiceprint
      const createResponse = await fetch('/api/voiceprint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          samples: samples.map(s => ({
            title: s.title,
            content: s.content,
            source: s.source
          })),
          name: voiceprintName
        })
      })
      
      const createData = await createResponse.json()
      
      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create voiceprint')
      }
      
      const createdVoiceprintId = createData.voiceprint_id || createData.voiceprintId
      setVoiceprintId(createdVoiceprintId)
      console.log('Voiceprint created:', createdVoiceprintId)
      
      // Step 2: Compute voiceprint
      console.log('Computing voiceprint traits...')
      const computeResponse = await fetch('/api/voiceprint/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceprintId: createdVoiceprintId  // Use camelCase consistently
        })
      })
      
      const computeData = await computeResponse.json()
      
      if (!computeResponse.ok) {
        throw new Error(computeData.error || 'Failed to compute voiceprint')
      }
      
      console.log('Voiceprint computed successfully')
      setVoiceCard(computeData.traits)
      setCurrentStep('results')
      
      // Fire telemetry events
      console.log('Telemetry: vp_compute_success')
      
    } catch (error) {
      console.error('Voiceprint creation failed:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
      setCurrentStep('samples')
      
      // Fire telemetry event
      console.log('Telemetry: vp_compute_failed')
    } finally {
      setLoading(false)
    }
  }
  
  // Set as default and continue
  const setAsDefaultAndContinue = async () => {
    if (!voiceprintId) return
    
    try {
      setLoading(true)
      setError(null)
      
      // Update user profile to set this voiceprint as default
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_voiceprint_id: voiceprintId
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set voiceprint as default')
      }
      
      console.log('Voiceprint set as default:', voiceprintId)
      
      // Navigate to dashboard with success message
      router.push('/dashboard?voiceprint_created=true')
    } catch (error) {
      console.error('Failed to set as default:', error)
      setError(error instanceof Error ? error.message : 'Failed to set voiceprint as default')
    } finally {
      setLoading(false)
    }
  }
  
  const canProceed = samples.length >= 3 && samples.length <= 5 && samples.every(s => s.wordCount >= 50)
  
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Progress Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-neutral-200/50">
        <div className="container-width section-padding py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Create Your Voiceprint</h1>
              <p className="text-muted mt-1">
                {currentStep === 'goal' && 'Set your writing goals'}
                {currentStep === 'samples' && 'Add your writing samples'}
                {currentStep === 'compute' && 'Computing your unique voice...'}
                {currentStep === 'results' && 'Your Voice Card is ready!'}
              </p>
            </div>
            
            {/* Progress Steps */}
            <div className="flex space-x-8">
              {(['goal', 'samples', 'compute', 'results'] as Step[]).map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${currentStep === step ? 'bg-secondary-600 text-white' : 
                      (['goal', 'samples', 'compute', 'results'] as Step[]).indexOf(currentStep) > index 
                        ? 'bg-success-600 text-white' 
                        : 'bg-neutral-200 text-neutral-500'
                    }
                  `}>
                    {(['goal', 'samples', 'compute', 'results'] as Step[]).indexOf(currentStep) > index ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < 3 && (
                    <div className={`w-16 h-0.5 ml-2 ${
                      (['goal', 'samples', 'compute', 'results'] as Step[]).indexOf(currentStep) > index 
                        ? 'bg-success-600' 
                        : 'bg-neutral-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="container-narrow section-padding py-12">
        {/* Goal Setting Step */}
        {currentStep === 'goal' && (
          <Card className="animate-fade-in-up">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">What's your writing goal?</CardTitle>
              <CardDescription>
                Understanding your purpose helps us create a more personalized voiceprint
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Input
                  label="Voiceprint Name"
                  value={voiceprintName}
                  onChange={(e) => setVoiceprintName(e.target.value)}
                  placeholder="e.g., My Professional Voice, Creative Writing Style"
                  helperText="Give your voiceprint a memorable name"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'professional', label: 'Professional Writing', desc: 'Business emails, reports, proposals' },
                    { id: 'creative', label: 'Creative Writing', desc: 'Stories, blogs, creative content' },
                    { id: 'academic', label: 'Academic Writing', desc: 'Research papers, essays, analysis' },
                    { id: 'general', label: 'General Communication', desc: 'Mix of different writing styles' }
                  ].map((goal) => (
                    <button
                      key={goal.id}
                      className="p-4 border border-neutral-200 rounded-2xl text-left hover:border-secondary-500 hover:bg-secondary-50/50 transition-all duration-200 group"
                      onClick={() => setCurrentStep('samples')}
                    >
                      <h3 className="font-semibold text-neutral-900 group-hover:text-secondary-700">
                        {goal.label}
                      </h3>
                      <p className="text-sm text-muted mt-1">{goal.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Samples Collection Step */}
        {currentStep === 'samples' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Add Your Writing Samples</CardTitle>
                <CardDescription>
                  Upload 3-5 samples of your authentic writing (50+ words each)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-error-50 border border-error-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-error-600 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-error-700">{error}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Add Sample Options */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const title = prompt('Sample title:')
                        const content = prompt('Paste your text:')
                        if (title && content) {
                          addSample(title, content)
                          console.log('Telemetry: vp_samples_added', samples.length + 1)
                        }
                      }}
                      className="flex-1"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Paste Text
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".txt,.pdf,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  
                  {/* Sample List */}
                  <div className="space-y-3">
                    {samples.map((sample) => (
                      <div key={sample.id} className="border border-neutral-200 rounded-2xl p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-neutral-900">{sample.title}</h3>
                              <span className={`
                                px-2 py-1 text-xs rounded-full
                                ${sample.wordCount >= 50 
                                  ? 'bg-success-100 text-success-700'
                                  : 'bg-warning-100 text-warning-700'
                                }
                              `}>
                                {sample.wordCount} words
                              </span>
                            </div>
                            <p className="text-sm text-muted mt-1 line-clamp-2">
                              {sample.content.substring(0, 150)}...
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSample(sample.id)}
                            className="text-error-600 hover:text-error-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Status and Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                    <div className="text-sm text-muted">
                      {samples.length}/5 samples • {samples.filter(s => s.wordCount >= 50).length} ready
                    </div>
                    
                    <Button
                      onClick={createVoiceprint}
                      disabled={!canProceed || loading}
                      loading={loading}
                      className="group"
                    >
                      Create Voiceprint
                      <SparklesIcon className="h-4 w-4 ml-2 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Computing Step */}
        {currentStep === 'compute' && (
          <Card className="text-center">
            <CardContent className="py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-secondary-200 border-t-secondary-600 mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                Analyzing Your Writing Voice...
              </h2>
              <p className="text-muted max-w-md mx-auto">
                We're extracting your unique stylometric patterns and semantic signature. This may take a moment.
              </p>
            </CardContent>
          </Card>
        )}
        
        {/* Results Step - Voice Card */}
        {currentStep === 'results' && voiceCard && (
          <div className="space-y-6">
            <Card className="animate-fade-in-up">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">Your Voice Card</CardTitle>
                <CardDescription className="text-lg">
                  {voiceCard.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Signature Traits */}
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                      <SparklesIcon className="h-5 w-5 text-secondary-600 mr-2" />
                      Signature Traits
                    </h3>
                    <div className="space-y-3">
                      {voiceCard.signature_traits.map((trait, index) => (
                        <div key={index} className="p-3 bg-secondary-50 rounded-xl border border-secondary-200">
                          <h4 className="font-medium text-secondary-900">{trait.name}</h4>
                          <p className="text-sm text-secondary-700 mt-1">{trait.description}</p>
                          <span className="inline-block px-2 py-1 bg-secondary-200 text-secondary-800 text-xs rounded-full mt-2">
                            {trait.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Growth Areas */}
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mr-2" />
                      Growth Opportunities
                    </h3>
                    <div className="space-y-3">
                      {voiceCard.pitfalls.map((pitfall, index) => (
                        <div key={index} className="p-3 bg-warning-50 rounded-xl border border-warning-200">
                          <div className="flex items-start justify-between">
                            <h4 className="font-medium text-warning-900">{pitfall.name}</h4>
                            <span className={`
                              px-2 py-1 text-xs rounded-full
                              ${pitfall.severity === 'high' ? 'bg-error-200 text-error-800' :
                                pitfall.severity === 'medium' ? 'bg-warning-200 text-warning-800' :
                                'bg-neutral-200 text-neutral-800'
                              }
                            `}>
                              {pitfall.severity}
                            </span>
                          </div>
                          <p className="text-sm text-warning-700 mt-1">{pitfall.description}</p>
                          <p className="text-sm text-warning-600 mt-2 italic">{pitfall.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={setAsDefaultAndContinue}
                    size="lg"
                    className="group"
                  >
                    Set as Default Voiceprint
                    <ArrowRightIcon className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}