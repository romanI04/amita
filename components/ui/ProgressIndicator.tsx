'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ProgressIndicatorProps {
  progress: number // 0-100
  phase?: string
  estimatedTimeRemaining?: number // in seconds
  message?: string
  showETA?: boolean
  isComplete?: boolean
}

export function ProgressIndicator({
  progress,
  phase = 'Processing',
  estimatedTimeRemaining,
  message,
  showETA = true,
  isComplete = false
}: ProgressIndicatorProps) {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isComplete && progress > 0 && progress < 100) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [progress, isComplete])

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getProgressColor = () => {
    if (isComplete) return 'bg-green-500'
    if (progress < 30) return 'bg-primary-400'
    if (progress < 70) return 'bg-primary-500'
    return 'bg-primary-600'
  }

  const getProgressMessage = () => {
    if (isComplete) return 'Complete!'
    if (message) return message
    if (progress < 20) return 'Starting analysis...'
    if (progress < 40) return 'Scanning for AI patterns...'
    if (progress < 60) return 'Analyzing writing style...'
    if (progress < 80) return 'Generating suggestions...'
    if (progress < 95) return 'Finalizing results...'
    return 'Almost done...'
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          ) : (
            <div className="relative">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <motion.div
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
              </motion.div>
            </div>
          )}
          <div>
            <h3 className="font-medium text-gray-900">{phase}</h3>
            <p className="text-sm text-gray-600">{getProgressMessage()}</p>
          </div>
        </div>
        
        {/* Progress percentage */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{Math.round(progress)}%</div>
          {showETA && estimatedTimeRemaining !== undefined && !isComplete && (
            <p className="text-xs text-gray-500">
              ~{formatTime(estimatedTimeRemaining)} remaining
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getProgressColor()} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
        
        {/* Animated shimmer effect */}
        {!isComplete && progress > 0 && progress < 100 && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>

      {/* Additional info */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
        <span>Elapsed: {formatTime(elapsedTime)}</span>
        {progress > 10 && progress < 100 && (
          <span>Processing your text securely...</span>
        )}
      </div>

      {/* Substeps indicator */}
      {!isComplete && progress > 0 && progress < 100 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          <StepIndicator 
            label="Scan" 
            isActive={progress >= 0 && progress < 25}
            isComplete={progress >= 25}
          />
          <StepIndicator 
            label="Analyze" 
            isActive={progress >= 25 && progress < 50}
            isComplete={progress >= 50}
          />
          <StepIndicator 
            label="Process" 
            isActive={progress >= 50 && progress < 75}
            isComplete={progress >= 75}
          />
          <StepIndicator 
            label="Results" 
            isActive={progress >= 75 && progress < 100}
            isComplete={progress >= 100}
          />
        </div>
      )}
    </div>
  )
}

function StepIndicator({ 
  label, 
  isActive, 
  isComplete 
}: { 
  label: string
  isActive: boolean
  isComplete: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`
        h-2 w-2 rounded-full transition-all
        ${isComplete ? 'bg-primary-500' : isActive ? 'bg-primary-300 animate-pulse' : 'bg-gray-200'}
      `} />
      <span className={`
        text-xs transition-colors
        ${isComplete ? 'text-primary-600' : isActive ? 'text-gray-900' : 'text-gray-400'}
      `}>
        {label}
      </span>
    </div>
  )
}