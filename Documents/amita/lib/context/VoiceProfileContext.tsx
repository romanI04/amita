'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { voiceProfileEventBus } from '@/lib/events/VoiceProfileEvents'
import { analyticsLogger } from '@/lib/analytics/logger'
import { trackSupabaseOperation } from '@/lib/analytics/apiWrapper'
import type { Voiceprint, VoiceprintTraits, WritingSample } from '@/types'

// Voice Profile State Interface
export interface VoiceProfileState {
  // Core data
  voiceprint: Voiceprint | null
  traits: VoiceprintTraits | null
  samples: WritingSample[]
  
  // Coverage metrics
  coverage: {
    wordCount: number
    sampleCount: number
    confidence: 'low' | 'medium' | 'high'
  }
  
  // Voice locks/constraints
  locks: {
    sentenceLength: { enabled: boolean; tolerance: number } // ±10%
    keepIdioms: boolean
    hedgeFrequency: boolean
    punctuationStyle: boolean
  }
  
  // Domain settings
  domains: {
    active: 'General' | 'Academic' | 'Email' | 'Creative'
    settings: Record<string, {
      integrity: number
      risk: number
      customLocks?: Partial<VoiceProfileState['locks']>
    }>
  }
  
  // Risk analysis
  riskDrivers: {
    structure: { level: 'low' | 'medium' | 'high'; score: number }
    repetition: { level: 'low' | 'medium' | 'high'; score: number }
    perplexity: { level: 'low' | 'medium' | 'high'; score: number }
    errorScarcity: { level: 'low' | 'medium' | 'high'; score: number }
  }
  
  // Metrics
  averageIntegrity: number
  averageRisk: number
  voiceDrift: 'stable' | 'slight' | 'major'
  
  // System state
  version: number
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

// Action Types
type VoiceProfileAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_PROFILE_SUCCESS'; payload: Partial<VoiceProfileState> }
  | { type: 'UPDATE_COVERAGE'; payload: { wordCount: number; sampleCount: number } }
  | { type: 'TOGGLE_LOCK'; payload: { lockType: keyof VoiceProfileState['locks']; value?: any } }
  | { type: 'SWITCH_DOMAIN'; payload: string }
  | { type: 'UPDATE_TRAITS'; payload: VoiceprintTraits }
  | { type: 'ADD_SAMPLE'; payload: WritingSample }
  | { type: 'UPDATE_SAMPLE'; payload: { id: string; updates: Partial<WritingSample> } }
  | { type: 'UPDATE_RISK_DRIVERS'; payload: Partial<VoiceProfileState['riskDrivers']> }
  | { type: 'BUMP_VERSION' }

// Initial State
const initialState: VoiceProfileState = {
  voiceprint: null,
  traits: null,
  samples: [],
  coverage: {
    wordCount: 0,
    sampleCount: 0,
    confidence: 'low'
  },
  locks: {
    sentenceLength: { enabled: true, tolerance: 10 },
    keepIdioms: true,
    hedgeFrequency: false,
    punctuationStyle: true
  },
  domains: {
    active: 'General',
    settings: {
      'General': { integrity: 0, risk: 0 },
      'Academic': { integrity: 0, risk: 0 },
      'Email': { integrity: 0, risk: 0 },
      'Creative': { integrity: 0, risk: 0 }
    }
  },
  riskDrivers: {
    structure: { level: 'medium', score: 0.5 },
    repetition: { level: 'low', score: 0.3 },
    perplexity: { level: 'high', score: 0.7 },
    errorScarcity: { level: 'medium', score: 0.6 }
  },
  averageIntegrity: 0,
  averageRisk: 0,
  voiceDrift: 'stable',
  version: 1,
  isLoading: true,
  error: null,
  lastUpdated: null
}

// Reducer
function voiceProfileReducer(state: VoiceProfileState, action: VoiceProfileAction): VoiceProfileState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'LOAD_PROFILE_SUCCESS': {
      const newState = { ...state, ...action.payload, isLoading: false, error: null }
      
      // Recalculate coverage
      const wordCount = newState.samples.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0)
      const sampleCount = newState.samples.length
      let confidence: 'low' | 'medium' | 'high' = 'low'
      if (wordCount >= 3000 && sampleCount >= 5) confidence = 'high'
      else if (wordCount >= 1000 && sampleCount >= 3) confidence = 'medium'
      
