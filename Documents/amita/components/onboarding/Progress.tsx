'use client'

import React from 'react'

interface ProgressProps {
  currentStep: number
  totalSteps: number
}

export default function Progress({ currentStep, totalSteps }: ProgressProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              index < currentStep ? 'bg-gray-800' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}