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
    cached: false
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
    setState({
      status: 'connecting',
      progress: 0,
      phase: null,
      quickFixes: [],
      analysis: null,
      error: null,
      requestId: null,
      cached: false
    })
    
    // Cancel any existing connection
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    
    try {
      const response = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          title: options?.title || `Analysis ${new Date().toLocaleDateString()}`,
          voice_preset_id: options?.voice_preset_id,
          reproducible_mode: options?.reproducible_mode
        }),
        signal: abortController.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      if (!response.body) {
        throw new Error('No response body')
      }
      
      const requestId = response.headers.get('X-Request-Id') || null
      
      setState(prev => ({
        ...prev,
        status: 'streaming',
        requestId
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
                  setState(prev => ({
                    ...prev,
                    progress: event.data.progress,
                    phase: event.data.phase
                  }))
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
                    phase: 'deep_analysis'
                  }))
                  break
                  
                case 'complete':
                  setState(prev => ({
                    ...prev,
                    status: 'complete',
                    progress: 100,
                    phase: 'complete'
                  }))
                  
                  // If we have the full analysis in the complete event
                  if (event.data && !event.data.job_id) {
                    setState(prev => ({
                      ...prev,
                      analysis: event.data
                    }))
                    options?.onComplete?.(event.data)
                  } else if (state.analysis) {
                    options?.onComplete?.(state.analysis)
                  }
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
        setState(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Analysis failed'
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
      cached: false
    })
  }, [cancel])
  
  return {
    ...state,
    startAnalysis,
    cancel,
    reset
  }
}