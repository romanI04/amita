import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRequestId } from '@/lib/validation'

// Cache metrics for 30 seconds to reduce database load
let metricsCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 30 * 1000 // 30 seconds

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Check cache first
    if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(metricsCache.data)
    }
    
    const supabase = await createClient()
    
    // Get real user count
    const { count: userCount, error: userError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    // Get total analyses count
    const { count: analysisCount, error: analysisError } = await supabase
      .from('writing_samples')
      .select('*', { count: 'exact', head: true })
    
    // Get average accuracy from recent analyses (last 100)
    const { data: recentAnalyses, error: accuracyError } = await supabase
      .from('writing_samples')
      .select('authenticity_score')
      .order('created_at', { ascending: false })
      .limit(100)
    
    // Calculate average accuracy
    let avgAccuracy = 85 // Default if no data
    if (recentAnalyses && recentAnalyses.length > 0) {
      const totalScore = recentAnalyses.reduce((sum, item) => 
        sum + (item.authenticity_score || 0), 0
      )
      avgAccuracy = Math.round(totalScore / recentAnalyses.length)
    }
    
    // Get last analysis time
    const { data: lastAnalysis, error: lastError } = await supabase
      .from('writing_samples')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    // Calculate time since last analysis
    let lastAnalysisAgo = null
    if (lastAnalysis?.created_at) {
      const timeDiff = Date.now() - new Date(lastAnalysis.created_at).getTime()
      const seconds = Math.floor(timeDiff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      
      if (days > 0) {
        lastAnalysisAgo = `${days} day${days > 1 ? 's' : ''} ago`
      } else if (hours > 0) {
        lastAnalysisAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else if (minutes > 0) {
        lastAnalysisAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      } else {
        lastAnalysisAgo = `${seconds} second${seconds > 1 ? 's' : ''} ago`
      }
    }
    
    // Get today's analysis count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayCount, error: todayError } = await supabase
      .from('writing_samples')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
    
    // Prepare response with real metrics
    const metrics = {
      users: {
        total: userCount || 0,
        display: userCount && userCount >= 1000 
          ? `${Math.floor(userCount / 1000)}k+` 
          : userCount && userCount >= 100
          ? `${Math.floor(userCount / 100) * 100}+`
          : userCount || 0,
        label: 'Writers Protected'
      },
      accuracy: {
        value: avgAccuracy,
        display: `${avgAccuracy}%`,
        label: 'Average Authenticity',
        disclaimer: recentAnalyses?.length < 10 
          ? 'Based on limited data' 
          : `Based on ${recentAnalyses.length} recent analyses`
      },
      analyses: {
        total: analysisCount || 0,
        today: todayCount || 0,
        display: analysisCount && analysisCount >= 1000
          ? `${Math.floor(analysisCount / 1000)}k+`
          : analysisCount || 0,
        label: 'Texts Analyzed'
      },
      lastActivity: {
        time: lastAnalysisAgo,
        label: 'Last analysis'
      },
      timestamp: new Date().toISOString(),
      requestId
    }
    
    // Update cache
    metricsCache = {
      data: metrics,
      timestamp: Date.now()
    }
    
    return NextResponse.json(metrics)
    
  } catch (error) {
    console.error('Metrics API error:', error, { requestId })
    
    // Return safe defaults on error
    return NextResponse.json({
      users: { total: 0, display: '0', label: 'Writers Protected' },
      accuracy: { value: 85, display: '85%', label: 'Average Authenticity' },
      analyses: { total: 0, today: 0, display: '0', label: 'Texts Analyzed' },
      lastActivity: { time: null, label: 'Last analysis' },
      error: 'Unable to fetch live metrics',
      requestId
    })
  }
}