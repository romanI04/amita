import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for applying a referral code
const applyReferralSchema = z.object({
  code: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const requestId = `ref-apply-${Date.now()}`
  
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

    // Parse request body
    const body = await request.json()
    const { code } = applyReferralSchema.parse(body)

    // Get referral code details
    const { data: referralCode, error: codeError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', code)
      .eq('status', 'active')
      .single()

    if (codeError || !referralCode) {
      return NextResponse.json(
        { error: 'Invalid or expired referral code', requestId },
        { status: 400 }
      )
    }

    // Check if user is trying to use their own code
    if (referralCode.user_id === user.id) {
      return NextResponse.json(
        { error: 'You cannot use your own referral code', requestId },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (referralCode.max_uses && referralCode.current_uses >= referralCode.max_uses) {
      return NextResponse.json(
        { error: 'This referral code has reached its maximum uses', requestId },
        { status: 400 }
      )
    }

    // Check if code has expired
    if (referralCode.expires_at && new Date(referralCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This referral code has expired', requestId },
        { status: 400 }
      )
    }

    // Check if user has already used a referral code
    const { data: existingUse } = await supabase
      .from('referral_uses')
      .select('id')
      .eq('referred_user_id', user.id)
      .single()

    if (existingUse) {
      return NextResponse.json(
        { error: 'You have already used a referral code', requestId },
        { status: 400 }
      )
    }

    // Apply the referral code
    const { error: applyError } = await supabase
      .from('referral_uses')
      .insert({
        referral_code_id: referralCode.id,
        referred_user_id: user.id,
        referrer_user_id: referralCode.user_id,
        status: 'pending'
      })

    if (applyError) {
      console.error('Error applying referral:', applyError)
      return NextResponse.json(
        { error: 'Failed to apply referral code', requestId },
        { status: 500 }
      )
    }

    // Update the usage count
    await supabase
      .from('referral_codes')
      .update({ current_uses: referralCode.current_uses + 1 })
      .eq('id', referralCode.id)

    // Apply reward based on type
    let rewardMessage = ''
    switch (referralCode.reward_type) {
      case 'free_month':
        rewardMessage = `You've received ${referralCode.reward_value} free month(s)!`
        // TODO: Integrate with subscription system
        break
      case 'discount_percent':
        rewardMessage = `You've received a ${referralCode.reward_value}% discount!`
        break
      case 'credits':
        rewardMessage = `You've received ${referralCode.reward_value} credits!`
        break
    }

    return NextResponse.json({
      success: true,
      reward_type: referralCode.reward_type,
      reward_value: referralCode.reward_value,
      message: rewardMessage,
      requestId
    })
    
  } catch (error) {
    console.error('Referral application error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors, requestId },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error', requestId },
      { status: 500 }
    )
  }
}