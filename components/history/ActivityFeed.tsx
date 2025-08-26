'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClockIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import type { ChangeLogEntry } from '@/types'

interface ActivityFeedProps {
  changes: ChangeLogEntry[]
  onRevert?: (changeId: string) => void
  onExport?: () => void
  className?: string
}

export function ActivityFeed({
  changes,
  onRevert,
  onExport,
  className = ''
}: ActivityFeedProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const handleCopyChange = (change: ChangeLogEntry) => {
    const text = `Changed "${change.originalText}" to "${change.modifiedText}" (Voice: ${change.voiceSimilarityBefore}% → ${change.voiceSimilarityAfter}%)`
    navigator.clipboard.writeText(text)
    setCopiedId(change.id)
    setTimeout(() => setCopiedId(null), 2000)
  }
  
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }
  
  const getActionIcon = (action: ChangeLogEntry['action']) => {
    switch (action) {
      case 'applied':
        return CheckIcon
      case 'dismissed':
        return XMarkIcon
      case 'reverted':
        return ArrowPathIcon
      default:
        return ClockIcon
    }
  }
  
  const getActionColor = (action: ChangeLogEntry['action']) => {
    switch (action) {
      case 'applied':
        return 'text-green-600'
      case 'dismissed':
        return 'text-red-600'
      case 'reverted':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }
  
  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ClockIcon className="w-4 h-4 text-gray-600" />
        <span className="text-sm text-gray-700">Activity</span>
        {changes.length > 0 && (
          <span className="px-1.5 py-0.5 bg-gray-900 text-white text-xs rounded-full">
            {changes.length}
          </span>
        )}
      </button>
      
      {/* Activity Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-96 max-h-96 bg-white border border-gray-300 rounded-lg shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">Activity Log</h3>
                  <span className="text-xs text-gray-500 font-mono">
                    ••••••••
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {onExport && (
                    <button
                      onClick={onExport}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      Export
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Activity List */}
            <div className="overflow-y-auto max-h-80">
              {changes.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500">No changes yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Applied edits will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {changes.map((change) => {
                    const Icon = getActionIcon(change.action)
                    const colorClass = getActionColor(change.action)
                    const voiceDelta = change.voiceSimilarityAfter - change.voiceSimilarityBefore
                    
                    return (
                      <motion.div
                        key={change.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">
                                {formatTime(change.timestamp)}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleCopyChange(change)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Copy change"
                                >
                                  <DocumentDuplicateIcon className="w-3 h-3 text-gray-500" />
                                </button>
                                {onRevert && change.action === 'applied' && (
                                  <button
                                    onClick={() => onRevert(change.id)}
                                    className="p-1 hover:bg-gray-200 rounded"
                                    title="Revert change"
                                  >
                                    <ArrowPathIcon className="w-3 h-3 text-gray-500" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-xs space-y-1">
                              <div className="text-gray-600">
                                <span className="line-through">{change.originalText}</span>
                                <span className="mx-1">→</span>
                                <span className="font-medium">{change.modifiedText}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Voice:</span>
                                <span className="font-mono">
                                  {change.voiceSimilarityBefore}% → {change.voiceSimilarityAfter}%
                                </span>
                                <span className={`font-medium ${voiceDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ({voiceDelta >= 0 ? '+' : ''}{voiceDelta}%)
                                </span>
                              </div>
                            </div>
                            
                            {copiedId === change.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xs text-green-600 mt-1"
                              >
                                Copied!
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            {changes.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {changes.filter(c => c.action === 'applied').length} applied,{' '}
                    {changes.filter(c => c.action === 'dismissed').length} dismissed
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm('Clear all activity history?')) {
                        // Clear handler would be passed from parent
                      }
                    }}
                    className="text-gray-500 hover:text-red-600"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Compact activity indicator
export function ActivityIndicator({ 
  changeCount,
  className = '' 
}: { 
  changeCount: number
  className?: string 
}) {
  if (changeCount === 0) return null
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
      <span className="text-xs text-gray-600">{changeCount} changes</span>
    </div>
  )
}

// Summary stats for activity
export function ActivitySummary({
  changes,
  className = ''
}: {
  changes: ChangeLogEntry[]
  className?: string
}) {
  const applied = changes.filter(c => c.action === 'applied').length
  const avgVoiceImpact = applied > 0
    ? changes
        .filter(c => c.action === 'applied')
        .reduce((sum, c) => sum + (c.voiceSimilarityAfter - c.voiceSimilarityBefore), 0) / applied
    : 0
  
  return (
    <div className={`flex items-center gap-4 text-xs ${className}`}>
      <div>
        <span className="text-gray-500">Changes:</span>
        <span className="ml-1 font-medium text-gray-900">{applied}</span>
      </div>
      
      <div>
        <span className="text-gray-500">Avg voice impact:</span>
        <span className={`ml-1 font-medium ${avgVoiceImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {avgVoiceImpact >= 0 ? '+' : ''}{avgVoiceImpact.toFixed(1)}%
        </span>
      </div>
      
      <span className="text-gray-300 font-mono">••••</span>
    </div>
  )
}