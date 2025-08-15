'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LiveBlocksProps {
  value: number // Current value
  max: number // Maximum value
  color: 'green' | 'red' | 'blue' | 'violet' | 'yellow' | 'orange' | 'pink'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  animated?: boolean
  showPercentage?: boolean
}

export function LiveBlocks({ 
  value, 
  max, 
  color, 
  size = 'sm',
  animated = true,
  showPercentage = false
}: LiveBlocksProps) {
  const percentage = Math.min(100, Math.round((value / max) * 100))
  const blockCount = 20
  const filledBlocks = Math.round((percentage / 100) * blockCount)
  
  const colorClasses = {
    green: 'text-green-500',
    red: 'text-red-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    yellow: 'text-yellow-500',
    orange: 'text-orange-500',
    pink: 'text-pink-500'
  }

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono ${sizeClasses[size]} select-none`}>
        {Array.from({ length: blockCount }).map((_, i) => (
          <motion.span
            key={i}
            initial={animated ? { opacity: 0, scale: 0 } : {}}
            animate={{ 
              opacity: 1, 
              scale: 1,
              color: i < filledBlocks ? undefined : '#d1d5db'
            }}
            transition={{ 
              delay: animated ? i * 0.02 : 0,
              duration: 0.3
            }}
            className={i < filledBlocks ? colorClasses[color] : 'text-gray-300'}
          >
            {i < filledBlocks ? '█' : '░'}
          </motion.span>
        ))}
      </span>
      {showPercentage && (
        <span className="text-sm font-medium text-gray-700">{percentage}%</span>
      )}
    </div>
  )
}

interface TypeIndicatorProps {
  isTyping: boolean
  wordsPerMinute?: number
}

export function TypeIndicator({ isTyping, wordsPerMinute = 0 }: TypeIndicatorProps) {
  const [blocks, setBlocks] = useState<string[]>([])
  
  useEffect(() => {
    if (!isTyping) {
      setBlocks([])
      return
    }

    const interval = setInterval(() => {
      const pattern = []
      for (let i = 0; i < 10; i++) {
        const rand = Math.random()
        if (rand > 0.7) pattern.push('█')
        else if (rand > 0.4) pattern.push('▓')
        else if (rand > 0.2) pattern.push('▒')
        else pattern.push('░')
      }
      setBlocks(pattern)
    }, 100)

    return () => clearInterval(interval)
  }, [isTyping])

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">
        {isTyping ? (
          blocks.map((block, i) => (
            <motion.span
              key={`${i}-${block}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={
                block === '█' ? 'text-blue-500' :
                block === '▓' ? 'text-blue-400' :
                block === '▒' ? 'text-blue-300' :
                'text-gray-300'
              }
            >
              {block}
            </motion.span>
          ))
        ) : (
          <span className="text-gray-300">░░░░░░░░░░</span>
        )}
      </span>
      {isTyping && wordsPerMinute > 0 && (
        <span className="text-xs text-gray-500">{wordsPerMinute} WPM</span>
      )}
    </div>
  )
}

interface AnalysisProgressProps {
  progress: number // 0-100
  stage: 'idle' | 'analyzing' | 'complete' | 'error'
}

