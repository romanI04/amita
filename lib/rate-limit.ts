import { NextRequest } from 'next/server'

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  maxRequests: number // Max requests per interval
}

// In-memory store for rate limiting (consider using Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetTime < now) {
      requestCounts.delete(key)
    }
  }
}, 60000) // Clean up every minute

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = { interval: 60000, maxRequests: 10 }
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Get identifier (user ID from auth or IP address)
  const userId = request.headers.get('x-user-id')
  const ip = request.headers.get('x-forwarded-for') || 
              request.headers.get('x-real-ip') || 
              'unknown'
  
  const identifier = userId || ip
  const key = `${request.nextUrl.pathname}:${identifier}`
  const now = Date.now()
  
  // Get or create rate limit entry
  let entry = requestCounts.get(key)
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + config.interval
    }
    requestCounts.set(key, entry)
    return { allowed: true }
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000) // Convert to seconds
    return { 
      allowed: false, 
      retryAfter 
    }
  }
  
  // Increment count
  entry.count++
  requestCounts.set(key, entry)
  
  return { allowed: true }
}

// Preset configurations for different endpoints
export const RATE_LIMITS = {
  analyze: { interval: 60000, maxRequests: 10 }, // 10 requests per minute
  rewrite: { interval: 60000, maxRequests: 20 }, // 20 requests per minute
  voiceprint: { interval: 3600000, maxRequests: 5 }, // 5 requests per hour
  upload: { interval: 60000, maxRequests: 5 }, // 5 uploads per minute
  export: { interval: 60000, maxRequests: 10 } // 10 exports per minute
}