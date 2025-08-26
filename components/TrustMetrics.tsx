'use client'

import React, { useState, useEffect } from 'react'
import { ClockIcon, ChartBarIcon, UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

interface Metrics {
  users: {
    total: number
    display: string
    label: string
  }
  accuracy: {
    value: number
    display: string
    label: string
    disclaimer?: string
  }
  analyses: {
    total: number
    today: number
    display: string
    label: string
  }
  lastActivity: {
    time: string | null
    label: string
  }
}

export default function TrustMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetchMetrics()
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
        setError(false)
      } else {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-gray-200 rounded w-20 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-24 mx-auto"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    // Show conservative defaults if metrics fail to load
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary-500 mr-2" />
            <div className="text-3xl font-bold text-gray-900">Real AI</div>
          </div>
          <div className="text-sm text-gray-600">Powered by xAI</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <UsersIcon className="h-5 w-5 text-primary-500 mr-2" />
            <div className="text-3xl font-bold text-gray-900">Growing</div>
          </div>
          <div className="text-sm text-gray-600">Community</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ChartBarIcon className="h-5 w-5 text-primary-500 mr-2" />
            <div className="text-3xl font-bold text-gray-900">Accurate</div>
          </div>
          <div className="text-sm text-gray-600">Analysis</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <ClockIcon className="h-5 w-5 text-primary-500 mr-2" />
            <div className="text-3xl font-bold text-gray-900">Live</div>
          </div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {/* Real User Count */}
      <div className="text-center group">
        <div className="flex items-center justify-center mb-2">
          <UsersIcon className="h-5 w-5 text-primary-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-bold text-gray-900">
            {metrics.users.total > 0 ? metrics.users.display : 'New'}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {metrics.users.total > 0 ? metrics.users.label : 'Join Early'}
        </div>
      </div>

      {/* Real Accuracy/Authenticity */}
      <div className="text-center group relative">
        <div className="flex items-center justify-center mb-2">
          <ChartBarIcon className="h-5 w-5 text-primary-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-bold text-gray-900">
            {metrics.accuracy.display}
          </div>
        </div>
        <div className="text-sm text-gray-600">{metrics.accuracy.label}</div>
        {metrics.accuracy.disclaimer && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {metrics.accuracy.disclaimer}
            </div>
          </div>
        )}
      </div>

      {/* Real Analysis Count */}
      <div className="text-center group">
        <div className="flex items-center justify-center mb-2">
          <ShieldCheckIcon className="h-5 w-5 text-primary-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-bold text-gray-900">
            {metrics.analyses.total > 0 ? metrics.analyses.display : 'Real AI'}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {metrics.analyses.total > 0 ? metrics.analyses.label : 'No Fake Data'}
        </div>
        {metrics.analyses.today > 0 && (
          <div className="text-xs text-primary-600 mt-1">
            {metrics.analyses.today} today
          </div>
        )}
      </div>

      {/* Last Activity */}
      <div className="text-center group">
        <div className="flex items-center justify-center mb-2">
          <ClockIcon className="h-5 w-5 text-primary-500 mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl font-bold text-gray-900">
            {metrics.lastActivity.time ? 'Active' : 'Live'}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {metrics.lastActivity.time || 'Real-time Analysis'}
        </div>
      </div>
    </div>
  )
}