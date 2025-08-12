'use client'

/**
 * Event Bus for Voice Profile System
 * Enables real-time communication between Analysis and Profile pages
 */

export type VoiceProfileEventType =
  | 'sample.created'
  | 'sample.updated' 
  | 'sample.analyzed'
  | 'voiceProfile.updated'
  | 'voiceProfile.constraints.changed'

export interface VoiceProfileEventData {
  'sample.created': {
    sampleId: string
    wordCount: number
    domain?: string
  }
  'sample.updated': {
    sampleId: string
    updates: Record<string, any>
    integrity?: number
    risk?: number
    reason?: 'voice_aware_rewrite' | 'manual_edit' | 'batch_update'
  }
  'sample.analyzed': {
    sampleId: string
    integrity: number
    risk: number
    riskDrivers?: Record<string, any>
  }
  'voiceProfile.updated': {
    version: number
    coverage: {
      wordCount: number
      sampleCount: number
      confidence: 'low' | 'medium' | 'high'
    }
    averageIntegrity: number
    averageRisk: number
    reason: 'add_sample' | 'edit_sample' | 'profile_creation'
  }
  'voiceProfile.constraints.changed': {
    version: number
    locks: Record<string, any>
    domain: string
    reason: 'lock_change' | 'domain_change'
  }
}

export type VoiceProfileEventListener<T extends VoiceProfileEventType> = (
  eventType: T,
  data: VoiceProfileEventData[T]
) => void

class VoiceProfileEventBus {
  private listeners = new Map<VoiceProfileEventType, Set<VoiceProfileEventListener<any>>>()
  private eventQueue: Array<{ type: VoiceProfileEventType; data: any; timestamp: number }> = []
  private isProcessing = false

  subscribe<T extends VoiceProfileEventType>(
    eventType: T,
    listener: VoiceProfileEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    
    this.listeners.get(eventType)!.add(listener)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  emit<T extends VoiceProfileEventType>(
    eventType: T,
    data: VoiceProfileEventData[T],
    options: { immediate?: boolean } = {}
  ): void {
    const event = {
      type: eventType,
      data,
      timestamp: Date.now()
    }

    if (options.immediate) {
      this.processEvent(event)
    } else {
      this.eventQueue.push(event)
      this.scheduleProcessing()
    }

    // Log event for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎯 VoiceProfile Event: ${eventType}`, data)
    }
  }

  private scheduleProcessing(): void {
    if (this.isProcessing) return

    this.isProcessing = true
    // Debounce event processing (300ms)
    setTimeout(() => {
      this.processEventQueue()
      this.isProcessing = false
    }, 300)
  }

  private processEventQueue(): void {
    const events = [...this.eventQueue]
    this.eventQueue = []

    // Group similar events and process latest only
    const eventMap = new Map<string, any>()
    events.forEach(event => {
      const key = `${event.type}:${JSON.stringify(event.data)}`
      eventMap.set(key, event)
    })

    // Process unique events
    eventMap.forEach(event => {
      this.processEvent(event)
    })
  }

  private processEvent(event: { type: VoiceProfileEventType; data: any; timestamp: number }): void {
    const listeners = this.listeners.get(event.type)
    if (!listeners) return

    listeners.forEach(listener => {
      try {
        listener(event.type, event.data)
      } catch (error) {
        console.error(`Error in VoiceProfile event listener for ${event.type}:`, error)
      }
    })
  }

  // Analytics/metrics helper
  getEventStats(): Record<VoiceProfileEventType, number> {
    const stats: Record<string, number> = {}
    this.listeners.forEach((listeners, eventType) => {
      stats[eventType] = listeners.size
    })
    return stats as Record<VoiceProfileEventType, number>
  }

  // Clear all listeners (useful for cleanup)
  clear(): void {
    this.listeners.clear()
    this.eventQueue = []
  }
}

// Singleton instance
export const voiceProfileEventBus = new VoiceProfileEventBus()

// Helper function for emitting events
export function emitEvent<T extends VoiceProfileEventType>(
  eventType: T,
  data: VoiceProfileEventData[T],
  options?: { immediate?: boolean }
): void {
  voiceProfileEventBus.emit(eventType, data, options)
}

// React hook for easy event subscription
import { useEffect } from 'react'

export function useVoiceProfileEvent<T extends VoiceProfileEventType>(
  eventType: T,
  listener: VoiceProfileEventListener<T>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const unsubscribe = voiceProfileEventBus.subscribe(eventType, listener)
    return unsubscribe
  }, [eventType, ...deps])
}

// Convenience hooks for common event patterns
export function useProfileUpdates(
  onUpdate: (data: VoiceProfileEventData['voiceProfile.updated']) => void
): void {
  useVoiceProfileEvent('voiceProfile.updated', (_, data) => onUpdate(data))
}

export function useConstraintChanges(
  onConstraintChange: (data: VoiceProfileEventData['voiceProfile.constraints.changed']) => void
): void {
  useVoiceProfileEvent('voiceProfile.constraints.changed', (_, data) => onConstraintChange(data))
}

export function useSampleEvents(
  onSampleChange: (eventType: 'sample.created' | 'sample.updated' | 'sample.analyzed', data: any) => void
): void {
  useVoiceProfileEvent('sample.created', (type, data) => onSampleChange(type, data))
  useVoiceProfileEvent('sample.updated', (type, data) => onSampleChange(type, data))
  useVoiceProfileEvent('sample.analyzed', (type, data) => onSampleChange(type, data))
}