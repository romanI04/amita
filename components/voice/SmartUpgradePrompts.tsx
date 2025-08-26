'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  SparklesIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

interface UpgradePromptProps {
  trigger: 'analysis_complete' | 'voice_limit' | 'feature_locked' | 'milestone'
  metric?: {
    label: string
    value: string | number
    improvement?: number
  }
  onDismiss?: () => void
  onAction?: () => void
  className?: string
}

export function UpgradePrompt({
  trigger,
  metric,
  onDismiss,
  onAction,
  className = ''
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true)
  
  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }
  
  const prompts = {
    analysis_complete: {
      icon: ChartBarIcon,
      title: "Great progress!",
      message: metric 
        ? `You've improved authenticity by ${metric.improvement}% today`
        : "Your writing is getting more authentic",
      cta: "Go Pro for Voice-Safe Mode",
      color: "from-green-500 to-blue-500"
    },
    voice_limit: {
      icon: SparklesIcon,
      title: "Voice analysis limited",
      message: "Free tier shows basic suggestions. Unlock voice-aware editing with Pro",
      cta: "Unlock Full Voice Analysis",
      color: "from-purple-500 to-pink-500"
    },
    feature_locked: {
      icon: ShieldCheckIcon,
      title: "Premium feature",
      message: "This feature requires a Pro subscription",
      cta: "Upgrade to Pro",
      color: "from-gray-600 to-gray-800"
    },
    milestone: {
      icon: SparklesIcon,
      title: "Milestone reached!",
      message: metric
        ? `You've analyzed ${metric.value} documents this month`
        : "You're making great progress",
      cta: "Get Unlimited with Pro",
      color: "from-yellow-500 to-orange-500"
    }
  }
  
  const prompt = prompts[trigger]
  const Icon = prompt.icon
  
  if (!isVisible) return null
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg ${className}`}
      >
        {/* Gradient bar */}
        <div className={`h-1 bg-gradient-to-r ${prompt.color}`} />
        
        <div className="p-4">
          {/* Close button */}
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
          
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${prompt.color} bg-opacity-10`}>
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                {prompt.title}
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                {prompt.message}
              </p>
              
              {metric && metric.improvement && (
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Progress:</span>
                    <span className="font-mono text-xs">
                      {'●'.repeat(Math.round(metric.improvement / 10))}
                      {'○'.repeat(10 - Math.round(metric.improvement / 10))}
                    </span>
                    <span className="text-xs font-medium text-green-600">
                      +{metric.improvement}%
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Link
                  href="/pricing"
                  onClick={onAction}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors"
                >
                  {prompt.cta}
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Contextual upgrade banner
export function UpgradeBanner({
  analysisCount,
  limit,
  className = ''
}: {
  analysisCount: number
  limit: number
  className?: string
}) {
  const remaining = limit - analysisCount
  const percentage = (analysisCount / limit) * 100
  
  if (remaining > 2) return null // Only show when close to limit
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={`p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {remaining === 0 
                ? "Monthly limit reached"
                : `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining`
              }
            </p>
            <p className="text-xs text-gray-600">
              Upgrade for unlimited analyses and voice-aware editing
            </p>
          </div>
        </div>
        
        <Link
          href="/pricing"
          className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors whitespace-nowrap"
        >
          Go Pro
        </Link>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3">
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${
              percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          />
        </div>
      </div>
    </motion.div>
  )
}

// Value display widget
export function ValueDisplay({
  metrics,
  className = ''
}: {
  metrics: {
    analysesUsed: number
    analysesLimit: number
    wordsDetected: number
    authenticityImproved: number
  }
  className?: string
}) {
  return (
    <div className={`p-4 bg-white rounded-xl border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">This Month (Free Tier)</h3>
        <span className="text-xs text-gray-500 font-mono">
          ••••••••••••••••••••••
        </span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Analyses Used</span>
            <span className="text-xs font-medium text-gray-900">
              {metrics.analysesUsed}/{metrics.analysesLimit}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs">
              {'●'.repeat(Math.round((metrics.analysesUsed / metrics.analysesLimit) * 5))}
              {'○'.repeat(5 - Math.round((metrics.analysesUsed / metrics.analysesLimit) * 5))}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">AI Words Detected</span>
            <span className="text-xs font-medium text-gray-900">
              {metrics.wordsDetected.toLocaleString()}
            </span>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Authenticity Improved</span>
            <span className="text-xs font-medium text-green-600">
              +{metrics.authenticityImproved}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200">
        <Link
          href="/pricing"
          className="block w-full text-center px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-black transition-colors"
        >
          Upgrade for Unlimited
        </Link>
      </div>
    </div>
  )
}

// Inline value proposition
export function InlineValueProp({
  feature,
  className = ''
}: {
  feature: 'voice_safe' | 'unlimited' | 'export' | 'api'
  className?: string
}) {
  const features = {
    voice_safe: {
      icon: ShieldCheckIcon,
      label: "Voice-Safe Mode",
      description: "Only see edits that preserve your voice"
    },
    unlimited: {
      icon: SparklesIcon,
      label: "Unlimited Analyses",
      description: "No monthly limits on text analysis"
    },
    export: {
      icon: ChartBarIcon,
      label: "Advanced Export",
      description: "Export in all formats with full history"
    },
    api: {
      icon: SparklesIcon,
      label: "API Access",
      description: "Integrate with your workflow"
    }
  }
  
  const { icon: Icon, label, description } = features[feature]
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg ${className}`}>
      <Icon className="w-4 h-4 text-gray-600" />
      <div className="text-xs">
        <span className="font-medium text-gray-900">{label}:</span>{' '}
        <span className="text-gray-600">{description}</span>
      </div>
    </div>
  )
}