'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LightBulbIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BookmarkIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkIconSolid } from '@heroicons/react/24/solid'

interface WritingTip {
  id: string
  category: 'authenticity' | 'clarity' | 'engagement' | 'structure'
  title: string
  tip: string
  example?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

const writingTips: WritingTip[] = [
  {
    id: '1',
    category: 'authenticity',
    title: 'Add Personal Anecdotes',
    tip: 'Include brief personal experiences or observations to make your writing more human and relatable.',
    example: 'Instead of "Data shows...", try "In my experience working with data, I\'ve noticed..."',
    difficulty: 'beginner'
  },
  {
    id: '2',
    category: 'clarity',
    title: 'One Idea Per Paragraph',
    tip: 'Keep paragraphs focused on a single main idea. This improves readability and helps readers follow your argument.',
    example: 'Break long paragraphs at natural transition points where you shift topics.',
    difficulty: 'beginner'
  },
  {
    id: '3',
    category: 'engagement',
    title: 'Start with a Hook',
    tip: 'Open with a question, surprising fact, or vivid scene to immediately capture attention.',
    example: '"Have you ever wondered why..." or "Last Tuesday changed everything..."',
    difficulty: 'intermediate'
  },
  {
    id: '4',
    category: 'structure',
    title: 'Use the Rule of Three',
    tip: 'Group information in threes for better memorability and impact.',
    example: 'Life, liberty, and the pursuit of happiness. Fast, good, cheap—pick two.',
    difficulty: 'intermediate'
  },
  {
    id: '5',
    category: 'authenticity',
    title: 'Embrace Minor Imperfections',
    tip: 'Don\'t over-edit. Small variations and occasional informal language make writing feel more genuine.',
    example: 'It\'s okay to start sentences with "And" or "But" occasionally.',
    difficulty: 'advanced'
  },
  {
    id: '6',
    category: 'clarity',
    title: 'Eliminate Hedge Words',
    tip: 'Remove words like "very", "really", "quite", "perhaps" unless they add meaning.',
    example: '"Very important" → "Critical", "Really fast" → "Rapid"',
    difficulty: 'intermediate'
  },
  {
    id: '7',
    category: 'engagement',
    title: 'Vary Sentence Length',
    tip: 'Mix short, punchy sentences with longer, flowing ones. Short sentences grab attention. Longer sentences provide detail and create rhythm.',
    difficulty: 'intermediate'
  },
  {
    id: '8',
    category: 'structure',
    title: 'Signal Transitions',
    tip: 'Use transition words sparingly but effectively: however, therefore, meanwhile, consequently.',
    example: 'Don\'t overuse. One transition per 2-3 paragraphs is usually enough.',
    difficulty: 'beginner'
  }
]

export function WritingTips() {
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [savedTips, setSavedTips] = useState<string[]>([])
  const [hasViewedToday, setHasViewedToday] = useState(false)

  const currentTip = writingTips[currentTipIndex]

  useEffect(() => {
    // Load saved tips and daily tip
    const saved = localStorage.getItem('savedWritingTips')
    if (saved) {
      setSavedTips(JSON.parse(saved))
    }

    // Check if user has viewed today's tip
    const lastViewed = localStorage.getItem('lastTipViewDate')
    const today = new Date().toDateString()
    if (lastViewed !== today) {
      // New day - pick a random tip
      const randomIndex = Math.floor(Math.random() * writingTips.length)
      setCurrentTipIndex(randomIndex)
      localStorage.setItem('lastTipViewDate', today)
      setHasViewedToday(false)
    } else {
      setHasViewedToday(true)
    }
  }, [])

  const nextTip = () => {
    setCurrentTipIndex((prev) => (prev + 1) % writingTips.length)
  }

  const prevTip = () => {
    setCurrentTipIndex((prev) => (prev - 1 + writingTips.length) % writingTips.length)
  }

  const toggleSave = () => {
    const newSaved = savedTips.includes(currentTip.id)
      ? savedTips.filter(id => id !== currentTip.id)
      : [...savedTips, currentTip.id]
    
    setSavedTips(newSaved)
    localStorage.setItem('savedWritingTips', JSON.stringify(newSaved))
  }

  const shareTip = async () => {
    const shareText = `Writing Tip: ${currentTip.title}\n\n${currentTip.tip}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Writing Tip from amita.ai',
          text: shareText
        })
      } catch (error) {
        console.log('Share failed:', error)
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareText)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'authenticity':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'clarity':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'engagement':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'structure':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getDifficultyDots = (difficulty: string) => {
    const count = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3
    return Array(3).fill(0).map((_, i) => (
      <div 
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${
          i < count ? 'bg-primary-500' : 'bg-gray-300'
        }`}
      />
    ))
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-200 rounded-lg">
            <LightBulbIcon className="h-5 w-5 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-semibold text-indigo-900">Daily Writing Tip</h3>
            {!hasViewedToday && (
              <span className="text-xs text-indigo-600">New tip available!</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-600">
            {currentTipIndex + 1}/{writingTips.length}
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTip.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* Category and Difficulty */}
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(currentTip.category)}`}>
              {currentTip.category}
            </span>
            <div className="flex items-center gap-1">
              {getDifficultyDots(currentTip.difficulty)}
            </div>
          </div>

          {/* Tip Content */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">
              {currentTip.title}
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {currentTip.tip}
            </p>
          </div>

          {/* Example */}
          {currentTip.example && (
            <div className="bg-white/70 rounded-lg p-3 border border-indigo-100">
              <p className="text-xs font-medium text-indigo-700 mb-1">Example:</p>
              <p className="text-xs text-gray-600 italic">
                {currentTip.example}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={prevTip}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 text-indigo-600" />
              </button>
              <button
                onClick={nextTip}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4 text-indigo-600" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSave}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title={savedTips.includes(currentTip.id) ? 'Remove from saved' : 'Save tip'}
              >
                {savedTips.includes(currentTip.id) ? (
                  <BookmarkIconSolid className="h-4 w-4 text-indigo-600" />
                ) : (
                  <BookmarkIcon className="h-4 w-4 text-indigo-600" />
                )}
              </button>
              <button
                onClick={shareTip}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title="Share tip"
              >
                <ShareIcon className="h-4 w-4 text-indigo-600" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Saved tips indicator */}
      {savedTips.length > 0 && (
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <p className="text-xs text-indigo-600">
            {savedTips.length} tip{savedTips.length > 1 ? 's' : ''} saved
          </p>
        </div>
      )}
    </div>
  )
}