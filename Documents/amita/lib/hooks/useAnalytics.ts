import { useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { analyticsLogger, logUserAction, logSystemEvent, logPerformance, logError, logBusinessMetric } from '@/lib/analytics/logger'

export function useAnalytics() {
  const { user } = useAuth()

  useEffect(() => {
    if (user?.id) {
      analyticsLogger.setUserId(user.id)
    }
  }, [user?.id])

  // User action tracking with automatic component context
  const trackUserAction = useCallback((action: string, details?: Record<string, any>) => {
    const component = getComponentName()
    logUserAction(action, component, details)
  }, [])

  // System event tracking
  const trackSystemEvent = useCallback((event: string, subsystem: 'voice_profile' | 'analysis' | 'auth' | 'api' | 'database', details?: Record<string, any>) => {
    logSystemEvent(event, subsystem, details)
  }, [])

  // Performance tracking
  const trackPerformance = useCallback((metricName: string, value: number, unit: 'ms' | 'bytes' | 'count' | 'percentage', context?: Record<string, any>) => {
    logPerformance(metricName, value, unit, context)
  }, [])

  // Error tracking
  const trackError = useCallback((errorType: 'client_error' | 'api_error' | 'validation_error' | 'network_error', message: string, context?: Record<string, any>) => {
    logError(errorType, message, context)
  }, [])

  // Business metric tracking
  const trackBusinessMetric = useCallback((metric: 'voice_profile_created' | 'analysis_completed' | 'sample_uploaded' | 'rewrite_applied' | 'suggestion_accepted', value: number = 1, dimensions?: Record<string, any>) => {
    logBusinessMetric(metric, value, dimensions)
  }, [])

  return {
    trackUserAction,
    trackSystemEvent,
    trackPerformance,
    trackError,
    trackBusinessMetric
  }
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const { trackPerformance } = useAnalytics()

  // Track component render performance
  const trackRenderTime = useCallback((componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      trackPerformance(`render_time_${componentName}`, endTime - startTime, 'ms', {
        component: componentName
      })
    }
  }, [trackPerformance])

  // Track API call performance
  const trackApiPerformance = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now()
    let success = false
    let error: Error | null = null

    try {
      const result = await apiCall()
      success = true
      return result
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      throw err
    } finally {
      const duration = performance.now() - startTime
      trackPerformance(`api_${endpoint.replace(/\//g, '_')}`, duration, 'ms', {
        endpoint,
        success,
        error: error?.message
      })
    }
  }, [trackPerformance])

  // Track memory usage
  const trackMemoryUsage = useCallback((context?: Record<string, any>) => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      trackPerformance('memory_usage', memory.usedJSHeapSize, 'bytes', {
        total_heap: memory.totalJSHeapSize,
        heap_limit: memory.jsHeapSizeLimit,
        ...context
      })
    }
  }, [trackPerformance])

  return {
    trackRenderTime,
    trackApiPerformance,
    trackMemoryUsage
  }
}

// Voice Profile specific analytics hook
export function useVoiceProfileAnalytics() {
  const { trackSystemEvent, trackBusinessMetric, trackUserAction } = useAnalytics()

  const trackVoiceProfileCreated = useCallback((profileId: string, sampleCount: number, wordCount: number) => {
    trackSystemEvent('voice_profile_created', 'voice_profile', { 
      profile_id: profileId,
      sample_count: sampleCount,
      word_count: wordCount
    })
    trackBusinessMetric('voice_profile_created', 1, { 
      sample_count: sampleCount,
      word_count: wordCount
    })
  }, [trackSystemEvent, trackBusinessMetric])

  const trackVoiceProfileUpdated = useCallback((profileId: string, updateType: 'lock_change' | 'domain_switch' | 'trait_update', details?: Record<string, any>) => {
    trackSystemEvent('voice_profile_updated', 'voice_profile', { 
      profile_id: profileId,
      update_type: updateType,
      ...details
    })
  }, [trackSystemEvent])

  const trackLockToggled = useCallback((lockType: string, enabled: boolean, profileId?: string) => {
    trackUserAction('toggle_voice_lock', { 
      lock_type: lockType, 
      enabled,
      profile_id: profileId 
    })
    trackVoiceProfileUpdated(profileId || 'unknown', 'lock_change', { lock_type: lockType, enabled })
  }, [trackUserAction, trackVoiceProfileUpdated])

  const trackDomainSwitch = useCallback((fromDomain: string, toDomain: string, profileId?: string) => {
    trackUserAction('switch_domain', { 
      from_domain: fromDomain, 
      to_domain: toDomain,
      profile_id: profileId 
    })
    trackVoiceProfileUpdated(profileId || 'unknown', 'domain_switch', { from_domain: fromDomain, to_domain: toDomain })
  }, [trackUserAction, trackVoiceProfileUpdated])

  return {
    trackVoiceProfileCreated,
    trackVoiceProfileUpdated,
    trackLockToggled,
    trackDomainSwitch
  }
}

