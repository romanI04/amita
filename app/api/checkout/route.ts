import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config'
import { generateRequestId } from '@/lib/validation'
import { z } from 'zod'

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'student', 'team']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
})

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Get user session
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', requestId },
        { status: 401 }
      )
    }
    
    // Parse and validate request body
    const body = await request.json()
    const { tier, successUrl, cancelUrl } = checkoutSchema.parse(body)
    
    // Get product configuration
    const product = STRIPE_CONFIG.products[tier]
    if (!product.priceId) {
      return NextResponse.json(
        { error: 'Invalid product tier', requestId },
        { status: 400 }
      )
    }
    
    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    
    let customerId = profile?.stripe_customer_id
    
    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      
      customerId = customer.id
      
      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trial.days,
        metadata: {
          tier,
          supabase_user_id: user.id
        }
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?payment=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?payment=cancelled`,
      metadata: {
        tier,
        supabase_user_id: user.id
      }
    })
    
    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      requestId
    })
    
  } catch (error) {
    console.error('Checkout error:', error, { requestId })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors, requestId },
        { status: 400 }
      )
    }
    
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any
      return NextResponse.json(
        { error: stripeError.message || 'Stripe error occurred', requestId },
        { status: stripeError.statusCode || 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session', requestId },
      { status: 500 }
    )
  }
}