      newState.coverage = { wordCount, sampleCount, confidence }
      
      // Calculate averages
      if (newState.samples.length > 0) {
        newState.averageIntegrity = newState.samples.reduce((sum, s) => sum + (Number(s.authenticity_score) || 0), 0) / newState.samples.length
        newState.averageRisk = newState.samples.reduce((sum, s) => sum + (Number(s.ai_confidence_score) || 0), 0) / newState.samples.length
        newState.voiceDrift = newState.averageRisk > 30 ? 'major' : newState.averageRisk > 15 ? 'slight' : 'stable'
      }

      // Emit profile updated event (initial load)
      if (newState.samples.length > 0) {
        voiceProfileEventBus.emit('voiceProfile.updated', {
          version: newState.version,
          coverage: newState.coverage,
          averageIntegrity: newState.averageIntegrity,
          averageRisk: newState.averageRisk,
          reason: 'profile_creation'
        })
      }
      
      return newState
    }
    
    case 'UPDATE_COVERAGE': {
      const { wordCount, sampleCount } = action.payload
      let confidence: 'low' | 'medium' | 'high' = 'low'
      if (wordCount >= 3000 && sampleCount >= 5) confidence = 'high'
      else if (wordCount >= 1000 && sampleCount >= 3) confidence = 'medium'
      
      return {
        ...state,
        coverage: { wordCount, sampleCount, confidence },
        version: state.version + 1,
        lastUpdated: new Date()
      }
    }
    
    case 'TOGGLE_LOCK': {
      const { lockType, value } = action.payload
      const newLocks = { ...state.locks }
      
      if (lockType === 'sentenceLength' && typeof value === 'object') {
        newLocks.sentenceLength = { ...newLocks.sentenceLength, ...value }
      } else if (typeof value === 'boolean') {
        newLocks[lockType] = value as any
      } else {
        // Toggle boolean locks
        if (typeof newLocks[lockType] === 'boolean') {
          newLocks[lockType] = !newLocks[lockType] as any
        }
      }
      
      const newState = {
        ...state,
        locks: newLocks,
        version: state.version + 1,
        lastUpdated: new Date()
      }

      // Log voice lock toggle
      analyticsLogger.logVoiceProfileEvent('locked', {
        lock_type: lockType,
        enabled: newLocks[lockType],
        profile_id: state.voiceprint?.id,
        version: newState.version
      })

      // Emit constraints changed event
      voiceProfileEventBus.emit('voiceProfile.constraints.changed', {
        version: newState.version,
        locks: newLocks,
        domain: state.domains.active,
        reason: 'lock_change'
      })
      
      return newState
    }
    
    case 'SWITCH_DOMAIN': {
      const previousDomain = state.domains.active
      const newState = {
        ...state,
        domains: {
          ...state.domains,
          active: action.payload as any
        },
        version: state.version + 1,
        lastUpdated: new Date()
      }

      // Log domain switch
      analyticsLogger.logVoiceProfileEvent('domain_switched', {
        from_domain: previousDomain,
        to_domain: action.payload,
        profile_id: state.voiceprint?.id,
        version: newState.version
      })

      // Emit constraints changed event
      voiceProfileEventBus.emit('voiceProfile.constraints.changed', {
        version: newState.version,
        locks: state.locks,
        domain: action.payload,
        reason: 'domain_change'
      })

      return newState
    }
    
    case 'UPDATE_TRAITS':
      return {
        ...state,
        traits: action.payload,
        version: state.version + 1,
        lastUpdated: new Date()
      }
    
    case 'ADD_SAMPLE': {
      const newSamples = [...state.samples, action.payload]
      const wordCount = newSamples.reduce((sum, s) => sum + (s.content?.split(/\s+/).length || 0), 0)
      const sampleCount = newSamples.length
      
      // Recalculate averages
      const averageIntegrity = newSamples.reduce((sum, s) => sum + (Number(s.authenticity_score) || 0), 0) / newSamples.length
      const averageRisk = newSamples.reduce((sum, s) => sum + (Number(s.ai_confidence_score) || 0), 0) / newSamples.length
      
      let confidence: 'low' | 'medium' | 'high' = 'low'
      if (wordCount >= 3000 && sampleCount >= 5) confidence = 'high'
      else if (wordCount >= 1000 && sampleCount >= 3) confidence = 'medium'
      
      const newState = {
        ...state,
        samples: newSamples,
        coverage: { wordCount, sampleCount, confidence },
        averageIntegrity,
        averageRisk,
        voiceDrift: (averageRisk > 30 ? 'major' : averageRisk > 15 ? 'slight' : 'stable') as 'stable' | 'slight' | 'major',
        version: state.version + 1,
        lastUpdated: new Date()
      }

      // Emit sample created event
      voiceProfileEventBus.emit('sample.created', {
        sampleId: action.payload.id,
        wordCount: action.payload.content?.split(/\s+/).length || 0,
        domain: 'General' // Default domain since WritingSample doesn't have domain field yet
      })

      // Emit profile updated event
      voiceProfileEventBus.emit('voiceProfile.updated', {
        version: newState.version,
        coverage: newState.coverage,
        averageIntegrity: newState.averageIntegrity,
        averageRisk: newState.averageRisk,
        reason: 'add_sample'
      })

      return newState
    }
    
    case 'UPDATE_SAMPLE': {
      const newSamples = state.samples.map(sample =>
        sample.id === action.payload.id 
          ? { ...sample, ...action.payload.updates }
          : sample
      )
      
      // Recalculate averages if scores changed
      const averageIntegrity = newSamples.reduce((sum, s) => sum + (Number(s.authenticity_score) || 0), 0) / newSamples.length
      const averageRisk = newSamples.reduce((sum, s) => sum + (Number(s.ai_confidence_score) || 0), 0) / newSamples.length
      
      const newState = {
        ...state,
        samples: newSamples,
        averageIntegrity,
        averageRisk,
        voiceDrift: (averageRisk > 30 ? 'major' : averageRisk > 15 ? 'slight' : 'stable') as 'stable' | 'slight' | 'major',
        version: state.version + 1,
        lastUpdated: new Date()
      }

      // Emit sample updated event
      const updatedSample = newSamples.find(s => s.id === action.payload.id)
      if (updatedSample) {
        voiceProfileEventBus.emit('sample.updated', {
          sampleId: action.payload.id,
          updates: action.payload.updates,
          integrity: Number(updatedSample.authenticity_score) || 0,
          risk: Number(updatedSample.ai_confidence_score) || 0
        })

        // If analysis scores changed, emit analyzed event
        if (action.payload.updates.authenticity_score || action.payload.updates.ai_confidence_score) {
          voiceProfileEventBus.emit('sample.analyzed', {
            sampleId: action.payload.id,
            integrity: Number(updatedSample.authenticity_score) || 0,
            risk: Number(updatedSample.ai_confidence_score) || 0
          })

          // Emit profile updated event
          voiceProfileEventBus.emit('voiceProfile.updated', {
            version: newState.version,
            coverage: newState.coverage,
            averageIntegrity: newState.averageIntegrity,
            averageRisk: newState.averageRisk,
            reason: 'edit_sample'
          })
        }
      }

      return newState
    }
    
    case 'UPDATE_RISK_DRIVERS':
      return {
        ...state,
        riskDrivers: { ...state.riskDrivers, ...action.payload },
        version: state.version + 1,
        lastUpdated: new Date()
      }
    
    case 'BUMP_VERSION':
      return {
        ...state,
        version: state.version + 1,
        lastUpdated: new Date()
      }
    
    default:
      return state
  }
}

