'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Progress from './Progress'
import StepWelcome from './StepWelcome'
import StepSamples from './StepSamples'

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [skipped, setSkipped] = useState(false)
  const router = useRouter()

  const nextStep = () => {
    setCurrentStep(2)
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  const handleSkip = () => {
    setSkipped(true)
    // Navigate to dashboard with a flag that onboarding was skipped
    router.push('/dashboard?onboarding=skipped')
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-soft">
      <div className="max-w-4xl mx-auto">
        {/* Skip button in top right */}
        <div className="flex justify-between items-center mb-6">
          <Progress currentStep={currentStep} totalSteps={2} />
          {currentStep === 1 && (
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Skip for now →
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          {currentStep === 1 && (
            <StepWelcome onNext={nextStep} onSkip={handleSkip} />
          )}
          
          {currentStep === 2 && (
            <StepSamples
              onBack={prevStep}
              onSkip={handleSkip}
              language="en"
            />
          )}
        </div>
      </div>
    </div>
  )
}