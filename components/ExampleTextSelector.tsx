'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exampleTexts, type ExampleText } from '@/lib/examples'
import { 
  DocumentTextIcon,
  SparklesIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

interface ExampleTextSelectorProps {
  onSelect: (text: string, title: string) => void
  className?: string
}

export function ExampleTextSelector({ onSelect, className = '' }: ExampleTextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'academic' | 'business' | 'creative'>('all')

  const filteredExamples = selectedCategory === 'all' 
    ? exampleTexts 
    : exampleTexts.filter(ex => ex.category === selectedCategory)

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'academic':
        return <AcademicCapIcon className="h-5 w-5" />
      case 'business':
        return <BriefcaseIcon className="h-5 w-5" />
      case 'creative':
        return <PencilSquareIcon className="h-5 w-5" />
      default:
        return <DocumentTextIcon className="h-5 w-5" />
    }
  }

  const handleSelect = (example: ExampleText) => {
    onSelect(example.content, example.title)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`${className}`}
      >
        <SparklesIcon className="h-4 w-4 mr-2" />
        Try Example Text
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Choose Example Text</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Select a pre-written example to test the analysis
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All Examples
                  </button>
                  <button
                    onClick={() => setSelectedCategory('academic')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'academic'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Academic
                  </button>
                  <button
                    onClick={() => setSelectedCategory('business')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'business'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Business
                  </button>
                  <button
                    onClick={() => setSelectedCategory('creative')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'creative'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Creative
                  </button>
                </div>
              </div>

              {/* Example List */}
              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {filteredExamples.map((example) => (
                  <motion.div
                    key={example.id}
                    whileHover={{ scale: 1.02 }}
                    className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleSelect(example)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(example.category)}
                        <h3 className="font-medium text-gray-900">{example.title}</h3>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{example.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{example.wordCount} words</span>
                      <span>•</span>
                      <span>AI Risk: {example.aiConfidence}%</span>
                      <span>•</span>
                      <span>Authenticity: {example.authenticityScore}%</span>
                    </div>
                    {/* Preview */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {example.content.substring(0, 150)}...
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  These examples demonstrate various writing styles and AI detection patterns
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}