'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface VoiceDimension {
  name: string
  value: number // 0-100
  baseline: number // 0-100
  description: string
}

interface VoiceFingerprintProps {
  dimensions?: VoiceDimension[]
  size?: 'sm' | 'md' | 'lg'
  showBaseline?: boolean
  isPremium?: boolean
}

// Default 8 key voice dimensions
const DEFAULT_DIMENSIONS: VoiceDimension[] = [
  { name: 'Vocabulary', value: 75, baseline: 70, description: 'Word choice sophistication' },
  { name: 'Sentence Flow', value: 60, baseline: 65, description: 'Rhythm and pacing' },
  { name: 'Formality', value: 45, baseline: 50, description: 'Professional vs casual' },
  { name: 'Emotion', value: 80, baseline: 75, description: 'Emotional expression' },
  { name: 'Clarity', value: 85, baseline: 80, description: 'Clear communication' },
  { name: 'Originality', value: 70, baseline: 60, description: 'Unique expression' },
  { name: 'Consistency', value: 65, baseline: 70, description: 'Style consistency' },
  { name: 'Authenticity', value: 90, baseline: 85, description: 'Human-like quality' }
]

export function VoiceFingerprint({ 
  dimensions = DEFAULT_DIMENSIONS,
  size = 'md',
  showBaseline = true,
  isPremium = false
}: VoiceFingerprintProps) {
  
  const sizeConfig = {
    sm: { width: 200, height: 200, fontSize: 10 },
    md: { width: 300, height: 300, fontSize: 11 },
    lg: { width: 400, height: 400, fontSize: 12 }
  }

  const config = sizeConfig[size]
  const centerX = config.width / 2
  const centerY = config.height / 2
  const radius = Math.min(centerX, centerY) - 40

  // Calculate polygon points for radar chart
  const calculatePoints = (values: number[]) => {
    return values.map((value, index) => {
      const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2
      const r = (radius * value) / 100
      const x = centerX + r * Math.cos(angle)
      const y = centerY + r * Math.sin(angle)
      return `${x},${y}`
    }).join(' ')
  }

  const currentPoints = calculatePoints(dimensions.map(d => d.value))
  const baselinePoints = calculatePoints(dimensions.map(d => d.baseline))

  // Generate dot pattern for each level
  const dotLevels = [20, 40, 60, 80, 100]
  
  // Calculate drift indicator
  const avgDrift = useMemo(() => {
    const totalDrift = dimensions.reduce((acc, dim) => 
      acc + Math.abs(dim.value - dim.baseline), 0
    )
    return totalDrift / dimensions.length
  }, [dimensions])

  const getDriftIndicator = () => {
    if (avgDrift < 5) return { dots: '•••', label: 'Stable' }
    if (avgDrift < 10) return { dots: '••○', label: 'Slight drift' }
    return { dots: '○○○', label: 'Major drift' }
  }

  const drift = getDriftIndicator()

  return (
    <div className="relative">
      {/* Header with ASCII dots */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••••••
          </span>
          {' '}Voice Fingerprint
        </h3>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Drift Status:</span>
          <span className="flex items-center gap-2">
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>{drift.dots}</span>
            <span>{drift.label}</span>
          </span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className={isPremium ? '' : 'filter blur-sm pointer-events-none'}>
        <svg width={config.width} height={config.height}>
          {/* Grid circles with dots */}
          {dotLevels.map((level, idx) => (
            <g key={level}>
              <circle
                cx={centerX}
                cy={centerY}
                r={(radius * level) / 100}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              {/* Level indicator */}
              <text
                x={centerX + (radius * level) / 100 + 5}
                y={centerY}
                fill="#9ca3af"
                fontSize="9"
                style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
              >
                {level}%
              </text>
            </g>
          ))}

          {/* Axes */}
          {dimensions.map((dim, index) => {
            const angle = (Math.PI * 2 * index) / dimensions.length - Math.PI / 2
            const x = centerX + radius * Math.cos(angle)
            const y = centerY + radius * Math.sin(angle)
            
            return (
              <g key={dim.name}>
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={x + (Math.cos(angle) * 10)}
                  y={y + (Math.sin(angle) * 10)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#6b7280"
                  fontSize={config.fontSize}
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {dim.name}
                </text>
              </g>
            )
          })}

          {/* Baseline polygon (if shown) */}
          {showBaseline && (
            <polygon
              points={baselinePoints}
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1"
              strokeDasharray="4 2"
              opacity="0.5"
            />
          )}

          {/* Current values polygon */}
          <motion.polygon
            points={currentPoints}
            fill="rgba(156, 163, 175, 0.1)"
            stroke="#374151"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Value dots */}
          {dimensions.map((dim, index) => {
            const angle = (Math.PI * 2 * index) / dimensions.length - Math.PI / 2
            const r = (radius * dim.value) / 100
            const x = centerX + r * Math.cos(angle)
            const y = centerY + r * Math.sin(angle)
            
            // Determine dot style based on drift
            const drift = Math.abs(dim.value - dim.baseline)
            const dotColor = drift > 10 ? '#ef4444' : drift > 5 ? '#f59e0b' : '#10b981'
            
            return (
              <motion.circle
                key={`dot-${index}`}
                cx={x}
                cy={y}
                r="4"
                fill={dotColor}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 }}
              />
            )
          })}
        </svg>
      </div>

      {/* Dimension Details */}
      <div className="mt-6 space-y-2">
        {dimensions.map((dim, idx) => {
          const drift = Math.abs(dim.value - dim.baseline)
          const driftIndicator = drift > 10 ? '○○○' : drift > 5 ? '••○' : '•••'
          
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-gray-700">{dim.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{dim.value}%</span>
                <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-gray-400">
                  {driftIndicator}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Premium Upsell (if not premium) */}
      {!isPremium && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border border-gray-300 rounded-lg p-4 text-center max-w-xs">
            <p className="text-sm font-medium text-gray-900 mb-2">Premium Feature</p>
            <p className="text-xs text-gray-500 mb-3">
              Unlock detailed voice analysis and tracking
            </p>
            <button className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-black transition-colors">
              Upgrade to Premium
            </button>
          </div>
        </div>
      )}
    </div>
  )
}