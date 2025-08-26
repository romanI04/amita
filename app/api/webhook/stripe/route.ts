import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_CONFIG.webhookSecret
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }
  
  const supabase = await createClient()
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const tier = session.metadata?.tier
        
        if (!userId || !tier) {
          console.error('Missing metadata in checkout session:', session.id)
          break
        }
        
        // Update user profile with subscription info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'trialing',
            subscription_tier: tier,
            trial_ends_at: new Date(Date.now() + STRIPE_CONFIG.trial.days * 24 * 60 * 60 * 1000).toISOString(),
            stripe_subscription_id: session.subscription as string
          })
          .eq('id', userId)
        
        if (updateError) {
          console.error('Failed to update profile:', updateError)
        }
        
        // Create subscription record
        await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            stripe_subscription_id: session.subscription as string,
            status: 'trialing',
            tier,
            amount: session.amount_total ? session.amount_total / 100 : 0,
            currency: session.currency || 'usd'
          })
        
        break
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        
        if (!userId) {
          console.error('Missing user ID in subscription metadata:', subscription.id)
          break
        }
        
        // Map Stripe status to our status
        let status = subscription.status
        if (status === 'active' || status === 'trialing') {
          status = subscription.status
        } else if (status === 'past_due') {
          status = 'past_due'
        } else {
          status = 'inactive'
        }
        
        // Update profile
        await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            trial_ends_at: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null
          })
          .eq('stripe_subscription_id', subscription.id)
        
        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({
            status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        
        break
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Set user to free tier
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'free',
            subscription_tier: 'free',
            trial_ends_at: null
          })
          .eq('stripe_subscription_id', subscription.id)
        
        // Update subscription record
        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        
        break
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        
        // Update subscription to active if it was trialing
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'active'
          })
          .eq('stripe_subscription_id', subscriptionId)
          .eq('subscription_status', 'trialing')
        
        break
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        
        // Update subscription status
        await supabase
          .from('profiles')
          .update({
            subscription_status: 'past_due'
          })
          .eq('stripe_subscription_id', subscriptionId)
        
        // TODO: Send email notification to user
        
        break
      }
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
    
    return NextResponse.json({ received: true })
    
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}