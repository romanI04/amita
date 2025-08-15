'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'

interface TimelineEvent {
  id: string
  date: Date
  type: 'improvement' | 'drift' | 'milestone' | 'warning'
  dimension: string
  change: number // percentage change
  description: string
  samples?: number
}

interface VoiceEvolutionProps {
  events?: TimelineEvent[]
  timeRange?: '7d' | '30d' | '90d' | 'all'
  isPremium?: boolean
}

const DEFAULT_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    type: 'milestone',
    dimension: 'Overall',
    change: 0,
    description: 'Voice profile created',
    samples: 4
  },
  {
    id: '2',
    date: new Date('2024-01-18'),
    type: 'improvement',
    dimension: 'Vocabulary',
    change: 12,
    description: 'Richer word choices detected',
    samples: 2
  },
  {
    id: '3',
    date: new Date('2024-01-22'),
    type: 'drift',
    dimension: 'Formality',
    change: -8,
    description: 'Shift to casual tone in emails',
    samples: 3
  },
  {
    id: '4',
    date: new Date('2024-01-25'),
    type: 'warning',
    dimension: 'Consistency',
    change: -15,
    description: 'Unusual style variation detected',
    samples: 1
  },
  {
    id: '5',
    date: new Date('2024-01-28'),
    type: 'improvement',
    dimension: 'Clarity',
    change: 10,
    description: 'Sentence structure improved',
    samples: 2
  },
  {
    id: '6',
    date: new Date('2024-02-01'),
    type: 'milestone',
    dimension: 'Protection',
    change: 20,
    description: 'Voice uniqueness increased',
    samples: 5
  },
  {
    id: '7',
    date: new Date('2024-02-05'),
    type: 'improvement',
    dimension: 'Authenticity',
    change: 8,
    description: 'More natural expression',
    samples: 3
  }
]

