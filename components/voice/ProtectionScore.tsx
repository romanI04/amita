'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface Vulnerability {
  id: string
  severity: 'low' | 'medium' | 'high'
  description: string
  fix: string
}

interface ProtectionScoreProps {
  score?: number // 0-100
  vulnerabilities?: Vulnerability[]
  isPremium?: boolean
}

const DEFAULT_VULNERABILITIES: Vulnerability[] = [
  {
    id: 'transitions',
    severity: 'high',
    description: 'Predictable transition phrases',
    fix: 'Vary your connecting words and phrases'
  },
  {
    id: 'sentence_starts',
    severity: 'medium',
    description: 'Repetitive sentence openings',
    fix: 'Mix up how you begin sentences'
  },
  {
    id: 'vocabulary',
    severity: 'low',
    description: 'Limited vocabulary range',
    fix: 'Introduce more varied word choices'
  }
]

export function ProtectionScore({ 
  score = 65,
  vulnerabilities = DEFAULT_VULNERABILITIES,
  isPremium = false
}: ProtectionScoreProps) {
  
  // Calculate dot meter representation
  const dotCount = 10
  const filledDots = Math.round((score / 100) * dotCount)
  
  // Determine protection level
  const getProtectionLevel = () => {
    if (score >= 80) return { label: 'Well Protected', color: 'text-green-600' }
    if (score >= 60) return { label: 'Moderate Protection', color: 'text-yellow-600' }
    if (score >= 40) return { label: 'Vulnerable', color: 'text-orange-600' }
    return { label: 'High Risk', color: 'text-red-600' }
  }
  
  const protection = getProtectionLevel()
  
  // Sort vulnerabilities by severity
  const sortedVulnerabilities = useMemo(() => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return [...vulnerabilities].sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    )
  }, [vulnerabilities])
  
  // Get severity indicator
  const getSeverityDots = (severity: string) => {
    switch (severity) {
      case 'high': return '○○○'
      case 'medium': return '••○'
      case 'low': return '•••'
      default: return '•••'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••••
          </span>
          {' '}Voice Cloning Protection™
        </h3>
        <p className="text-xs text-gray-500">
          How difficult is it for AI to replicate your voice?
        </p>
      </div>

      {/* Score Display */}
      <div className={`${!isPremium ? 'filter blur-sm pointer-events-none' : ''}`}>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {/* Score Number */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-3xl font-light text-gray-900">
                {score}%
              </p>
              <p className={`text-sm font-medium mt-1 ${protection.color}`}>
                {protection.label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Protection Level</p>
              <div style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-lg">
                {'•'.repeat(filledDots)}{'○'.repeat(dotCount - filledDots)}
              </div>
            </div>
          </div>

          {/* Visual Meter */}
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-gray-400 to-gray-900"
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>

          {/* Score Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-gray-500">Uniqueness</p>
              <p className="font-medium text-gray-900 mt-1">
                {Math.round(score * 0.4)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Complexity</p>
              <p className="font-medium text-gray-900 mt-1">
                {Math.round(score * 0.35)}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Consistency</p>
              <p className="font-medium text-gray-900 mt-1">
                {Math.round(score * 0.25)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerabilities */}
      <div className={`${!isPremium ? 'filter blur-sm pointer-events-none' : ''}`}>
        <h4 className="text-xs font-medium text-gray-700 mb-3">
          Detected Vulnerabilities
        </h4>
        <div className="space-y-2">
          {sortedVulnerabilities.map((vuln, idx) => (
            <motion.div
              key={vuln.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-xs text-gray-400"
                      style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {vuln.description}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">
                    {vuln.fix}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="text-xs"
                    style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                  >
                    {getSeverityDots(vuln.severity)}
                  </span>
                  <span className={`text-xs ${
                    vuln.severity === 'high' ? 'text-red-600' :
                    vuln.severity === 'medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {vuln.severity}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Items */}
      {isPremium && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-3">
            Quick Actions to Improve Protection
          </h4>
          <div className="space-y-2">
            <button className="w-full text-left flex items-center justify-between p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all">
              <span className="text-xs text-gray-600">Analyze more writing samples</span>
              <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>→</span>
            </button>
            <button className="w-full text-left flex items-center justify-between p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all">
              <span className="text-xs text-gray-600">Enable Smart Voice Locks</span>
              <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>→</span>
            </button>
            <button className="w-full text-left flex items-center justify-between p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all">
              <span className="text-xs text-gray-600">Review vulnerability fixes</span>
              <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Premium Upsell */}
      {!isPremium && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-10 -mt-32">
            <div className="bg-white border border-gray-300 rounded-lg p-4 text-center max-w-xs shadow-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">Premium Feature</p>
              <p className="text-xs text-gray-500 mb-3">
                Protect your voice from AI cloning
              </p>
              <button className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-black transition-colors">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-900 font-medium mb-1">
          Why Voice Protection Matters
        </p>
        <p className="text-xs text-blue-700">
          As AI becomes better at mimicking human writing, protecting your unique voice becomes crucial. 
          A higher protection score means it's harder for AI to replicate your authentic style.
        </p>
      </div>
    </div>
  )
}