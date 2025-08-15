import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for creating a referral code
const createReferralSchema = z.object({
  reward_type: z.enum(['free_month', 'discount_percent', 'credits']),
  reward_value: z.number().positive(),
  max_uses: z.number().positive().optional(),
  expires_at: z.string().optional(),
})

// Generate unique referral code
function generateReferralCode(userId: string): string {
  const prefix = 'AMITA'
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${random}`
}

export async function POST(request: NextRequest) {
  const requestId = `ref-create-${Date.now()}`
  
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
    const validatedData = createReferralSchema.parse(body)

    // Check if user already has an active referral code
    const { data: existingCode, error: checkError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingCode && !checkError) {
      return NextResponse.json({
        code: existingCode.code,
        message: 'You already have an active referral code',
        requestId
      })
    }

    // Generate unique code
    let code = generateReferralCode(user.id)
    let attempts = 0
    
    // Ensure code is unique
    while (attempts < 5) {
      const { data: codeExists } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!codeExists) break
      
      code = generateReferralCode(user.id)
      attempts++
    }

    // Create referral code
    const { data: referralCode, error: createError } = await supabase
      .from('referral_codes')
      .insert({
        user_id: user.id,
        code,
        reward_type: validatedData.reward_type,
        reward_value: validatedData.reward_value,
        max_uses: validatedData.max_uses || null,
        expires_at: validatedData.expires_at || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating referral code:', createError)
      return NextResponse.json(
        { error: 'Failed to create referral code', requestId },
        { status: 500 }
      )
    }

    return NextResponse.json({
      code: referralCode.code,
      reward_type: referralCode.reward_type,
      reward_value: referralCode.reward_value,
      share_url: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${referralCode.code}`,
      requestId
    })
    
  } catch (error) {
    console.error('Referral creation error:', error)
    
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