export function VoiceEvolution({ 
  events = DEFAULT_EVENTS,
  timeRange = '30d',
  isPremium = false 
}: VoiceEvolutionProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [activeRange, setActiveRange] = useState(timeRange)
  
  // Filter events based on time range
  const filterEventsByRange = (events: TimelineEvent[], range: string) => {
    const now = new Date()
    const cutoff = new Date()
    
    switch (range) {
      case '7d':
        cutoff.setDate(now.getDate() - 7)
        break
      case '30d':
        cutoff.setDate(now.getDate() - 30)
        break
      case '90d':
        cutoff.setDate(now.getDate() - 90)
        break
      default:
        return events
    }
    
    return events.filter(e => e.date >= cutoff)
  }
  
  const filteredEvents = filterEventsByRange(events, activeRange)
  const sortedEvents = [...filteredEvents].sort((a, b) => b.date.getTime() - a.date.getTime())
  
  // Get event type indicator
  const getEventIndicator = (type: string) => {
    switch (type) {
      case 'improvement': return '↑'
      case 'drift': return '↓'
      case 'milestone': return '★'
      case 'warning': return '!'
      default: return '•'
    }
  }
  
  // Get event dots
  const getEventDots = (type: string, change: number) => {
    if (type === 'milestone') return '•••••'
    if (type === 'warning') return '○○○'
    
    const intensity = Math.min(5, Math.ceil(Math.abs(change) / 5))
    const filled = '•'.repeat(intensity)
    const empty = '○'.repeat(5 - intensity)
    
    return type === 'improvement' ? filled + empty : empty + filled
  }
  
  // Format date
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          <span className="text-xs text-gray-400" style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
            ••••••
          </span>
          {' '}Voice Evolution Timeline
        </h3>
        <p className="text-xs text-gray-500">
          Track how your writing voice changes over time
        </p>
      </div>
      
      {/* Time Range Selector */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
        {(['7d', '30d', '90d', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setActiveRange(range)}
            className={`px-3 py-1.5 text-xs rounded-full transition-all ${
              activeRange === range 
                ? 'bg-gray-900 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={!isPremium && range !== '7d'}
          >
            {range === 'all' ? 'All Time' : `Last ${range}`}
            {!isPremium && range !== '7d' && (
              <span className="ml-1 opacity-50">Premium</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Timeline */}
      <div className={`relative ${!isPremium && activeRange !== '7d' ? 'filter blur-sm pointer-events-none' : ''}`}>
        {/* Timeline Line */}
        <div 
          className="absolute left-8 top-0 bottom-0 w-px bg-gray-200"
          style={{ marginTop: '1.5rem' }}
        />
        
        {/* Events */}
        <div className="space-y-4">
          {sortedEvents.map((event, idx) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative flex items-start gap-4 ${
                selectedEvent === event.id ? 'bg-gray-50 -mx-2 px-2 py-2 rounded-lg' : ''
              }`}
              onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}
            >
              {/* Timeline Node */}
              <div className="relative z-10 mt-1">
                <div className={`w-4 h-4 rounded-full border-2 bg-white ${
                  event.type === 'improvement' ? 'border-green-500' :
                  event.type === 'drift' ? 'border-orange-500' :
                  event.type === 'milestone' ? 'border-blue-500' :
                  'border-red-500'
                }`}>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs ${
                    event.type === 'improvement' ? 'text-green-600' :
                    event.type === 'drift' ? 'text-orange-600' :
                    event.type === 'milestone' ? 'text-blue-600' :
                    'text-red-600'
                  }`} style={{ fontSize: '10px' }}>
                    {getEventIndicator(event.type)}
                  </span>
                </div>
              </div>
              
              {/* Event Content */}
              <div className="flex-1 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {event.dimension}
                      </span>
                      {event.change !== 0 && (
                        <span className={`text-xs ${
                          event.change > 0 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          {event.change > 0 ? '+' : ''}{event.change}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {event.description}
                    </p>
                    {event.samples && (
                      <p className="text-xs text-gray-400 mt-1">
                        Based on {event.samples} sample{event.samples > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {formatDate(event.date)}
                    </p>
                    <span 
                      style={{ fontFamily: 'SF Mono, Monaco, monospace' }}
                      className="text-xs text-gray-400"
                    >
                      {getEventDots(event.type, event.change)}
                    </span>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {selectedEvent === event.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-gray-200"
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">Impact</p>
                        <p className="text-gray-900">
                          {event.type === 'improvement' ? 'Positive change' :
                           event.type === 'drift' ? 'Style shift detected' :
                           event.type === 'milestone' ? 'Achievement unlocked' :
                           'Requires attention'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Recommendation</p>
                        <p className="text-gray-900">
                          {event.type === 'improvement' ? 'Keep writing regularly' :
                           event.type === 'drift' ? 'Review voice settings' :
                           event.type === 'milestone' ? 'Celebrate progress' :
                           'Add more samples'}
                        </p>
                      </div>
                    </div>
                    <button className="mt-3 text-xs text-gray-900 font-medium hover:underline">
                      View samples →
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Total Events</p>
            <p className="text-lg font-light text-gray-900">{filteredEvents.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Improvements</p>
            <p className="text-lg font-light text-green-600">
              {filteredEvents.filter(e => e.type === 'improvement').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Net Change</p>
            <p className="text-lg font-light text-gray-900">
              {filteredEvents.reduce((sum, e) => sum + (e.type === 'improvement' ? e.change : e.type === 'drift' ? e.change : 0), 0)}%
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <span style={{ fontFamily: 'SF Mono, Monaco, monospace' }}>
              ••••••••••
            </span>
            {' '}Voice stability: Strong
          </p>
        </div>
      </div>
      
      {/* Premium Upsell */}
      {!isPremium && activeRange !== '7d' && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center z-10 -mt-32">
            <div className="bg-white border border-gray-300 rounded-lg p-4 text-center max-w-xs shadow-lg">
              <p className="text-sm font-medium text-gray-900 mb-2">Premium Feature</p>
              <p className="text-xs text-gray-500 mb-3">
                Unlock full timeline history and detailed evolution tracking
              </p>
              <button className="px-4 py-2 bg-gray-900 text-white text-xs rounded hover:bg-black transition-colors">
                Upgrade to Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}