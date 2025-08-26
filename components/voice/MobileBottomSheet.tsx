'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { VoiceImpactIndicator } from './VoiceImpactIndicator'

interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  section: {
    originalText: string
    replacementText?: string
    reason: string
    confidence: number
    voiceSimilarity?: number
    suggestion?: string
  }
  onApply: () => void
  onDismiss: () => void
  isPremium: boolean
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  section,
  onApply,
  onDismiss,
  isPremium
}: MobileBottomSheetProps) {
  const [dragY, setDragY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose()
    } else {
      setDragY(0)
    }
  }
  
  const handleSwipeRight = () => {
    onApply()
    setTimeout(onClose, 300)
  }
  
  const handleSwipeLeft = () => {
    onDismiss()
    setTimeout(onClose, 300)
  }
  
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: dragY }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden"
            style={{ maxHeight: '80vh' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-4 pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">Suggestion</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: '60vh' }}>
              {/* Voice Impact */}
              {section.voiceSimilarity !== undefined && isPremium && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Voice Impact</span>
                    {section.voiceSimilarity >= 70 ? (
                      <span className="text-xs text-green-600 font-medium">Voice-Safe</span>
                    ) : (
                      <span className="text-xs text-yellow-600 font-medium">May Alter Voice</span>
                    )}
                  </div>
                  <VoiceImpactIndicator 
                    similarity={section.voiceSimilarity} 
                    size="sm" 
                    showPercentage={true}
                    isActive={true}
                  />
                </div>
              )}
              
              {/* Reason */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Why this change?</p>
                <p className="text-sm text-gray-600">{section.reason}</p>
              </div>
              
              {/* Text Comparison */}
              {section.replacementText && (
                <div className="mb-4 space-y-2">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Original</p>
                    <p className="text-sm text-gray-700 line-through">{section.originalText}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Suggested</p>
                    <p className="text-sm text-gray-700 font-medium">{section.replacementText}</p>
                  </div>
                </div>
              )}
              
              {/* Confidence */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Confidence</span>
                <span className="text-sm font-medium text-gray-900">{Math.round(section.confidence)}%</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSwipeLeft}
                  className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Dismiss
                </button>
                <button
                  onClick={handleSwipeRight}
                  className="flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-black transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  Apply
                </button>
              </div>
              
              {/* Swipe Hint */}
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  <span className="font-mono">←</span> Swipe to dismiss • Swipe to apply <span className="font-mono">→</span>
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Mobile-optimized suggestion card
export function MobileSuggestionCard({
  suggestion,
  onTap,
  isPremium,
  className = ''
}: {
  suggestion: {
    text: string
    voiceSimilarity?: number
    confidence: number
  }
  onTap: () => void
  isPremium: boolean
  className?: string
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onTap}
      className={`p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors ${className}`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-gray-700 flex-1">{suggestion.text}</p>
        {suggestion.voiceSimilarity !== undefined && isPremium && (
          <span className="ml-2 font-mono text-xs text-gray-500">
            {suggestion.voiceSimilarity}%
          </span>
        )}
      </div>
      
      {suggestion.voiceSimilarity !== undefined && isPremium && (
        <VoiceImpactIndicator 
          similarity={suggestion.voiceSimilarity} 
          size="xs" 
          showPercentage={false}
        />
      )}
      
      <p className="text-xs text-gray-500 mt-2">Tap to see details</p>
    </motion.div>
  )
}

// Touch gesture indicator
export function TouchGestureHint({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1 }}
      className={`flex items-center justify-center gap-4 p-3 bg-gray-50 rounded-xl ${className}`}
    >
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ x: [-5, 5, -5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center"
        >
          <span className="text-xs">👆</span>
        </motion.div>
        <span className="text-xs text-gray-600">Tap for details</span>
      </div>
      
      <div className="w-px h-6 bg-gray-300" />
      
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ x: [-10, 10, -10] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center"
        >
          <span className="text-xs">👉</span>
        </motion.div>
        <span className="text-xs text-gray-600">Swipe to apply</span>
      </div>
    </motion.div>
  )
}