'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface BeforeAfterCardProps {
  id: string
  title: string
  date: string
  originalText: string
  improvedText: string
  aiReduction: number
  authenticityIncrease: number
  changesApplied: number
}

export function BeforeAfterCard({
  id,
  title,
  date,
  originalText,
  improvedText,
  aiReduction,
  authenticityIncrease,
  changesApplied
}: BeforeAfterCardProps) {
  const [showFull, setShowFull] = useState(false)
  const [view, setView] = useState<'original' | 'improved' | 'compare'>('compare')
  
  // Truncate text for preview
  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }
  
  // Calculate improvement indicators
  const getImprovementDots = () => {
    const totalImprovement = (aiReduction + authenticityIncrease) / 2
    if (totalImprovement >= 30) return '•••'
    if (totalImprovement >= 15) return '••○'
    return '•○○'
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">{title}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{new Date(date).toLocaleDateString()}</span>
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>•</span>
              <span>{changesApplied} changes</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-xs text-gray-400">
                {getImprovementDots()}
              </span>
              <span className="text-xs text-green-600 font-medium">
                +{Math.round((aiReduction + authenticityIncrease) / 2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* View Toggle */}
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs text-gray-500 mr-2">View:</span>
        {['compare', 'original', 'improved'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v as typeof view)}
            className={`px-2 py-1 text-xs rounded transition-all ${
              view === v 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4">
        {view === 'compare' ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">Before:</p>
              <p className="text-xs text-gray-600 line-through opacity-75">
                {showFull ? originalText : truncateText(originalText)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-700 mb-1">After:</p>
              <p className="text-xs text-gray-900">
                {showFull ? improvedText : truncateText(improvedText)}
              </p>
            </div>
          </div>
        ) : view === 'original' ? (
          <div>
            <p className="text-xs text-gray-600">
              {showFull ? originalText : truncateText(originalText)}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-900">
              {showFull ? improvedText : truncateText(improvedText)}
            </p>
          </div>
        )}
        
        {/* Show More/Less */}
        {(originalText.length > 150 || improvedText.length > 150) && (
          <button
            onClick={() => setShowFull(!showFull)}
            className="mt-3 text-xs text-gray-500 hover:text-gray-700"
          >
            {showFull ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
      
      {/* Metrics */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <p className="text-gray-500">AI Reduction</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-medium text-gray-900">-{aiReduction}%</span>
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-green-500">
                ↓
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-500">Authenticity</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-medium text-gray-900">+{authenticityIncrease}%</span>
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-green-500">
                ↑
              </span>
            </div>
          </div>
          <div>
            <p className="text-gray-500">Success</p>
            <div className="flex items-center gap-1 mt-1">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                {'•'.repeat(Math.min(3, Math.ceil(changesApplied / 3)))}
                {'○'.repeat(Math.max(0, 3 - Math.ceil(changesApplied / 3)))}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <button className="text-xs text-gray-600 hover:text-gray-900">
          View Full Analysis
        </button>
        <div className="flex items-center gap-2">
          <button className="text-xs text-gray-600 hover:text-gray-900">
            Apply Similar
          </button>
          <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-gray-300">|</span>
          <button className="text-xs text-gray-600 hover:text-gray-900">
            Share
          </button>
        </div>
      </div>
    </motion.div>
  )
}