// Analysis specific analytics hook
export function useAnalysisAnalytics() {
  const { trackSystemEvent, trackBusinessMetric, trackUserAction, trackError } = useAnalytics()

  const trackAnalysisStarted = useCallback((textLength: number, sampleId?: string) => {
    trackSystemEvent('analysis_started', 'analysis', { 
      text_length: textLength,
      sample_id: sampleId
    })
  }, [trackSystemEvent])

  const trackAnalysisCompleted = useCallback((
    sampleId: string, 
    integrityScore: number, 
    riskScore: number, 
    duration: number
  ) => {
    trackSystemEvent('analysis_completed', 'analysis', { 
      sample_id: sampleId,
      integrity_score: integrityScore,
      risk_score: riskScore,
      duration_ms: duration
    })
    trackBusinessMetric('analysis_completed', 1, { 
      integrity_score: integrityScore,
      risk_score: riskScore
    })
  }, [trackSystemEvent, trackBusinessMetric])

  const trackAnalysisFailed = useCallback((error: string, textLength?: number) => {
    trackSystemEvent('analysis_failed', 'analysis', { 
      error,
      text_length: textLength
    })
    trackError('api_error', `Analysis failed: ${error}`, { text_length: textLength })
  }, [trackSystemEvent, trackError])

  const trackRewriteApplied = useCallback((
    sampleId: string, 
    sectionsRewritten: number, 
    riskReduction: number
  ) => {
    trackSystemEvent('analysis_rewritten', 'analysis', { 
      sample_id: sampleId,
      sections_rewritten: sectionsRewritten,
      risk_reduction: riskReduction
    })
    trackBusinessMetric('rewrite_applied', sectionsRewritten, { 
      risk_reduction: riskReduction
    })
    trackUserAction('apply_rewrite', { 
      sample_id: sampleId,
      sections_rewritten: sectionsRewritten
    })
  }, [trackSystemEvent, trackBusinessMetric, trackUserAction])

  const trackSuggestionAccepted = useCallback((suggestionType: string, sampleId?: string) => {
    trackUserAction('accept_suggestion', { 
      suggestion_type: suggestionType,
      sample_id: sampleId
    })
    trackBusinessMetric('suggestion_accepted', 1, { 
      suggestion_type: suggestionType
    })
  }, [trackUserAction, trackBusinessMetric])

  const trackSampleUploaded = useCallback((sampleId: string, wordCount: number, uploadType: 'paste' | 'file') => {
    trackUserAction('upload_sample', { 
      sample_id: sampleId,
      word_count: wordCount,
      upload_type: uploadType
    })
    trackBusinessMetric('sample_uploaded', 1, { 
      word_count: wordCount,
      upload_type: uploadType
    })
  }, [trackUserAction, trackBusinessMetric])

  return {
    trackAnalysisStarted,
    trackAnalysisCompleted,
    trackAnalysisFailed,
    trackRewriteApplied,
    trackSuggestionAccepted,
    trackSampleUploaded
  }
}

// Helper function to get component name from stack trace
function getComponentName(): string {
  try {
    const stack = new Error().stack
    if (!stack) return 'unknown'
    
    // Try to extract React component name from stack
    const lines = stack.split('\n')
    for (const line of lines) {
      if (line.includes('.tsx') || line.includes('.jsx')) {
        const match = line.match(/([A-Z][a-zA-Z0-9]+)/)
        if (match) return match[1]
      }
    }
    
    // Fallback to pathname
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const segments = path.split('/').filter(Boolean)
      return segments[segments.length - 1] || 'home'
    }
    
    return 'unknown'
  } catch {
    return 'unknown'
  }
}