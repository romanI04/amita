'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface Pattern {
  id: string
  type: 'style' | 'timing' | 'quality' | 'habit'
  severity: 'info' | 'warning' | 'success'
  title: string
  description: string
  action?: string
  frequency?: number // How often this occurs (percentage)
  examples?: string[]
}

interface PatternInsightsProps {
  patterns: Pattern[]
  isPremium?: boolean
}

const DEFAULT_PATTERNS: Pattern[] = [
  {
    id: 'passive_monday',
    type: 'timing',
    severity: 'warning',
    title: 'Monday Passive Voice',
    description: 'You use passive voice 3x more on Mondays',
    action: 'Start Monday writing with active voice exercises',
    frequency: 75,
    examples: ['was written by', 'has been completed', 'is being reviewed']
  },
  {
    id: 'email_ai',
    type: 'quality',
    severity: 'warning',
    title: 'Email AI Detection',
    description: 'Your emails sound 40% more AI than reports',
    action: 'Add personal touches to email openings',
    frequency: 40,
    examples: ['I hope this finds you well', 'As per our discussion']
  },
  {
    id: 'morning_clarity',
    type: 'timing',
    severity: 'success',
    title: 'Morning Clarity',
    description: 'Your morning writing scores 20% higher in clarity',
    action: 'Schedule important writing for mornings',
    frequency: 80,
    examples: []
  },
  {
    id: 'repetitive_transitions',
    type: 'style',
    severity: 'info',
    title: 'Transition Patterns',
    description: 'You use "However" to start 30% of paragraphs',
    action: 'Vary transition words: Nevertheless, Yet, Still',
    frequency: 30,
    examples: ['However', 'Furthermore', 'Additionally']
  }
]

export function PatternInsights({ 
  patterns = DEFAULT_PATTERNS,
  isPremium = false 
}: PatternInsightsProps) {
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'style' | 'timing' | 'quality' | 'habit'>('all')
  
  // Filter patterns
  const filteredPatterns = patterns.filter(p => 
    filter === 'all' || p.type === filter
  )
  
  // Sort by severity and frequency
  const sortedPatterns = [...filteredPatterns].sort((a, b) => {
    const severityOrder = { warning: 0, info: 1, success: 2 }
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return (b.frequency || 0) - (a.frequency || 0)
  })
  
  // Get severity indicator
  const getSeverityDots = (severity: string) => {
    switch (severity) {
      case 'warning': return '○○○'
      case 'success': return '•••'
      case 'info': return '••○'
      default: return '•••'
    }
  }
  
  // Get type icon
  const getTypeIndicator = (type: string) => {
    switch (type) {
      case 'style': return '§'
      case 'timing': return '⌚'
      case 'quality': return '✓'
      case 'habit': return '↻'
      default: return '•'
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••
          </span>
          {' '}Pattern Recognition
        </h3>
        <p className="text-xs text-gray-500">
          AI-detected patterns in your writing behavior
        </p>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        {['all', 'style', 'timing', 'quality', 'habit'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={`px-3 py-1.5 text-xs rounded-full transition-all ${
              filter === f 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Patterns List with inline blur for non-premium */}
      <div className="relative">
        <div className={`space-y-3 ${!isPremium ? 'filter blur-sm pointer-events-none select-none' : ''}`}>
          {sortedPatterns.map((pattern, idx) => (
          <motion.div
            key={pattern.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`
              border rounded-lg transition-all cursor-pointer
              ${expandedPattern === pattern.id ? 'border-gray-400 shadow-sm' : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => setExpandedPattern(expandedPattern === pattern.id ? null : pattern.id)}
          >
            {/* Pattern Header */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span 
                    className="text-xs text-gray-400 mt-0.5"
                    style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {pattern.title}
                      </span>
                      <span className={`text-xs ${
                        pattern.severity === 'warning' ? 'text-orange-600' :
                        pattern.severity === 'success' ? 'text-green-600' :
                        'text-blue-600'
                      }`}>
                        {getTypeIndicator(pattern.type)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {pattern.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {pattern.frequency && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Frequency</p>
                      <p className="text-sm font-medium text-gray-900">{pattern.frequency}%</p>
                    </div>
                  )}
                  <span 
                    style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                    className={`text-xs ${
                      pattern.severity === 'warning' ? 'text-orange-500' :
                      pattern.severity === 'success' ? 'text-green-500' :
                      'text-blue-500'
                    }`}
                  >
                    {getSeverityDots(pattern.severity)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {expandedPattern === pattern.id && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                {pattern.action && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Recommended Action:</p>
                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                      {pattern.action}
                    </p>
                  </div>
                )}
                
                {pattern.examples && pattern.examples.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-1">Examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {pattern.examples.map((example, i) => (
                        <span 
                          key={i}
                          className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                          style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                        >
                          "{example}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <button className="mt-3 text-xs text-gray-900 font-medium hover:underline">
                  View occurrences →
                </button>
              </div>
            )}
          </motion.div>
          ))}
        </div>
        
        {/* Sticky upgrade bar for non-premium */}
        {!isPremium && (
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-8 pb-4 -mb-4">
            <div className="bg-gray-900 text-white rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Unlock Pattern Insights</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Get detailed analysis of your writing patterns and personalized recommendations
                  </p>
                </div>
                <button className="px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded hover:bg-gray-100 transition-colors">
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Insights Summary */}
      {isPremium && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-3">Quick Actions</h4>
          <div className="space-y-2">
            {sortedPatterns.slice(0, 3).filter(p => p.action).map((pattern, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span 
                  style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                  className="text-xs text-gray-400 mt-0.5"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <p className="text-xs text-gray-600">
                  {pattern.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}