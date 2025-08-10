'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

interface StepWelcomeProps {
  onNext: () => void
}

export default function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="text-center max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-gray-900 mb-4">
        Welcome to amita.ai
      </h1>
      
      <p className="text-lg text-gray-600 mb-12 leading-relaxed">
        Let's set up your writing voice profile in just a few steps.
      </p>

      <Button
        onClick={onNext}
        size="lg"
        className="bg-gray-900 text-white hover:bg-gray-800 px-8 py-3"
      >
        Get started
      </Button>
    </div>
  )
}