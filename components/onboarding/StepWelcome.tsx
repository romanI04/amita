'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'
import { SparklesIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface StepWelcomeProps {
  onNext: () => void
  onSkip?: () => void
}

export default function StepWelcome({ onNext, onSkip }: StepWelcomeProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <SparklesIcon className="h-8 w-8 text-primary-600" />
        </div>
        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          Welcome to amita.ai
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          Create your unique voice profile in 2 minutes to get personalized AI writing analysis
        </p>
      </div>

      {/* Quick value props */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <ShieldCheckIcon className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 text-sm">Preserve Your Voice</h3>
            <p className="text-xs text-gray-600 mt-1">Keep your authentic writing style</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <ChartBarIcon className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 text-sm">AI Detection</h3>
            <p className="text-xs text-gray-600 mt-1">Know your AI risk score instantly</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <SparklesIcon className="h-5 w-5 text-primary-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-gray-900 text-sm">Smart Suggestions</h3>
            <p className="text-xs text-gray-600 mt-1">Get personalized improvements</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onNext}
          size="lg"
          className="w-full bg-primary-600 text-white hover:bg-primary-700"
        >
          Create My Voice Profile
        </Button>
        
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            I'll do this later
          </button>
        )}
      </div>
    </div>
  )
}