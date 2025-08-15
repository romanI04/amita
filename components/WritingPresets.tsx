'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  AcademicCapIcon,
  BriefcaseIcon,
  PencilSquareIcon,
  SparklesIcon,
  CheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

export interface WritingPreset {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  settings: {
    formality: 'casual' | 'neutral' | 'formal'
    tone: string
    vocabulary: 'simple' | 'moderate' | 'advanced'
    sentenceLength: 'short' | 'varied' | 'long'
    focusAreas: string[]
  }
  color: string
}

const presets: WritingPreset[] = [
  {
    id: 'academic',
    name: 'Academic Writing',
    description: 'Formal, evidence-based writing with citations',
    icon: <AcademicCapIcon className="h-5 w-5" />,
    settings: {
      formality: 'formal',
      tone: 'objective and analytical',
      vocabulary: 'advanced',
      sentenceLength: 'varied',
      focusAreas: ['Remove colloquialisms', 'Add academic transitions', 'Strengthen arguments']
    },
    color: 'purple'
  },
  {
    id: 'business',
    name: 'Business Professional',
    description: 'Clear, concise, and action-oriented',
    icon: <BriefcaseIcon className="h-5 w-5" />,
    settings: {
      formality: 'neutral',
      tone: 'professional and direct',
      vocabulary: 'moderate',
      sentenceLength: 'short',
      focusAreas: ['Improve clarity', 'Add action verbs', 'Remove redundancy']
    },
    color: 'blue'
  },
  {
    id: 'creative',
    name: 'Creative Writing',
    description: 'Expressive, unique, and engaging',
    icon: <PencilSquareIcon className="h-5 w-5" />,
    settings: {
      formality: 'casual',
      tone: 'creative and engaging',
      vocabulary: 'moderate',
      sentenceLength: 'varied',
      focusAreas: ['Add vivid descriptions', 'Vary sentence structure', 'Enhance voice']
    },
    color: 'green'
  },
  {
    id: 'authentic',
    name: 'Maximum Authenticity',
    description: 'Reduce AI detection to minimum',
    icon: <SparklesIcon className="h-5 w-5" />,
    settings: {
      formality: 'neutral',
      tone: 'natural and conversational',
      vocabulary: 'moderate',
      sentenceLength: 'varied',
      focusAreas: ['Add personal touches', 'Include minor imperfections', 'Vary patterns']
    },
    color: 'primary'
  }
]

interface WritingPresetsProps {
  onSelect: (preset: WritingPreset) => void
  currentPresetId?: string
}

export function WritingPresets({ onSelect, currentPresetId }: WritingPresetsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const getColorClasses = (color: string, isSelected: boolean, isHovered: boolean) => {
    const baseColors: Record<string, string> = {
      purple: 'border-purple-200 bg-purple-50',
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      primary: 'border-primary-200 bg-primary-50'
    }
    
    const hoverColors: Record<string, string> = {
      purple: 'border-purple-300 bg-purple-100',
      blue: 'border-blue-300 bg-blue-100',
      green: 'border-green-300 bg-green-100',
      primary: 'border-primary-300 bg-primary-100'
    }
    
    const selectedColors: Record<string, string> = {
      purple: 'border-purple-500 bg-purple-100 ring-2 ring-purple-500/20',
      blue: 'border-blue-500 bg-blue-100 ring-2 ring-blue-500/20',
      green: 'border-green-500 bg-green-100 ring-2 ring-green-500/20',
      primary: 'border-primary-500 bg-primary-100 ring-2 ring-primary-500/20'
    }
    
    if (isSelected) return selectedColors[color]
    if (isHovered) return hoverColors[color]
    return baseColors[color]
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">Quick Presets</h3>
        <span className="text-xs text-gray-500">Click to apply style</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {presets.map((preset) => {
          const isSelected = currentPresetId === preset.id
          const isHovered = hoveredId === preset.id
          
          return (
            <motion.button
              key={preset.id}
              onClick={() => onSelect(preset)}
              onMouseEnter={() => setHoveredId(preset.id)}
              onMouseLeave={() => setHoveredId(null)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-4 rounded-lg border-2 transition-all text-left
                ${getColorClasses(preset.color, isSelected, isHovered)}
              `}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="bg-white rounded-full p-1 shadow-sm">
                    <CheckIcon className="h-3 w-3 text-primary-600" />
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${preset.color === 'purple' ? 'bg-purple-200 text-purple-700' :
                    preset.color === 'blue' ? 'bg-blue-200 text-blue-700' :
                    preset.color === 'green' ? 'bg-green-200 text-green-700' :
                    'bg-primary-200 text-primary-700'}
                `}>
                  {preset.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {preset.description}
                  </p>
                  
                  {/* Quick preview of focus areas */}
                  <div className="flex flex-wrap gap-1">
                    {preset.settings.focusAreas.slice(0, 2).map((area, index) => (
                      <span 
                        key={index}
                        className="text-xs px-2 py-0.5 bg-white/60 rounded-full text-gray-700"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Hover effect arrow */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </motion.div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Applied preset info */}
      {currentPresetId && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <p className="text-sm text-gray-700">
            <span className="font-medium">Active preset:</span>{' '}
            {presets.find(p => p.id === currentPresetId)?.name}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your text will be optimized for this writing style
          </p>
        </motion.div>
      )}
    </div>
  )
}