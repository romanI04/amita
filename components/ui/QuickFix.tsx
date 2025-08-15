'use client'

import React, { useState } from 'react'
import { Button } from './Button'
import { BoltIcon, CheckCircleIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface QuickFixProps {
  originalText: string
  onApply: (fixedText: string) => Promise<void>
  sections: Array<{
    original: string
    suggested: string
    reason: string
  }>
}

export function QuickFix({ originalText, onApply, sections }: QuickFixProps) {
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)
  const [previousText, setPreviousText] = useState<string | null>(null)

  const handleQuickFix = async () => {
    setIsApplying(true)
    setPreviousText(originalText)
    
    try {
      // Apply all suggested fixes at once
      let fixedText = originalText
      for (const section of sections) {
        fixedText = fixedText.replace(section.original, section.suggested)
      }
      
      await onApply(fixedText)
      setIsApplied(true)
    } catch (error) {
      console.error('Quick fix failed:', error)
    } finally {
      setIsApplying(false)
    }
  }

  const handleUndo = async () => {
    if (previousText) {
      await onApply(previousText)
      setIsApplied(false)
      setPreviousText(null)
    }
  }

  if (sections.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
        <CheckCircleIcon className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium text-green-900">Looking good!</p>
          <p className="text-sm text-green-700">No critical issues detected in your text</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BoltIcon className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-primary-900">Quick Fix Available</h3>
          </div>
          <p className="text-sm text-primary-700">
            {sections.length} issue{sections.length > 1 ? 's' : ''} detected. Fix all with one click.
          </p>
        </div>
        
        <AnimatePresence mode="wait">
          {!isApplied ? (
            <motion.div
              key="apply"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                onClick={handleQuickFix}
                disabled={isApplying}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {isApplying ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <BoltIcon className="h-4 w-4 mr-2" />
                    Fix All Issues
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="undo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Applied!</span>
              </div>
              <Button
                onClick={handleUndo}
                variant="ghost"
                size="sm"
                className="text-primary-600"
              >
                <ArrowUturnLeftIcon className="h-4 w-4 mr-1" />
                Undo
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Quick preview of changes */}
      {!isApplied && sections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary-200">
          <p className="text-xs text-primary-600 font-medium mb-2">Preview of changes:</p>
          <div className="space-y-1">
            {sections.slice(0, 2).map((section, index) => (
              <div key={index} className="text-xs text-primary-700">
                • {section.reason}
              </div>
            ))}
            {sections.length > 2 && (
              <div className="text-xs text-primary-600">
                ...and {sections.length - 2} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}