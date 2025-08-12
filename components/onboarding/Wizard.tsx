'use client'

import React, { useState } from 'react'
import Progress from './Progress'
import StepWelcome from './StepWelcome'
import StepGoals from './StepGoals'
import StepLanguage from './StepLanguage'
import StepSamples from './StepSamples'

interface OnboardingData {
  goals: string[]
  language: string
  formality: number
  warmth: number
  directness: number
}

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<OnboardingData>({
    goals: [],
    language: 'en',
    formality: 50,
    warmth: 50,
    directness: 50
  })

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleGoalsNext = (selectedGoals: string[]) => {
    setData(prev => ({ ...prev, goals: selectedGoals }))
    nextStep()
  }

  const handleLanguageNext = (config: { language: string; formality: number; warmth: number; directness: number }) => {
    setData(prev => ({ ...prev, ...config }))
    nextStep()
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Progress currentStep={currentStep} totalSteps={4} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12">
          {currentStep === 1 && (
            <StepWelcome onNext={nextStep} />
          )}
          
          {currentStep === 2 && (
            <StepGoals
              onNext={handleGoalsNext}
              onBack={prevStep}
            />
          )}
          
          {currentStep === 3 && (
            <StepLanguage
              onNext={handleLanguageNext}
              onBack={prevStep}
            />
          )}
          
          {currentStep === 4 && (
            <StepSamples
              onBack={prevStep}
              language={data.language}
            />
          )}
        </div>
      </div>
    </div>
  )
}