#!/usr/bin/env node

// This script creates the Stripe products and prices for amita.ai
// Run with: node scripts/setup-stripe-products.js

require('dotenv').config({ path: '.env.local' })
const Stripe = require('stripe')

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in .env.local')
  process.exit(1)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
})

async function setupProducts() {
  try {
    console.log('🚀 Setting up Stripe products for amita.ai...\n')

    // Create Pro Product
    console.log('Creating Pro product...')
    const proProduct = await stripe.products.create({
      name: 'amita.ai Pro',
      description: 'Advanced AI writing analysis with unlimited analyses and voice profiling',
      metadata: {
        tier: 'pro'
      }
    })
    
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 1900, // $19.00
      currency: 'usd',
      recurring: {
        interval: 'month',
        trial_period_days: 7
      },
      metadata: {
        tier: 'pro'
      }
    })
    console.log(`✅ Pro: ${proPrice.id}`)

    // Create Student Product
    console.log('Creating Student product...')
    const studentProduct = await stripe.products.create({
      name: 'amita.ai Student',
      description: 'Special pricing for students with edu email verification',
      metadata: {
        tier: 'student'
      }
    })
    
    const studentPrice = await stripe.prices.create({
      product: studentProduct.id,
      unit_amount: 900, // $9.00
      currency: 'usd',
      recurring: {
        interval: 'month',
        trial_period_days: 7
      },
      metadata: {
        tier: 'student'
      }
    })
    console.log(`✅ Student: ${studentPrice.id}`)

    // Create Team Product
    console.log('Creating Team product...')
    const teamProduct = await stripe.products.create({
      name: 'amita.ai Team',
      description: 'Team collaboration with admin dashboard and analytics',
      metadata: {
        tier: 'team'
      }
    })
    
    const teamPrice = await stripe.prices.create({
      product: teamProduct.id,
      unit_amount: 4900, // $49.00
      currency: 'usd',
      recurring: {
        interval: 'month',
        trial_period_days: 14
      },
      metadata: {
        tier: 'team'
      }
    })
    console.log(`✅ Team: ${teamPrice.id}`)

    // Output environment variables to add
    console.log('\n📝 Add these to your .env.local file:\n')
    console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`)
    console.log(`STRIPE_STUDENT_PRICE_ID=${studentPrice.id}`)
    console.log(`STRIPE_TEAM_PRICE_ID=${teamPrice.id}`)
    
    console.log('\n✨ Products created successfully!')
    console.log('View them at: https://dashboard.stripe.com/test/products')

  } catch (error) {
    console.error('❌ Error creating products:', error.message)
    process.exit(1)
  }
}

setupProducts()