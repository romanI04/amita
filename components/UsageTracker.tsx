'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { SubtleBlocks } from '@/components/SubtleBlocks'
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline'
import { UsageLimits } from '@/lib/subscription/limits'

interface UsageTrackerProps {
  userId: string
  isCompact?: boolean
}

export default function UsageTracker({ userId, isCompact = false }: UsageTrackerProps) {
  const [limits, setLimits] = useState<UsageLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    fetchLimits()
  }, [userId])

  const fetchLimits = async () => {
    try {
      const response = await fetch('/api/user/limits')
      if (response.ok) {
        const data = await response.json()
        setLimits(data)
        // Trigger animation after data loads
        setTimeout(() => setIsAnimating(true), 100)
      }
    } catch (error) {
      console.error('Failed to fetch usage limits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`bg-white/50 rounded-lg border border-gray-100 ${isCompact ? 'p-3' : 'p-4'} animate-pulse`}
      >
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-24"></div>
          <div className="h-2 bg-gray-100 rounded-full w-full"></div>
        </div>
      </motion.div>
    )
  }

  if (!limits) return null

  const usagePercentage = limits.analysesPerMonth === -1 
    ? 0 
    : Math.round((limits.analysesUsed / limits.analysesPerMonth) * 100)

  const isAtLimit = limits.analysesPerMonth > 0 && 
    limits.analysesUsed >= limits.analysesPerMonth
    
  const isNearLimit = limits.analysesPerMonth > 0 && 
    limits.analysesUsed >= limits.analysesPerMonth * 0.8

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-white/80 backdrop-blur-sm rounded-lg border border-gray-100 ${isCompact ? 'p-3' : 'p-4'} space-y-3`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-4 h-4 text-gray-400" />
          <span className={`font-medium text-gray-700 ${isCompact ? 'text-xs' : 'text-sm'}`}>
            Monthly Usage
          </span>
        </div>
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-gray-400 ${isCompact ? 'text-xs' : 'text-xs'}`}
        >
          {limits.daysUntilReset}d left
        </motion.span>
      </div>

      {limits.analysesPerMonth === -1 ? (
        // Pro/Unlimited users
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <div className="flex items-baseline gap-1">
            <span className={`font-bold text-primary-600 ${isCompact ? 'text-lg' : 'text-xl'}`}>
              {limits.analysesUsed}
            </span>
            <span className="text-xs text-gray-500">analyses</span>
          </div>
          <div className="flex items-center gap-2">
            <SubtleBlocks 
              value={Math.min(limits.analysesUsed, 10)} 
              max={10} 
              color="green" 
              isActive={isAnimating}
              size={isCompact ? 'xs' : 'sm'}
            />
            <span className="text-xs text-gray-500">unlimited</span>
          </div>
        </motion.div>
      ) : (
        // Free tier users
        <div className="space-y-3">
          {/* Usage numbers */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-baseline gap-1"
          >
            <span className={`font-bold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'} ${isCompact ? 'text-lg' : 'text-xl'}`}>
              {limits.analysesUsed}
            </span>
            <span className="text-sm text-gray-500">/ {limits.analysesPerMonth}</span>
          </motion.div>
          
          {/* Animated progress dots */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <SubtleBlocks 
              value={limits.analysesUsed} 
              max={limits.analysesPerMonth} 
              color={isAtLimit ? 'red' : isNearLimit ? 'yellow' : 'green'}
              isActive={isAnimating}
              size={isCompact ? 'xs' : 'sm'}
            />
          </motion.div>

          {/* Status messages */}
          <AnimatePresence>
            {limits.message && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className={`text-xs ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'}`}
              >
                {limits.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upgrade prompt for at-limit or near-limit users */}
          <AnimatePresence>
            {(isAtLimit || isNearLimit) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="pt-2 border-t border-gray-100"
              >
                <Link href="/pricing" className="group">
                  <button className={`w-full flex items-center justify-center gap-1 ${isAtLimit ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-primary-50 hover:bg-primary-100 text-primary-700'} font-medium rounded-lg transition-all duration-200 group-hover:scale-[1.02] ${isCompact ? 'text-xs py-1.5 px-2' : 'text-sm py-2 px-3'}`}>
                    <ArrowUpIcon className="w-3 h-3" />
                    {isAtLimit ? 'Upgrade Now' : 'Upgrade Plan'}
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}