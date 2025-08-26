import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
})

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  
  // Product/Price IDs (to be set after creating in Stripe Dashboard)
  products: {
    free: {
      name: 'Free',
      priceId: null,
      features: [
        '5 analyses per month',
        'Basic AI detection',
        'Export as TXT',
        'Email support'
      ],
      limits: {
        analysesPerMonth: 5,
        voiceProfile: false,
        exportFormats: ['txt'],
        priority: false
      }
    },
    pro: {
      name: 'Pro',
      priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
      price: 19,
      features: [
        'Unlimited analyses',
        'Advanced AI detection',
        'Voice profile creation',
        'All export formats',
        'Priority support',
        'API access'
      ],
      limits: {
        analysesPerMonth: -1, // unlimited
        voiceProfile: true,
        exportFormats: ['txt', 'pdf', 'docx', 'json'],
        priority: true
      }
    },
    student: {
      name: 'Student',
      priceId: process.env.STRIPE_STUDENT_PRICE_ID || 'price_student_placeholder',
      price: 9,
      features: [
        'Unlimited analyses',
        'Advanced AI detection',
        'Voice profile creation',
        'All export formats',
        'Email support'
      ],
      limits: {
        analysesPerMonth: -1, // unlimited
        voiceProfile: true,
        exportFormats: ['txt', 'pdf', 'docx', 'json'],
        priority: false
      }
    },
    team: {
      name: 'Team',
      priceId: process.env.STRIPE_TEAM_PRICE_ID || 'price_team_placeholder',
      price: 49,
      features: [
        'Everything in Pro',
        '5 team members',
        'Admin dashboard',
        'Team analytics',
        'Custom integrations',
        'Dedicated support'
      ],
      limits: {
        analysesPerMonth: -1, // unlimited
        voiceProfile: true,
        exportFormats: ['txt', 'pdf', 'docx', 'json', 'csv'],
        priority: true,
        teamMembers: 5
      }
    }
  },
  
  // Trial configuration
  trial: {
    days: 7,
    features: 'pro' // Trial users get Pro features
  }
}

export type ProductTier = keyof typeof STRIPE_CONFIG.products
export type ProductConfig = typeof STRIPE_CONFIG.products[ProductTier]