'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface BlockVisualizerProps {
  value: number // 0-100
  color: 'red' | 'green' | 'blue' | 'violet' | 'yellow' | 'gray'
  label?: string
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

export function BlockVisualizer({ 
  value, 
  color, 
  label, 
  size = 'md',
  animated = true 
}: BlockVisualizerProps) {
  const [blocks, setBlocks] = useState<string[]>([])
  
  const colorMap = {
    red: 'text-red-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    yellow: 'text-yellow-500',
    gray: 'text-gray-400'
  }

  const sizeMap = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-2xl'
  }

  useEffect(() => {
    const totalBlocks = 20
    const filledBlocks = Math.round((value / 100) * totalBlocks)
    const newBlocks = []
    
    for (let i = 0; i < totalBlocks; i++) {
      if (i < filledBlocks) {
        newBlocks.push('█')
      } else {
        newBlocks.push('░')
      }
    }
    
    setBlocks(newBlocks)
  }, [value])

  return (
    <div className="space-y-1">
      {label && (
        <div className="text-xs text-gray-600 font-medium uppercase tracking-wider">
          {label}
        </div>
      )}
      <div className={`font-mono ${sizeMap[size]} ${colorMap[color]} select-none`}>
        {blocks.map((block, index) => (
          <motion.span
            key={index}
            initial={animated ? { opacity: 0 } : { opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: animated ? index * 0.02 : 0 }}
          >
            {block}
          </motion.span>
        ))}
      </div>
      <div className="text-sm font-semibold text-gray-900">
        {value}%
      </div>
    </div>
  )
}

interface TextPatternVisualizerProps {
  text: string
  highlights?: Array<{
    start: number
    end: number
    color: 'red' | 'green' | 'blue' | 'violet' | 'yellow'
    label?: string
  }>
}

export function TextPatternVisualizer({ text, highlights = [] }: TextPatternVisualizerProps) {
  const colorMap = {
    red: 'bg-red-100 text-red-900 border-red-200',
    green: 'bg-green-100 text-green-900 border-green-200',
    blue: 'bg-blue-100 text-blue-900 border-blue-200',
    violet: 'bg-violet-100 text-violet-900 border-violet-200',
    yellow: 'bg-yellow-100 text-yellow-900 border-yellow-200'
  }

  const getCharacterColor = (index: number) => {
    for (const highlight of highlights) {
      if (index >= highlight.start && index < highlight.end) {
        return colorMap[highlight.color]
      }
    }
    return ''
  }

  return (
    <div className="font-mono text-sm leading-relaxed">
      {text.split('').map((char, index) => {
        const colorClass = getCharacterColor(index)
        if (colorClass) {
          return (
            <span
              key={index}
              className={`${colorClass} px-0.5 rounded border`}
            >
              {char}
            </span>
          )
        }
        return <span key={index}>{char}</span>
      })}
    </div>
  )
}

interface BlockGridProps {
  data: Array<{
    label: string
    value: number
    color: 'red' | 'green' | 'blue' | 'violet' | 'yellow' | 'gray'
  }>
}

export function BlockGrid({ data }: BlockGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {data.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-shadow"
        >
          <BlockVisualizer
            value={item.value}
            color={item.color}
            label={item.label}
            size="sm"
          />
        </motion.div>
      ))}
    </div>
  )
}

interface DynamicBlocksProps {
  intensity: number // 0-100
  color: 'red' | 'green' | 'blue' | 'violet' | 'yellow'
}

export function DynamicBlocks({ intensity, color }: DynamicBlocksProps) {
  const [pattern, setPattern] = useState('')
  
  const colorMap = {
    red: 'text-red-500',
    green: 'text-green-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    yellow: 'text-yellow-500'
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const chars = ['█', '▓', '▒', '░', ' ']
      const weights = [
        intensity / 100,
        (intensity / 100) * 0.8,
        (intensity / 100) * 0.6,
        (intensity / 100) * 0.4,
        1 - (intensity / 100)
      ]
      
      let newPattern = ''
      for (let i = 0; i < 50; i++) {
        const random = Math.random()
        let cumulative = 0
        for (let j = 0; j < chars.length; j++) {
          cumulative += weights[j]
          if (random < cumulative) {
            newPattern += chars[j]
            break
          }
        }
      }
      setPattern(newPattern)
    }, 500)

    return () => clearInterval(interval)
  }, [intensity])

  return (
    <div className={`font-mono text-lg ${colorMap[color]} select-none`}>
      {pattern}
    </div>
  )
}

interface SentenceBlocksProps {
  sentences: string[]
  scores: number[] // 0-100 for each sentence
}

export function SentenceBlocks({ sentences, scores }: SentenceBlocksProps) {
  const getBlockChar = (score: number) => {
    if (score >= 80) return '█'
    if (score >= 60) return '▓'
    if (score >= 40) return '▒'
    if (score >= 20) return '░'
    return '·'
  }

  const getColorClass = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-blue-500'
    if (score >= 40) return 'text-yellow-500'
    if (score >= 20) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-3">
      {sentences.map((sentence, index) => (
        <div key={index} className="space-y-1">
          <div className="text-sm text-gray-700 line-clamp-2">
            {sentence}
          </div>
          <div className="flex items-center gap-2">
            <div className={`font-mono text-2xl ${getColorClass(scores[index])}`}>
              {Array(10).fill(0).map((_, i) => (
                <span key={i}>
                  {i < Math.round(scores[index] / 10) ? getBlockChar(scores[index]) : '·'}
                </span>
              ))}
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {scores[index]}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}