import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestId = `ref-stats-${Date.now()}`
  
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', requestId },
        { status: 401 }
      )
    }

    // Get user's referral code
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (codeError || !referralCode) {
      return NextResponse.json({
        has_code: false,
        stats: null,
        requestId
      })
    }

    // Get referral uses
    const { data: referralUses, error: usesError } = await supabase
      .from('referral_uses')
      .select(`
        id,
        status,
        signup_at,
        reward_granted_at,
        referred_user:referred_user_id (
          id,
          email
        )
      `)
      .eq('referral_code_id', referralCode.id)
      .order('signup_at', { ascending: false })

    if (usesError) {
      console.error('Error fetching referral uses:', usesError)
      return NextResponse.json(
        { error: 'Failed to fetch referral statistics', requestId },
        { status: 500 }
      )
    }

    // Calculate stats
    const stats = {
      total_referrals: referralUses?.length || 0,
      pending_referrals: referralUses?.filter(r => r.status === 'pending').length || 0,
      completed_referrals: referralUses?.filter(r => r.status === 'completed').length || 0,
      total_rewards_earned: referralUses?.filter(r => r.status === 'completed').length || 0 * referralCode.reward_value,
    }

    return NextResponse.json({
      has_code: true,
      code: referralCode.code,
      share_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode.code}`,
      reward_type: referralCode.reward_type,
      reward_value: referralCode.reward_value,
      max_uses: referralCode.max_uses,
      current_uses: referralCode.current_uses,
      expires_at: referralCode.expires_at,
      stats,
      recent_referrals: referralUses?.slice(0, 5) || [],
      requestId
    })
    
  } catch (error) {
    console.error('Referral stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    )
  }
}