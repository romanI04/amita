'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  CalendarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface StreakData {
  currentStreak: number
  longestStreak: number
  totalDays: number
  lastActiveDate: string
  todayCompleted: boolean
  weekActivity: boolean[]
}

export function WritingStreak() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    totalDays: 0,
    lastActiveDate: '',
    todayCompleted: false,
    weekActivity: [false, false, false, false, false, false, false]
  })

  useEffect(() => {
    const loadStreakData = () => {
      const saved = localStorage.getItem('writingStreak')
      if (saved) {
        const data = JSON.parse(saved)
        setStreakData(data)
      } else {
        const demoData: StreakData = {
          currentStreak: 3,
          longestStreak: 7,
          totalDays: 12,
          lastActiveDate: new Date().toISOString().split('T')[0],
          todayCompleted: false,
          weekActivity: [true, true, true, false, true, false, false]
        }
        setStreakData(demoData)
        localStorage.setItem('writingStreak', JSON.stringify(demoData))
      }
    }
    
    loadStreakData()
  }, [])

  const getStatusLabel = () => {
    if (streakData.currentStreak === 0) return 'Inactive'
    if (streakData.currentStreak < 3) return 'Active'
    if (streakData.currentStreak < 7) return 'Consistent'
    if (streakData.currentStreak < 14) return 'Dedicated'
    if (streakData.currentStreak < 30) return 'Committed'
    return 'Expert'
  }

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const today = new Date().getDay()

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-5 w-5 text-gray-700" />
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Activity Metrics</h3>
            <p className="text-xs text-gray-500">
              Status: <span className="font-medium">{getStatusLabel()}</span>
            </p>
          </div>
        </div>
        <CalendarIcon className="h-4 w-4 text-gray-400" />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-gray-900">
            {streakData.currentStreak}
          </div>
          <div className="text-xs text-gray-500">Current</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-gray-900">
            {streakData.longestStreak}
          </div>
          <div className="text-xs text-gray-500">Best</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-gray-900">
            {streakData.totalDays}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="mb-5">
        <div className="text-xs text-gray-500 mb-2 font-medium">WEEKLY ACTIVITY</div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day, index) => {
            const isToday = index === today
            const isActive = streakData.weekActivity[index]
            
            return (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-400 mb-1">{day}</div>
                <div className={`
                  w-full aspect-square rounded flex items-center justify-center
                  ${isToday ? 'ring-1 ring-gray-400' : ''}
                  ${isActive ? 'bg-gray-700' : 'bg-gray-100'}
                `}>
                  {isActive && (
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="border-t border-gray-100 pt-4">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Weekly Progress</span>
              <span className="font-medium text-gray-900">
                {Math.min(100, Math.round((streakData.currentStreak / 7) * 100))}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-700"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (streakData.currentStreak / 7) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Monthly Progress</span>
              <span className="font-medium text-gray-900">
                {Math.min(100, Math.round((streakData.currentStreak / 30) * 100))}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gray-700"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (streakData.currentStreak / 30) * 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}