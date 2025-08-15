'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SubtleBlocksProps {
  value: number
  max: number
  color?: 'green' | 'red' | 'blue' | 'violet' | 'yellow'
  isActive?: boolean // When true, shows color
  size?: 'xs' | 'sm' | 'md'
}

export function SubtleBlocks({ 
  value, 
  max, 
  color = 'blue',
  isActive = false,
  size = 'sm'
}: SubtleBlocksProps) {
  const percentage = Math.min(100, Math.round((value / max) * 100))
  // Always use 10 blocks for cleaner percentage representation (10% per dot)
  const blockCount = 10
  const filledBlocks = Math.round((percentage / 100) * blockCount)
  
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    yellow: 'text-yellow-500'
  }

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base'
  }

  return (
    <span className={`font-mono ${sizeClasses[size]} select-none inline-block`}>
      {Array.from({ length: blockCount }).map((_, i) => {
        const isFilled = i < filledBlocks
        const dotChar = isFilled ? '●' : '○'
        
        return (
          <motion.span
            key={i}
            animate={{
              color: isActive && isFilled ? undefined : '#9ca3af',
              scale: isActive && i === filledBlocks - 1 ? [1, 1.2, 1] : 1
            }}
            transition={{
              duration: 0.3,
              delay: isActive ? i * 0.02 : 0,
              scale: {
                duration: 0.3,
                delay: isActive ? i * 0.02 : 0
              }
            }}
            className={isActive && isFilled ? colorClasses[color] : 'text-gray-400'}
            style={{ marginRight: '1px' }}
          >
            {dotChar}
          </motion.span>
        )
      })}
    </span>
  )
}

interface ProcessIndicatorProps {
  isProcessing: boolean
  label?: string
}

export function ProcessIndicator({ isProcessing, label }: ProcessIndicatorProps) {
  const [dots, setDots] = useState(['○', '○', '○', '○', '○', '○', '○', '○'])
  
  useEffect(() => {
    if (!isProcessing) {
      setDots(['○', '○', '○', '○', '○', '○', '○', '○'])
      return
    }

    let index = 0
    const interval = setInterval(() => {
      setDots(prev => {
        const newDots = [...prev]
        newDots[index] = '●'
        if (index > 0) newDots[index - 1] = '○'
        if (index === 0) newDots[newDots.length - 1] = '○'
        index = (index + 1) % newDots.length
        return newDots
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isProcessing])

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <span className="font-mono text-sm" style={{ letterSpacing: '2px' }}>
        {dots.map((dot, i) => (
          <motion.span
            key={i}
            animate={{
              color: dot === '●' && isProcessing ? '#3b82f6' : '#d1d5db'
            }}
            transition={{ duration: 0.2 }}
          >
            {dot}
          </motion.span>
        ))}
      </span>
    </div>
  )
}

interface LiveMetricProps {
  value: number
  label: string
  suffix?: string
  color?: 'green' | 'red' | 'blue' | 'violet'
  isActive?: boolean
}

export function LiveMetric({ value, label, suffix = '', color = 'blue', isActive = false }: LiveMetricProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <motion.span 
          className="text-sm font-medium"
          animate={{
            color: isActive ? '#111827' : '#6b7280'
          }}
        >
          {value}{suffix}
        </motion.span>
      </div>
      <SubtleBlocks value={value} max={100} color={color} isActive={isActive} size="xs" />
    </div>
  )
}

interface TypingFlowProps {
  isTyping: boolean
  wordCount: number
}

export function TypingFlow({ isTyping, wordCount }: TypingFlowProps) {
  const [flow, setFlow] = useState<string[]>(Array(12).fill('·'))
  
  useEffect(() => {
    if (!isTyping) {
      const fadeInterval = setInterval(() => {
        setFlow(prev => {
          const allDots = prev.every(d => d === '·')
          if (allDots) {
            clearInterval(fadeInterval)
            return prev
          }
          return prev.map(d => d === '▪' ? '·' : d)
        })
      }, 100)
      return () => clearInterval(fadeInterval)
    }

    const interval = setInterval(() => {
      setFlow(prev => {
        const newFlow = [...prev]
        newFlow.push(wordCount > 0 ? '▪' : '·')
        return newFlow.slice(-12)
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isTyping, wordCount])

  return (
    <span className="font-mono text-xs" style={{ letterSpacing: '3px' }}>
      {flow.map((dot, i) => (
        <motion.span
          key={`${i}-${Date.now()}`}
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            color: dot === '▪' && isTyping ? '#10b981' : '#d1d5db'
          }}
          transition={{ duration: 0.3 }}
        >
          {dot}
        </motion.span>
      ))}
    </span>
  )
}

interface ProgressDotsProps {
  progress: number // 0-100
  isActive: boolean
  color?: 'green' | 'red' | 'blue' | 'violet'
}

export function ProgressDots({ progress, isActive, color = 'blue' }: ProgressDotsProps) {
  const dots = 20
  const filled = Math.round((progress / 100) * dots)
  
  const colorMap = {
    green: '#10b981',
    red: '#ef4444',
    blue: '#3b82f6',
    violet: '#8b5cf6'
  }

  return (
    <div className="space-y-2">
      <div className="font-mono text-base" style={{ letterSpacing: '4px' }}>
        {Array.from({ length: dots }).map((_, i) => {
          const isFilled = i < filled
          const isCurrentProgress = i === filled - 1
          const char = isFilled ? '●' : '○'
          
          return (
            <motion.span
              key={i}
              animate={{
                color: isActive && isFilled ? colorMap[color] : '#d1d5db',
                scale: isActive && isCurrentProgress ? [1, 1.3, 1] : 1
              }}
              transition={{
                duration: 0.3,
                delay: isActive ? i * 0.01 : 0,
                scale: {
                  repeat: isActive && isCurrentProgress ? Infinity : 0,
                  duration: 0.5
                }
              }}
            >
              {char}
            </motion.span>
          )
        })}
      </div>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 text-center"
        >
          {progress}% complete
        </motion.div>
      )}
    </div>
  )
}

interface StatusLineProps {
  items: Array<{
    label: string
    active: boolean
    color: 'green' | 'red' | 'blue' | 'violet'
  }>
}

export function StatusLine({ items }: StatusLineProps) {
  return (
    <div className="flex items-center justify-center gap-8 text-xs text-gray-500">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span>{item.label}</span>
          <span className="font-mono" style={{ letterSpacing: '2px' }}>
            {item.active ? (
              <span className={
                item.color === 'green' ? 'text-green-500' :
                item.color === 'blue' ? 'text-blue-500' :
                item.color === 'violet' ? 'text-violet-500' :
                'text-red-500'
              }>
                ●●●●●●●●
              </span>
            ) : (
              <span className="text-gray-300">○○○○○○○○</span>
            )}
          </span>
          <span>{item.active ? 'Active' : 'Idle'}</span>
        </div>
      ))}
    </div>
  )
}