// Context
interface VoiceProfileContextType {
  state: VoiceProfileState
  dispatch: React.Dispatch<VoiceProfileAction>
  
  // Convenience methods
  toggleLock: (lockType: keyof VoiceProfileState['locks'], value?: any) => void
  switchDomain: (domain: string) => void
  addSample: (sample: WritingSample) => void
  updateSample: (id: string, updates: Partial<WritingSample>) => void
  loadProfile: () => Promise<void>
  refreshProfile: () => Promise<void>
  
  // Event subscription helpers
  onProfileUpdate: (callback: (data: any) => void) => () => void
  onConstraintChange: (callback: (data: any) => void) => () => void
}

const VoiceProfileContext = createContext<VoiceProfileContextType | undefined>(undefined)

// Provider Component
interface VoiceProfileProviderProps {
  children: ReactNode
}

export function VoiceProfileProvider({ children }: VoiceProfileProviderProps) {
  const [state, dispatch] = useReducer(voiceProfileReducer, initialState)
  const { user, loading: authLoading } = useAuth()

  // Load profile data
  const loadProfile = async () => {
    if (!user || authLoading) return

    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const supabase = createClient()

      // Get voiceprint
      const { data: voiceprintList } = await supabase
        .from('voiceprints')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      const voiceprint = voiceprintList?.[0] || null

      // Get traits if voiceprint exists
      let traits = null
      if (voiceprint) {
        const { data: voiceprintTraits } = await supabase
          .from('voiceprint_traits')
          .select('*')
          .eq('voiceprint_id', voiceprint.id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()

        traits = voiceprintTraits
      }

      // Get samples
      const { data: samples } = await supabase
        .from('writing_samples')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      dispatch({
        type: 'LOAD_PROFILE_SUCCESS',
        payload: {
          voiceprint,
          traits,
          samples: samples || []
        }
      })

    } catch (error) {
      console.error('Error loading voice profile:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load voice profile' })
    }
  }

  // Refresh profile (for when data changes externally)
  const refreshProfile = async () => {
    await loadProfile()
  }

  // Convenience methods
  const toggleLock = (lockType: keyof VoiceProfileState['locks'], value?: any) => {
    dispatch({ type: 'TOGGLE_LOCK', payload: { lockType, value } })
  }

  const switchDomain = (domain: string) => {
    dispatch({ type: 'SWITCH_DOMAIN', payload: domain })
  }

  const addSample = (sample: WritingSample) => {
    dispatch({ type: 'ADD_SAMPLE', payload: sample })
  }

  const updateSample = (id: string, updates: Partial<WritingSample>) => {
    dispatch({ type: 'UPDATE_SAMPLE', payload: { id, updates } })
  }

  // Event subscription helpers
  const onProfileUpdate = (callback: (data: any) => void) => {
    return voiceProfileEventBus.subscribe('voiceProfile.updated', (_, data) => callback(data))
  }

  const onConstraintChange = (callback: (data: any) => void) => {
    return voiceProfileEventBus.subscribe('voiceProfile.constraints.changed', (_, data) => callback(data))
  }

  // Load profile on mount and user change
  useEffect(() => {
    if (user && !authLoading) {
      loadProfile()
    }
  }, [user, authLoading])

  const contextValue: VoiceProfileContextType = {
    state,
    dispatch,
    toggleLock,
    switchDomain,
    addSample,
    updateSample,
    loadProfile,
    refreshProfile,
    onProfileUpdate,
    onConstraintChange
  }

  return (
    <VoiceProfileContext.Provider value={contextValue}>
      {children}
    </VoiceProfileContext.Provider>
  )
}