export function AnalysisProgress({ progress, stage }: AnalysisProgressProps) {
  const [animatedBlocks, setAnimatedBlocks] = useState<string[]>([])
  
  useEffect(() => {
    if (stage !== 'analyzing') {
      if (stage === 'complete') {
        setAnimatedBlocks(Array(20).fill('█'))
      } else if (stage === 'error') {
        setAnimatedBlocks(Array(20).fill('×'))
      } else {
        setAnimatedBlocks(Array(20).fill('░'))
      }
      return
    }

    const interval = setInterval(() => {
      const filled = Math.floor((progress / 100) * 20)
      const blocks = []
      
      for (let i = 0; i < 20; i++) {
        if (i < filled) {
          blocks.push('█')
        } else if (i === filled) {
          // Animated current position
          const pulse = ['█', '▓', '▒', '░']
          blocks.push(pulse[Math.floor(Date.now() / 200) % 4])
        } else {
          blocks.push('░')
        }
      }
      setAnimatedBlocks(blocks)
    }, 200)

    return () => clearInterval(interval)
  }, [progress, stage])

  const getColor = (index: number) => {
    if (stage === 'error') return 'text-red-500'
    if (stage === 'complete') return 'text-green-500'
    if (stage === 'analyzing') {
      const filled = Math.floor((progress / 100) * 20)
      if (index < filled) return 'text-blue-500'
      if (index === filled) return 'text-blue-400'
    }
    return 'text-gray-300'
  }

  return (
    <div className="space-y-2">
      <div className="font-mono text-sm">
        {animatedBlocks.map((block, i) => (
          <span key={i} className={getColor(i)}>
            {block}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {stage === 'analyzing' ? `Analyzing... ${progress}%` :
           stage === 'complete' ? 'Analysis complete' :
           stage === 'error' ? 'Analysis failed' :
           'Ready'}
        </span>
        {stage === 'analyzing' && (
          <span>ETA: {Math.ceil((100 - progress) / 10)}s</span>
        )}
      </div>
    </div>
  )
}

interface CharacterCounterProps {
  current: number
  min: number
  max?: number
}

export function CharacterCounter({ current, min, max = 5000 }: CharacterCounterProps) {
  const percentage = max ? Math.min(100, (current / max) * 100) : (current / min) * 100
  const isReady = current >= min
  const blockCount = 30
  const filledBlocks = Math.floor((current / max) * blockCount)

  return (
    <div className="space-y-2">
      <div className="font-mono text-xs">
        {Array.from({ length: blockCount }).map((_, i) => {
          const isFilled = i < filledBlocks
          const isMinMarker = i === Math.floor((min / max) * blockCount)
          
          return (
            <span
              key={i}
              className={
                isFilled ? (current >= min ? 'text-green-500' : 'text-yellow-500') :
                isMinMarker ? 'text-red-400' :
                'text-gray-300'
              }
            >
              {isFilled ? '█' : isMinMarker ? '|' : '░'}
            </span>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={isReady ? 'text-green-600' : 'text-gray-500'}>
          {current} / {min} min
        </span>
        {!isReady && (
          <span className="text-red-500">
            Need {min - current} more
          </span>
        )}
      </div>
    </div>
  )
}

interface ScoreVisualizerProps {
  scores: {
    authenticity: number
    aiDetection: number
    voiceStrength?: number
    quality?: number
  }
}

export function ScoreVisualizer({ scores }: ScoreVisualizerProps) {
  const metrics = [
    { label: 'Authenticity', value: scores.authenticity, color: 'green' as const },
    { label: 'AI Detection', value: scores.aiDetection, color: 'red' as const },
    { label: 'Voice', value: scores.voiceStrength || 0, color: 'violet' as const },
    { label: 'Quality', value: scores.quality || 0, color: 'blue' as const }
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="space-y-1">
          <div className="text-xs text-gray-600 font-medium">{metric.label}</div>
          <LiveBlocks
            value={metric.value}
            max={100}
            color={metric.color}
            size="xs"
            showPercentage
          />
        </div>
      ))}
    </div>
  )
}

interface WordFlowProps {
  words: number
  isActive: boolean
}

export function WordFlow({ words, isActive }: WordFlowProps) {
  const [flow, setFlow] = useState<string[]>([])
  
  useEffect(() => {
    if (!isActive) {
      setFlow(Array(15).fill('░'))
      return
    }

    const interval = setInterval(() => {
      setFlow(prev => {
        const newFlow = [...prev.slice(1), words > 0 ? '█' : '░']
        return newFlow.length > 15 ? newFlow.slice(-15) : [...Array(15).fill('░'), ...newFlow].slice(-15)
      })
    }, 500)

    return () => clearInterval(interval)
  }, [words, isActive])

  const getIntensityColor = (block: string, index: number) => {
    if (block !== '█') return 'text-gray-300'
    const intensity = (index / 15) * 100
    if (intensity > 80) return 'text-violet-500'
    if (intensity > 60) return 'text-blue-500'
    if (intensity > 40) return 'text-green-500'
    if (intensity > 20) return 'text-yellow-500'
    return 'text-orange-500'
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Flow:</span>
      <span className="font-mono text-sm">
        {flow.map((block, i) => (
          <span key={i} className={getIntensityColor(block, i)}>
            {block}
          </span>
        ))}
      </span>
      <span className="text-xs text-gray-600">{words}w</span>
    </div>
  )
}