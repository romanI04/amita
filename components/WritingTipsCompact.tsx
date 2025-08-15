'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface WritingTip {
  id: string
  category: 'authenticity' | 'clarity' | 'engagement' | 'structure'
  title: string
  tip: string
  quickAction: string
}

const writingTips: WritingTip[] = [
  {
    id: '1',
    category: 'authenticity',
    title: 'Add Personal Touch',
    tip: 'Include brief personal experiences to make your writing more human.',
    quickAction: 'Try: "In my experience..."'
  },
  {
    id: '2',
    category: 'clarity',
    title: 'One Idea Per Paragraph',
    tip: 'Keep paragraphs focused on a single main idea for better flow.',
    quickAction: 'Break at transition points'
  },
  {
    id: '3',
    category: 'engagement',
    title: 'Start with a Hook',
    tip: 'Open with a question or surprising fact to capture attention.',
    quickAction: 'Try: "Have you ever..."'
  },
  {
    id: '4',
    category: 'structure',
    title: 'Rule of Three',
    tip: 'Group information in threes for better memorability.',
    quickAction: 'Fast, good, cheap—pick two'
  },
  {
    id: '5',
    category: 'authenticity',
    title: 'Embrace Imperfections',
    tip: 'Small variations make writing feel more genuine.',
    quickAction: 'Start with "And" or "But"'
  },
  {
    id: '6',
    category: 'clarity',
    title: 'Cut Hedge Words',
    tip: 'Remove "very", "really", "quite" unless essential.',
    quickAction: '"Very important" → "Critical"'
  },
  {
    id: '7',
    category: 'engagement',
    title: 'Vary Sentence Length',
    tip: 'Mix short and long sentences. Short grabs. Long flows beautifully.',
    quickAction: 'Alternate rhythm'
  },
  {
    id: '8',
    category: 'structure',
    title: 'Smart Transitions',
    tip: 'Use transition words sparingly but effectively.',
    quickAction: 'One per 2-3 paragraphs'
  }
]

export function WritingTipsCompact() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  
  const currentTip = writingTips[currentTipIndex]

  useEffect(() => {
    // Get daily tip based on date
    const today = new Date().toDateString()
    const savedDate = localStorage.getItem('tipDate')
    
    if (savedDate !== today) {
      const dailyIndex = new Date().getDate() % writingTips.length
      setCurrentTipIndex(dailyIndex)
      localStorage.setItem('tipDate', today)
    }
  }, [])

  useEffect(() => {
    if (!isAutoRotating) return
    
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % writingTips.length)
    }, 8000) // Rotate every 8 seconds

    return () => clearInterval(timer)
  }, [isAutoRotating])

  const nextTip = () => {
    setIsAutoRotating(false)
    setCurrentTipIndex((prev) => (prev + 1) % writingTips.length)
  }

  const getCategoryIcon = () => {
    return <InformationCircleIcon className="h-4 w-4" />
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'authenticity':
        return 'text-purple-600 bg-purple-50'
      case 'clarity':
        return 'text-blue-600 bg-blue-50'
      case 'engagement':
        return 'text-green-600 bg-green-50'
      case 'structure':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      {/* Compact Header Bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${getCategoryColor(currentTip.category)}`}>
              {getCategoryIcon()}
            </div>
            <span className="text-xs font-medium text-gray-700">
              Writing Insight
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(currentTip.category)}`}>
              {currentTip.category}
            </span>
          </div>
          <button
            onClick={nextTip}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Next tip"
          >
            <ArrowPathIcon className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tip Content - Compact */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTip.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="p-4"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-sm mb-1">
                {currentTip.title}
              </h4>
              <p className="text-xs text-gray-600 leading-relaxed mb-2">
                {currentTip.tip}
              </p>
              <div className="inline-flex items-center gap-1 text-xs">
                <span className="text-gray-700 font-medium">Application:</span>
                <code className="px-1.5 py-0.5 bg-gray-50 rounded text-gray-700">
                  {currentTip.quickAction}
                </code>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress Dots */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 justify-center">
          {writingTips.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsAutoRotating(false)
                setCurrentTipIndex(index)
              }}
              className={`transition-all ${
                index === currentTipIndex 
                  ? 'w-4 h-1 bg-green-600 rounded-full' 
                  : 'w-1 h-1 bg-gray-300 rounded-full hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}