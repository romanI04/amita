'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface StepLanguageProps {
  onNext: (config: { language: string; formality: number; warmth: number; directness: number }) => void
  onBack: () => void
}

const languages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
]

export default function StepLanguage({ onNext, onBack }: StepLanguageProps) {
  const [language, setLanguage] = useState('en')
  const [tone, setTone] = useState('balanced')

  const toneOptions = [
    { id: 'casual', label: 'Casual & Friendly', description: 'Conversational and approachable' },
    { id: 'balanced', label: 'Balanced', description: 'Professional yet personable' },
    { id: 'formal', label: 'Formal & Direct', description: 'Structured and authoritative' },
  ]

  const handleNext = () => {
    // Convert tone to slider values for backward compatibility
    const toneMap = {
      casual: { formality: 20, warmth: 80, directness: 30 },
      balanced: { formality: 50, warmth: 60, directness: 50 },
      formal: { formality: 80, warmth: 30, directness: 80 },
    }
    
    const config = {
      language,
      ...toneMap[tone as keyof typeof toneMap]
    }
    
    onNext(config)
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-semibold text-gray-900 mb-4">
          Choose your style
        </h2>
        <p className="text-lg text-gray-600">
          We'll customize analysis for your writing tone
        </p>
      </div>

      <div className="space-y-8">
        {/* Language Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Primary Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tone Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Writing Tone
          </label>
          <div className="space-y-3">
            {toneOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTone(option.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                  tone === option.id
                    ? 'border-gray-800 bg-gray-50 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-12">
        <Button
          onClick={onBack}
          variant="ghost"
          className="text-gray-600 hover:text-gray-900"
        >
          Back
        </Button>
        
        <Button
          onClick={handleNext}
          className="bg-gray-900 text-white hover:bg-gray-800"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}