// Hook to use the context
export function useVoiceProfile() {
  const context = useContext(VoiceProfileContext)
  if (context === undefined) {
    throw new Error('useVoiceProfile must be used within a VoiceProfileProvider')
  }
  return context
}

// Selectors for common data access patterns
export const useVoiceProfileSelectors = () => {
  const { state } = useVoiceProfile()

  return {
    // Coverage helpers
    hasProfile: !!state.voiceprint,
    needsMoreSamples: state.coverage.sampleCount < 3,
    isHighConfidence: state.coverage.confidence === 'high',
    
    // Lock helpers
    getEffectiveLocks: (domain?: string) => {
      const domainSettings = domain ? state.domains.settings[domain] : null
      return {
        ...state.locks,
        ...domainSettings?.customLocks
      }
    },
    
    // Risk helpers
    getHighRiskDrivers: () => {
      return Object.entries(state.riskDrivers)
        .filter(([_, driver]) => driver.level === 'high')
        .map(([name]) => name)
    },
    
    // Recent data
    getRecentSamples: (limit = 5) => {
      return state.samples.slice(0, limit)
    },
    
    // Metrics
    getCoverageStatus: () => {
      if (state.coverage.confidence === 'high') return { color: 'green', text: 'High' }
      if (state.coverage.confidence === 'medium') return { color: 'amber', text: 'Medium' }
      return { color: 'red', text: 'Low' }
    }
  }
}