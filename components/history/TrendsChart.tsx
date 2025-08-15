'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

interface DataPoint {
  date: string
  aiScore: number
  authenticityScore: number
}

interface TrendsChartProps {
  data: DataPoint[]
  period: 'week' | 'month' | 'year'
  showStreaks?: boolean
}

export function TrendsChart({ 
  data, 
  period = 'week',
  showStreaks = true 
}: TrendsChartProps) {
  
  // Calculate trends
  const trends = useMemo(() => {
    if (data.length < 2) return { ai: 'stable', authenticity: 'stable' }
    
    const recent = data.slice(-7)
    const older = data.slice(-14, -7)
    
    const recentAiAvg = recent.reduce((acc, d) => acc + d.aiScore, 0) / recent.length
    const olderAiAvg = older.reduce((acc, d) => acc + d.aiScore, 0) / older.length
    
    const recentAuthAvg = recent.reduce((acc, d) => acc + d.authenticityScore, 0) / recent.length
    const olderAuthAvg = older.reduce((acc, d) => acc + d.authenticityScore, 0) / older.length
    
    return {
      ai: recentAiAvg < olderAiAvg ? 'improving' : recentAiAvg > olderAiAvg ? 'declining' : 'stable',
      authenticity: recentAuthAvg > olderAuthAvg ? 'improving' : recentAuthAvg < olderAuthAvg ? 'declining' : 'stable'
    }
  }, [data])
  
  // Calculate streak
  const currentStreak = useMemo(() => {
    let streak = 0
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].authenticityScore >= 70) {
        streak++
      } else {
        break
      }
    }
    return streak
  }, [data])
  
  // Normalize data for chart
  const chartHeight = 120
  const chartWidth = 300
  const maxValue = 100
  
  const generatePath = (scores: number[]) => {
    if (scores.length === 0) return ''
    
    const stepX = chartWidth / (scores.length - 1 || 1)
    const points = scores.map((score, idx) => ({
      x: idx * stepX,
      y: chartHeight - (score / maxValue) * chartHeight
    }))
    
    return points.map((p, idx) => 
      `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ')
  }
  
  const aiPath = generatePath(data.map(d => d.aiScore))
  const authPath = generatePath(data.map(d => d.authenticityScore))
  
  // Generate Y-axis labels
  const yLabels = [100, 75, 50, 25, 0]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••••••
          </span>
          {' '}Writing Health Dashboard
        </h3>
        <div className="flex items-center gap-6 text-xs text-gray-500">
          <span>Period: {period}</span>
          <span className="flex items-center gap-2">
            <span>AI Detection Trend:</span>
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
              {trends.ai === 'improving' ? '↓••' : trends.ai === 'declining' ? '↑○○' : '→••'}
            </span>
          </span>
        </div>
      </div>
      
      {/* Streak Counter */}
      {showStreaks && currentStreak > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Authenticity Streak</p>
              <p className="text-2xl font-light text-gray-900">{currentStreak} days</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-2">Progress</p>
              <div style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-lg">
                {'•'.repeat(Math.min(currentStreak, 10))}
                {currentStreak > 10 && `+${currentStreak - 10}`}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="relative">
          {/* Y-axis */}
          <div className="absolute -left-4 top-0 h-full flex flex-col justify-between text-xs text-gray-400">
            {yLabels.map(label => (
              <span key={label} style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                {label}
              </span>
            ))}
          </div>
          
          {/* Chart Area */}
          <svg width={chartWidth} height={chartHeight} className="ml-8">
            {/* Grid lines */}
            {yLabels.map(label => (
              <line
                key={label}
                x1="0"
                y1={chartHeight - (label / 100) * chartHeight}
                x2={chartWidth}
                y2={chartHeight - (label / 100) * chartHeight}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
            ))}
            
            {/* AI Score Line */}
            <motion.path
              d={aiPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />
            
            {/* Authenticity Score Line */}
            <motion.path
              d={authPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
            />
            
            {/* Data points */}
            {data.map((point, idx) => {
              const x = (idx / (data.length - 1 || 1)) * chartWidth
              return (
                <g key={idx}>
                  <circle
                    cx={x}
                    cy={isNaN(point.aiScore) || !point.aiScore ? chartHeight : chartHeight - (point.aiScore / maxValue) * chartHeight}
                    r="3"
                    fill="#ef4444"
                  />
                  <circle
                    cx={x}
                    cy={isNaN(point.authenticityScore) || !point.authenticityScore ? chartHeight : chartHeight - (point.authenticityScore / maxValue) * chartHeight}
                    r="3"
                    fill="#10b981"
                  />
                </g>
              )
            })}
          </svg>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            {data.slice(0, 5).map((point, idx) => (
              <span key={idx} style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
                {new Date(point.date).getDate()}
              </span>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-green-500"></span>
            <span className="text-gray-600">Authenticity Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 bg-red-500"></span>
            <span className="text-gray-600">AI Detection</span>
          </div>
        </div>
      </div>
      
      {/* Insights */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700">Key Insights</h4>
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-xs text-gray-400 mt-0.5">
              ••
            </span>
            <p className="text-xs text-gray-600">
              Your authenticity has {trends.authenticity === 'improving' ? 'improved' : trends.authenticity === 'declining' ? 'declined' : 'remained stable'} over the past {period}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-xs text-gray-400 mt-0.5">
              ••
            </span>
            <p className="text-xs text-gray-600">
              AI detection is {trends.ai === 'improving' ? 'decreasing' : trends.ai === 'declining' ? 'increasing' : 'stable'} - {trends.ai === 'improving' ? 'good progress!' : trends.ai === 'declining' ? 'needs attention' : 'maintain current approach'}
            </p>
          </div>
          {currentStreak >= 7 && (
            <div className="flex items-start gap-2">
              <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }} className="text-xs text-gray-400 mt-0.5">
                ••
              </span>
              <p className="text-xs text-gray-600">
                Excellent streak! You've maintained high authenticity for {currentStreak} days
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}