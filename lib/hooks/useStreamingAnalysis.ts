import { useState, useCallback, useRef } from 'react'

export interface StreamingAnalysisState {
  status: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'
  progress: number
  phase: 'quick_scan' | 'deep_analysis' | 'complete' | null
  quickFixes: Array<{
    issue: string
    fix: string
    impact: 'high' | 'medium'
    risk_reduction: number
  }>
  analysis: any | null
  error: string | null
  requestId: string | null
  cached: boolean
  startTime: number | null
  estimatedTimeRemaining: number | null // in seconds
  sampleId: string | null
}

export interface StreamEvent {
  type: 'start' | 'progress' | 'quick_fixes' | 'deep_analysis' | 'complete' | 'error'
  data: any
  timestamp: number
}

export function useStreamingAnalysis() {
  const [state, setState] = useState<StreamingAnalysisState>({
    status: 'idle',
    progress: 0,
    phase: null,
    quickFixes: [],
    analysis: null,
    error: null,
    requestId: null,
    cached: false,
    startTime: null,
    estimatedTimeRemaining: null,
    sampleId: null
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const startAnalysis = useCallback(async (
    text: string,
    options?: {
      title?: string
      voice_preset_id?: string
      reproducible_mode?: boolean
      onQuickFixes?: (fixes: any[]) => void
      onComplete?: (analysis: any) => void
    }
  ) => {
    // Reset state
    const startTime = Date.now()
    setState({
      status: 'connecting',
      progress: 0,
      phase: null,
      quickFixes: [],
      analysis: null,
      error: null,
      requestId: null,
      cached: false,
      startTime,
      estimatedTimeRemaining: null,
      sampleId: null
    })
    
    // Cancel any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    // Generate a requestId upfront
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // Try streaming endpoint first
      let response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          title: options?.title || `Analysis ${new Date().toLocaleDateString()}`,
          voice_preset_id: options?.voice_preset_id,
          reproducible_mode: options?.reproducible_mode,
          bypass_cache: true  // Temporarily bypass cache for testing
        }),
        signal: abortController.signal,
        credentials: 'same-origin'
      })
      
      // Handle specific error codes with user-friendly messages
      if (!response.ok) {
        let errorMessage = 'Analysis failed'
        
        if (response.status === 503) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a few moments.'
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait a minute before trying again.'
        } else if (response.status === 401) {
          errorMessage = 'Authentication required. Please sign in and try again.'
        } else if (response.status === 400) {
          errorMessage = 'Invalid request. Please ensure your text is at least 50 characters.'
        }
        
        // Try to get more specific error from response
        try {
          const errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Ignore JSON parse errors
        }
        
        throw new Error(errorMessage)
      }
      
      // If streaming endpoint fails, fall back to regular analyze
      if (!response.body) {
        console.log('Streaming not available, falling back to regular analysis')
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            title: options?.title || `Analysis ${new Date().toLocaleDateString()}`
          }),
          signal: abortController.signal,
          credentials: 'same-origin'
        })
        
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || `HTTP ${response.status}`)
        }
        
        // Handle non-streaming response
        const result = await response.json()
        
        // Map detected sections to quick fixes - ONLY if they exist
        const quickFixes = result.detected_sections?.map((section: any) => ({
          issue: section.text,
          fix: section.suggestion,
          impact: section.confidence > 70 ? 'high' : 'medium',
          risk_reduction: Math.min(20, Math.round(section.confidence / 5))
        })).filter((fix: any) => fix.issue && fix.fix) || []
        
        setState({
          status: 'complete',
          progress: 100,
          phase: 'complete',
          quickFixes,
          analysis: result,
          error: null,
          requestId: result.id || requestId,
          cached: false,
          startTime: state.startTime,
          estimatedTimeRemaining: 0,
          sampleId: state.sampleId
        })
        
        if (options?.onComplete) {
          options.onComplete(result)
        }
        
        return
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }
      
      const serverRequestId = response.headers.get('X-Request-Id') || requestId
      
      setState(prev => ({
        ...prev,
        status: 'streaming',
        requestId: serverRequestId
      }))
      
      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete events from buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))
              
              switch (event.type) {
                case 'start':
                  setState(prev => ({
                    ...prev,
                    cached: event.data.cached
                  }))
                  break
                  
                case 'progress':
                  setState(prev => {
                    // Calculate ETA based on progress and elapsed time
                    let estimatedTimeRemaining = null
                    if (prev.startTime && event.data.progress > 0 && event.data.progress < 100) {
                      const elapsed = (Date.now() - prev.startTime) / 1000 // in seconds
                      const rate = event.data.progress / elapsed // progress per second
                      const remaining = (100 - event.data.progress) / rate
                      estimatedTimeRemaining = Math.max(1, Math.round(remaining))
                    }
                    
                    return {
                      ...prev,
                      progress: event.data.progress,
                      phase: event.data.phase,
                      estimatedTimeRemaining
                    }
                  })
                  break
                  
                case 'quick_fixes':
                  setState(prev => ({
                    ...prev,
                    quickFixes: event.data.fixes,
                    progress: event.data.progress
                  }))
                  options?.onQuickFixes?.(event.data.fixes)
                  break
                  
                case 'deep_analysis':
                  setState(prev => ({
                    ...prev,
                    analysis: event.data,
                    progress: event.data.progress,
                    phase: 'deep_analysis',
                    sampleId: event.data.sample_id || prev.sampleId
                  }))
                  // Also trigger onComplete when we get the deep analysis
                  if (event.data && event.data.detected_sections) {
                    options?.onComplete?.(event.data)
                  }
                  break
                  
                case 'complete':
                  setState(prev => ({
                    ...prev,
                    status: 'complete',
                    progress: 100,
                    phase: 'complete'
                  }))
                  
                  // Pass the stored analysis data if we have it
                  // Note: We don't call onComplete here since it was already called in deep_analysis
                  break
                  
                case 'error':
                  setState(prev => ({
                    ...prev,
                    status: 'error',
                    error: event.data.error
                  }))
                  break
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e)
            }
          }
        }
      }
    } catch (error) {
      if ((error as any).name === 'AbortError') {
        // User cancelled
        setState(prev => ({
          ...prev,
          status: 'idle',
          error: 'Analysis cancelled'
        }))
      } else {
        // Provide user-friendly error messages
        let errorMessage = 'Analysis failed. Please try again.'
        
        if (error instanceof Error) {
          if (error.message.includes('Network') || error.message.includes('fetch')) {
            errorMessage = 'Connection issue. Please check your internet and try again.'
          } else if (error.message.includes('timeout')) {
            errorMessage = 'Analysis is taking longer than expected. Please try with a shorter text.'
          } else if (error.message.includes('429') || error.message.includes('rate')) {
            errorMessage = 'Too many requests. Please wait a moment and try again.'
          } else if (error.message.includes('500') || error.message.includes('503')) {
            errorMessage = 'Service temporarily unavailable. Please try again in a few moments.'
          } else if (error.message.includes('401') || error.message.includes('authentication')) {
            errorMessage = 'Session expired. Please refresh the page and sign in again.'
          } else {
            errorMessage = error.message
          }
        }
        
        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage
        }))
      }
    }
  }, [])
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({
      ...prev,
      status: 'idle'
    }))
  }, [])
  
  const reset = useCallback(() => {
    cancel()
    setState({
      status: 'idle',
      progress: 0,
      phase: null,
      quickFixes: [],
      analysis: null,
      error: null,
      requestId: null,
      cached: false,
      startTime: Date.now(),
      estimatedTimeRemaining: 0,
      sampleId: null
    })
  }, [cancel])
  
  return {
    ...state,
    startAnalysis,
    cancel,
    reset
  }
}