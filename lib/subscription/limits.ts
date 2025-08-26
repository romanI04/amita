import { createClient } from '@/lib/supabase/server'
import { STRIPE_CONFIG, ProductTier } from '@/lib/stripe/config'

export interface UsageLimits {
  analysesPerMonth: number
  analysesUsed: number
  canAnalyze: boolean
  daysUntilReset: number
  hasVoiceProfile: boolean
  exportFormats: string[]
  isPro: boolean
  message?: string
}

export async function getUserLimits(userId: string): Promise<UsageLimits> {
  const supabase = await createClient()
  
  // Get user's subscription info
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, subscription_status, trial_ends_at, is_premium')
    .eq('id', userId)
    .single()
  
  // Debug logging
  console.log('User subscription info:', {
    userId,
    tier: profile?.subscription_tier,
    status: profile?.subscription_status,
    isPremium: profile?.is_premium,
    trialEndsAt: profile?.trial_ends_at
  })
  
  const tier = (profile?.subscription_tier || 'free') as ProductTier
  const status = profile?.subscription_status || 'free'
  
  // Check multiple conditions for Pro status - is_premium is the ultimate override
  const isPro = profile?.is_premium === true || 
                (status === 'active' && (tier === 'pro' || tier === 'student' || tier === 'team')) ||
                (status === 'trialing' && profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date())
  
  // Get effective tier - use pro if any pro condition is met
  let effectiveTier: ProductTier = 'free'
  if (isPro || profile?.is_premium === true) {
    // Force pro tier for premium users
    effectiveTier = 'pro'
  } else if (tier && tier in STRIPE_CONFIG.products) {
    effectiveTier = tier as ProductTier
  }
  
  // Ensure we have a valid tier
  if (!(effectiveTier in STRIPE_CONFIG.products)) {
    console.warn(`Invalid tier "${effectiveTier}", defaulting to free`)
    effectiveTier = 'free'
  }
  
  const limits = STRIPE_CONFIG.products[effectiveTier].limits
  
  console.log('Effective subscription:', {
    effectiveTier,
    isPro,
    limits: limits.analysesPerMonth
  })
  
  // Count analyses this month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { count: analysesUsed } = await supabase
    .from('writing_samples')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', firstOfMonth.toISOString())
  
  // Calculate days until reset
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const daysUntilReset = Math.ceil((nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  // Determine if user can analyze
  // Pro users (unlimited = -1) can always analyze, others check against limit
  const canAnalyze = limits.analysesPerMonth === -1 || (analysesUsed || 0) < limits.analysesPerMonth
  
  console.log('Analysis check:', {
    analysesPerMonth: limits.analysesPerMonth,
    analysesUsed: analysesUsed || 0,
    canAnalyze,
    isPro
  })
  
  // Build message based on subscription status
  let message: string | undefined
  if (isPro || profile?.is_premium) {
    // Pro users should never see limit messages
    if (analysesUsed && analysesUsed > 0) {
      message = `${analysesUsed} ${analysesUsed === 1 ? 'analysis' : 'analyses'} completed this month (unlimited)`
    }
  } else if (!canAnalyze) {
    message = `You've used all ${limits.analysesPerMonth} analyses this month. Upgrade to Pro for unlimited analyses!`
  } else if (limits.analysesPerMonth > 0 && (analysesUsed || 0) >= limits.analysesPerMonth - 1) {
    const remaining = limits.analysesPerMonth - (analysesUsed || 0)
    message = `${remaining} ${remaining === 1 ? 'analysis' : 'analyses'} remaining this month`
  }
  
  return {
    analysesPerMonth: limits.analysesPerMonth,
    analysesUsed: analysesUsed || 0,
    canAnalyze,
    daysUntilReset,
    hasVoiceProfile: limits.voiceProfile,
    exportFormats: limits.exportFormats,
    isPro: effectiveTier === 'pro' || effectiveTier === 'team',
    message
  }
}

export async function checkAnalysisLimit(userId: string): Promise<{ allowed: boolean; message?: string; limits?: UsageLimits }> {
  const limits = await getUserLimits(userId)
  
  if (!limits.canAnalyze) {
    return {
      allowed: false,
      message: limits.message || 'You have reached your monthly analysis limit',
      limits
    }
  }
  
  return {
    allowed: true,
    message: limits.message,
    limits
  }
}

export async function incrementAnalysisCount(userId: string): Promise<void> {
  // This is handled automatically by the writing_samples table insert
  // But we could add caching here if needed for performance
}