import { createClient } from '@/lib/supabase/client'

export interface LogEvent {
  event_type: string
  event_category: 'user_action' | 'system_event' | 'performance' | 'error' | 'business_metric'
  user_id?: string
  session_id?: string
  metadata: Record<string, any>
  timestamp: string
  page_path?: string
  user_agent?: string
  performance_metrics?: {
    duration_ms?: number
    memory_usage?: number
    api_response_time?: number
  }
}

export interface UserAction {
  action: string
  component: string
  details?: Record<string, any>
  timestamp?: string
}

export interface SystemEvent {
  event: string
  subsystem: 'voice_profile' | 'analysis' | 'auth' | 'api' | 'database'
  details?: Record<string, any>
  timestamp?: string
}

export interface PerformanceMetric {
  metric_name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  context?: Record<string, any>
  timestamp?: string
}

export interface ErrorEvent {
  error_type: 'client_error' | 'api_error' | 'validation_error' | 'network_error'
  message: string
  stack_trace?: string
  context?: Record<string, any>
  user_action?: string
  timestamp?: string
}

export interface BusinessMetric {
  metric: 'voice_profile_created' | 'analysis_completed' | 'sample_uploaded' | 'rewrite_applied' | 'suggestion_accepted'
  value: number
  dimensions?: Record<string, any>
  timestamp?: string
}

class AnalyticsLogger {
  private sessionId: string
  private userId?: string
  private enabled: boolean
  private batchEvents: LogEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private supabase = createClient()

  constructor() {
    this.sessionId = this.generateSessionId()
    this.enabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
    
    if (this.enabled) {
      this.startBatchFlush()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startBatchFlush() {
    this.flushInterval = setInterval(() => {
      this.flushEvents()
    }, 30000) // Flush every 30 seconds
  }

  setUserId(userId: string) {
    this.userId = userId
  }

  private async createLogEvent(
    eventType: string,
    category: LogEvent['event_category'],
    metadata: Record<string, any>,
    performanceMetrics?: LogEvent['performance_metrics']
  ): Promise<LogEvent> {
    return {
      event_type: eventType,
      event_category: category,
      user_id: this.userId,
      session_id: this.sessionId,
      metadata,
      timestamp: new Date().toISOString(),
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      user_agent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      performance_metrics: performanceMetrics
    }
  }

  // User Actions
  async logUserAction(action: UserAction) {
    if (!this.enabled) return

    const event = await this.createLogEvent(
      `user.${action.action}`,
      'user_action',
      {
        component: action.component,
        details: action.details || {},
        action_timestamp: action.timestamp || new Date().toISOString()
      }
    )

    this.batchEvents.push(event)
  }

  // System Events  
  async logSystemEvent(systemEvent: SystemEvent) {
    if (!this.enabled) return

    const event = await this.createLogEvent(
      `system.${systemEvent.event}`,
      'system_event',
      {
        subsystem: systemEvent.subsystem,
        details: systemEvent.details || {},
        system_timestamp: systemEvent.timestamp || new Date().toISOString()
      }
    )

    this.batchEvents.push(event)
  }

  // Performance Metrics
  async logPerformance(metric: PerformanceMetric) {
    if (!this.enabled) return

    const event = await this.createLogEvent(
      `performance.${metric.metric_name}`,
      'performance',
      {
        context: metric.context || {}
      },
      {
        duration_ms: metric.unit === 'ms' ? metric.value : undefined,
        memory_usage: metric.unit === 'bytes' ? metric.value : undefined
      }
    )

    this.batchEvents.push(event)
  }

  // Error Tracking
  async logError(error: ErrorEvent) {
    if (!this.enabled) return

    const event = await this.createLogEvent(
      `error.${error.error_type}`,
      'error',
      {
        message: error.message,
        stack_trace: error.stack_trace,
        context: error.context || {},
        user_action: error.user_action,
        error_timestamp: error.timestamp || new Date().toISOString()
      }
    )

    this.batchEvents.push(event)
    
    // Errors are flushed immediately for critical tracking
    await this.flushEvents()
  }

  // Business Metrics
  async logBusinessMetric(metric: BusinessMetric) {
    if (!this.enabled) return

    const event = await this.createLogEvent(
      `business.${metric.metric}`,
      'business_metric',
      {
        metric_value: metric.value,
        dimensions: metric.dimensions || {},
        business_timestamp: metric.timestamp || new Date().toISOString()
      }
    )

    this.batchEvents.push(event)
  }

  // Voice Profile Specific Events
  async logVoiceProfileEvent(event: 'created' | 'updated' | 'analyzed' | 'locked' | 'domain_switched', details: Record<string, any> = {}) {
    await this.logSystemEvent({
      event: `voice_profile_${event}`,
      subsystem: 'voice_profile',
      details
    })
  }

  // Analysis Specific Events  
  async logAnalysisEvent(event: 'started' | 'completed' | 'failed' | 'rewritten' | 'suggestion_applied', details: Record<string, any> = {}) {
    await this.logSystemEvent({
      event: `analysis_${event}`,
      subsystem: 'analysis',
      details
    })
  }

  // API Performance Tracking
  async logApiCall(endpoint: string, method: string, duration: number, success: boolean, details: Record<string, any> = {}) {
    await this.logPerformance({
      metric_name: `api_call_${endpoint.replace(/\//g, '_')}`,
      value: duration,
      unit: 'ms',
      context: {
        endpoint,
        method,
        success,
        ...details
      }
    })
  }

  // Batch flush events to database
  private async flushEvents() {
    if (this.batchEvents.length === 0) return

    const eventsToFlush = [...this.batchEvents]
    this.batchEvents = []

    try {
      const { error } = await this.supabase
        .from('analytics_events')
        .insert(eventsToFlush)

      if (error) {
        console.error('Failed to flush analytics events:', error)
        // Re-add events to batch for retry
        this.batchEvents.unshift(...eventsToFlush)
      }
    } catch (error) {
      console.error('Error flushing analytics events:', error)
      // Re-add events to batch for retry
      this.batchEvents.unshift(...eventsToFlush)
    }
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flushEvents() // Final flush
  }
}

// Singleton instance
const analyticsLogger = new AnalyticsLogger()

export { analyticsLogger }

// Helper functions for common logging patterns
export const logUserAction = (action: string, component: string, details?: Record<string, any>) => {
  analyticsLogger.logUserAction({ action, component, details })
}

export const logSystemEvent = (event: string, subsystem: SystemEvent['subsystem'], details?: Record<string, any>) => {
  analyticsLogger.logSystemEvent({ event, subsystem, details })
}

export const logPerformance = (metricName: string, value: number, unit: PerformanceMetric['unit'], context?: Record<string, any>) => {
  analyticsLogger.logPerformance({ metric_name: metricName, value, unit, context })
}

export const logError = (errorType: ErrorEvent['error_type'], message: string, context?: Record<string, any>) => {
  analyticsLogger.logError({ error_type: errorType, message, context })
}

export const logBusinessMetric = (metric: BusinessMetric['metric'], value: number, dimensions?: Record<string, any>) => {
  analyticsLogger.logBusinessMetric({ metric, value, dimensions })
}

// Auto-cleanup on page unload and expose globally for testing
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analyticsLogger.destroy()
  })
  
  // Expose globally for testing
  ;(window as any).analyticsLogger = analyticsLogger
  ;(window as any).__amitaAnalytics = {
    logger: analyticsLogger,
    logUserAction,
    logSystemEvent,
    logPerformance,
    logError,
    logBusinessMetric
  }
}

export default analyticsLogger