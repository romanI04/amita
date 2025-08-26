#!/usr/bin/env node

// Test script to verify Stripe checkout works
// Run with: node scripts/test-stripe-checkout.js

require('dotenv').config({ path: '.env.local' })
const Stripe = require('stripe')

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
})

async function testCheckout() {
  try {
    console.log('🧪 Testing Stripe Checkout Setup...\n')
    
    // Test 1: Verify API key works
    console.log('1. Testing API connection...')
    const account = await stripe.accounts.retrieve()
    console.log(`✅ Connected to Stripe account: ${account.id}\n`)
    
    // Test 2: Verify products exist
    console.log('2. Verifying products...')
    const prices = await stripe.prices.list({ limit: 10 })
    
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID
    const studentPriceId = process.env.STRIPE_STUDENT_PRICE_ID
    const teamPriceId = process.env.STRIPE_TEAM_PRICE_ID
    
    const proPrice = prices.data.find(p => p.id === proPriceId)
    const studentPrice = prices.data.find(p => p.id === studentPriceId)
    const teamPrice = prices.data.find(p => p.id === teamPriceId)
    
    if (!proPrice) {
      console.error(`❌ Pro price not found: ${proPriceId}`)
    } else {
      console.log(`✅ Pro: $${proPrice.unit_amount / 100}/month`)
    }
    
    if (!studentPrice) {
      console.error(`❌ Student price not found: ${studentPriceId}`)
    } else {
      console.log(`✅ Student: $${studentPrice.unit_amount / 100}/month`)
    }
    
    if (!teamPrice) {
      console.error(`❌ Team price not found: ${teamPriceId}`)
    } else {
      console.log(`✅ Team: $${teamPrice.unit_amount / 100}/month`)
    }
    
    // Test 3: Create a test checkout session
    console.log('\n3. Creating test checkout session...')
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: proPriceId,
        quantity: 1
      }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7
      },
      success_url: 'http://localhost:3000/dashboard?payment=success',
      cancel_url: 'http://localhost:3000/pricing?payment=cancelled'
    })
    
    console.log('✅ Checkout session created!')
    console.log(`   Session ID: ${session.id}`)
    console.log(`   URL: ${session.url}\n`)
    
    // Test 4: Verify webhook endpoint
    console.log('4. Checking webhook endpoint...')
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 })
    const ngrokEndpoint = webhookEndpoints.data.find(e => 
      e.url.includes('ngrok-free.app') || e.url.includes('localhost')
    )
    
    if (ngrokEndpoint) {
      console.log(`✅ Webhook endpoint found: ${ngrokEndpoint.url}`)
      console.log(`   Status: ${ngrokEndpoint.status}`)
      console.log(`   Events: ${ngrokEndpoint.enabled_events.slice(0, 3).join(', ')}...`)
    } else {
      console.log('⚠️  No local webhook endpoint found')
      console.log('   Add one at: https://dashboard.stripe.com/test/webhooks')
      console.log(`   URL: https://a49643227145.ngrok-free.app/api/webhook/stripe`)
    }
    
    console.log('\n✨ Stripe setup looks good!')
    console.log('\nTo test the full flow:')
    console.log('1. Go to http://localhost:3000/pricing')
    console.log('2. Click "Start 7-Day Free Trial" on the Pro plan')
    console.log('3. You should be redirected to Stripe Checkout')
    console.log('\nUse test card: 4242 4242 4242 4242')
    console.log('Any future date, any CVC')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n⚠️  Check your STRIPE_SECRET_KEY in .env.local')
    }
  }
}

testCheckout()