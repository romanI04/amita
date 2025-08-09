'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { OnboardingData } from '@/types'

const STEPS = [
  { id: 1, title: 'Welcome', subtitle: "Let's discover your unique writing voice" },
  { id: 2, title: 'Writing Level', subtitle: 'How would you describe your current writing experience?' },
  { id: 3, title: 'AI Usage', subtitle: 'How often do you currently use AI for writing?' },
  { id: 4, title: 'Goals', subtitle: 'What would you like to achieve with amita.ai?' }
]

const WRITING_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to writing or looking to improve basics' },
  { value: 'intermediate', label: 'Intermediate', description: 'Comfortable with writing, want to refine style' },
  { value: 'advanced', label: 'Advanced', description: 'Experienced writer seeking authenticity tools' },
  { value: 'professional', label: 'Professional', description: 'Writing is part of my career or business' }
]

const AI_USAGE_OPTIONS = [
  { value: 'never', label: 'Never', description: "I don't use AI for writing at all" },
  { value: 'rarely', label: 'Rarely', description: 'Once in a while for specific tasks' },
  { value: 'sometimes', label: 'Sometimes', description: 'A few times per week' },
  { value: 'often', label: 'Often', description: 'Most days for various writing tasks' },
  { value: 'always', label: 'Always', description: 'I rely on AI for most of my writing' }
]

const GOAL_OPTIONS = [
  'Maintain my authentic writing voice',
  'Reduce dependence on AI writing tools',
  'Build confidence in my natural writing abilities',
  'Avoid AI detection in professional work',
  'Improve my writing skills systematically',
  'Balance efficiency with authenticity',
  'Develop a consistent personal writing style',
  'Other'
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    full_name: '',
    writing_level: 'intermediate',
    ai_usage_frequency: 'sometimes',
    primary_goals: []
  })
  const [loading, setLoading] = useState(false)
  const [customGoal, setCustomGoal] = useState('')

  const { updateProfile } = useAuth()
  const router = useRouter()

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleGoalToggle = (goal: string) => {
    const isSelected = formData.primary_goals.includes(goal)
    if (isSelected) {
      setFormData({
        ...formData,
        primary_goals: formData.primary_goals.filter(g => g !== goal)
      })
    } else {
      setFormData({
        ...formData,
        primary_goals: [...formData.primary_goals, goal]
      })
    }
  }

  const handleCustomGoalAdd = () => {
    if (customGoal.trim() && !formData.primary_goals.includes(customGoal.trim())) {
      setFormData({
        ...formData,
        primary_goals: [...formData.primary_goals, customGoal.trim()]
      })
      setCustomGoal('')
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    
    try {
      console.log('Completing onboarding with data:', formData)
      const { error } = await updateProfile({
        full_name: formData.full_name,
        writing_level: formData.writing_level,
        ai_usage_frequency: formData.ai_usage_frequency,
        primary_goals: formData.primary_goals
      })

      if (error) {
        console.error('Error updating profile:', error)
      } else {
        console.log('Profile updated successfully, redirecting to dashboard')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckIcon className="w-10 h-10 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                Welcome to amita.ai!
              </h2>
              <p className="text-neutral-600 mb-6">
                You're about to discover and preserve what makes your writing uniquely yours. 
                In just a few steps, we'll personalize your experience to help you maintain 
                your authentic voice while using AI tools effectively.
              </p>
            </div>
            
            <Input
              label="What's your full name?"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
              className="max-w-md mx-auto"
            />
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                What's your writing experience?
              </h2>
              <p className="text-neutral-600">
                This helps us customize your coaching and analysis
              </p>
            </div>
            
            <div className="space-y-3">
              {WRITING_LEVELS.map((level) => (
                <div
                  key={level.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.writing_level === level.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  onClick={() => setFormData({ ...formData, writing_level: level.value as any })}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      formData.writing_level === level.value
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300'
                    }`}>
                      {formData.writing_level === level.value && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900">{level.label}</h3>
                      <p className="text-sm text-neutral-600">{level.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                How often do you use AI for writing?
              </h2>
              <p className="text-neutral-600">
                No judgment here - we'll help you find the right balance
              </p>
            </div>
            
            <div className="space-y-3">
              {AI_USAGE_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    formData.ai_usage_frequency === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  onClick={() => setFormData({ ...formData, ai_usage_frequency: option.value as any })}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                      formData.ai_usage_frequency === option.value
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300'
                    }`}>
                      {formData.ai_usage_frequency === option.value && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-900">{option.label}</h3>
                      <p className="text-sm text-neutral-600">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                What are your main goals?
              </h2>
              <p className="text-neutral-600">
                Select all that apply - we'll personalize your experience accordingly
              </p>
            </div>
            
            <div className="space-y-3">
              {GOAL_OPTIONS.map((goal) => (
                <div
                  key={goal}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.primary_goals.includes(goal)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                  onClick={() => goal !== 'Other' && handleGoalToggle(goal)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      formData.primary_goals.includes(goal)
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-neutral-300'
                    }`}>
                      {formData.primary_goals.includes(goal) && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="text-neutral-900">{goal}</span>
                  </div>
                </div>
              ))}
              
              <div className="flex space-x-2">
                <Input
                  placeholder="Add your own goal..."
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomGoalAdd()}
                />
                <Button
                  onClick={handleCustomGoalAdd}
                  disabled={!customGoal.trim()}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.full_name.trim().length > 0
      case 2:
      case 3:
        return true
      case 4:
        return formData.primary_goals.length > 0
      default:
        return false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-neutral-600">
              Step {currentStep} of {STEPS.length}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round((currentStep / STEPS.length) * 100)}% complete
            </span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{STEPS[currentStep - 1]?.title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1]?.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          {currentStep === STEPS.length ? (
            <Button
              onClick={handleComplete}
              loading={loading}
              disabled={!canProceed() || loading}
              className="flex items-center space-x-2"
            >
              <span>{loading ? 'Setting up...' : 'Complete Setup'}</span>
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}