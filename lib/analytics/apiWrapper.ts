import { analyticsLogger } from './logger'

interface ApiCallOptions {
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  userId?: string
  metadata?: Record<string, any>
}

// Wrapper for fetch calls with automatic logging
export async function trackedFetch(
  url: string, 
  options: RequestInit & { analytics?: Partial<ApiCallOptions> } = {}
): Promise<Response> {
  const startTime = performance.now()
  const { analytics, ...fetchOptions } = options
  
  const apiOptions: ApiCallOptions = {
    endpoint: url,
    method: (fetchOptions.method as ApiCallOptions['method']) || 'GET',
    ...analytics
  }

  let success = false
  let statusCode = 0
  let errorMessage: string | undefined

  try {
    const response = await fetch(url, fetchOptions)
    statusCode = response.status
    success = response.ok
    
    if (!success) {
      errorMessage = `HTTP ${statusCode}: ${response.statusText}`
    }

    return response
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw error
  } finally {
    const duration = performance.now() - startTime
    
    await analyticsLogger.logApiCall(
      apiOptions.endpoint,
      apiOptions.method,
      duration,
      success,
      {
        status_code: statusCode,
        error: errorMessage,
        user_id: apiOptions.userId,
        ...apiOptions.metadata
      }
    )

    // Log performance metric
    await analyticsLogger.logPerformance({
      metric_name: `api_response_time`,
      value: duration,
      unit: 'ms',
      context: {
        endpoint: apiOptions.endpoint,
        method: apiOptions.method,
        success,
        status_code: statusCode
      }
    })

    // Log error if failed
    if (!success && errorMessage) {
      await analyticsLogger.logError({
        error_type: 'api_error',
        message: errorMessage,
        context: {
          endpoint: apiOptions.endpoint,
          method: apiOptions.method,
          status_code: statusCode,
          duration_ms: duration
        }
      })
    }
  }
}

// Wrapper for async operations with performance tracking
export async function trackAsyncOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = performance.now()
  let success = false
  let errorMessage: string | undefined

  try {
    const result = await operation()
    success = true
    return result
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    await analyticsLogger.logError({
      error_type: 'client_error',
      message: errorMessage,
      context: {
        operation: operationName,
        ...metadata
      }
    })
    
    throw error
  } finally {
    const duration = performance.now() - startTime
    
    await analyticsLogger.logPerformance({
      metric_name: `operation_${operationName}`,
      value: duration,
      unit: 'ms',
      context: {
        success,
        error: errorMessage,
        ...metadata
      }
    })
  }
}

// Specific wrapper for xAI API calls
export async function trackXaiApiCall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return trackAsyncOperation(`xai_${operation}`, apiCall, {
    api_provider: 'xai',
    ...metadata
  })
}

// Specific wrapper for Supabase operations
export async function trackSupabaseOperation<T>(
  operation: string,
  supabaseCall: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return trackAsyncOperation(`supabase_${operation}`, supabaseCall, {
    database_provider: 'supabase',
    ...metadata
  })
}