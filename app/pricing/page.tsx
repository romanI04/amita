'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { useAuth } from '@/lib/auth/context'
import { 
  CheckIcon,
  SparklesIcon,
  ArrowRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out amita.ai',
    features: [
      '5 analyses per month',
      'Basic AI detection',
      'Export as TXT',
      'Email support'
    ],
    limitations: [
      'No voice profile',
      'Limited export formats',
      'No API access'
    ],
    cta: 'Get Started',
    ctaVariant: 'outline' as const,
    tier: null
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19,
    description: 'For serious writers and professionals',
    popular: true,
    features: [
      'Unlimited analyses',
      'Advanced AI detection',
      'Voice profile creation',
      'All export formats',
      'Priority support',
      'API access'
    ],
    limitations: [],
    cta: 'Start 7-Day Free Trial',
    ctaVariant: 'default' as const,
    tier: 'pro'
  },
  {
    id: 'student',
    name: 'Student',
    price: 9,
    description: 'Special discount for students',
    features: [
      'Unlimited analyses',
      'Advanced AI detection',
      'Voice profile creation',
      'All export formats',
      'Email support'
    ],
    limitations: [
      'No API access',
      'Student verification required'
    ],
    cta: 'Start Student Trial',
    ctaVariant: 'outline' as const,
    tier: 'student'
  },
  {
    id: 'team',
    name: 'Team',
    price: 49,
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      '5 team members',
      'Admin dashboard',
      'Team analytics',
      'Custom integrations',
      'Dedicated support'
    ],
    limitations: [],
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    tier: 'team'
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (tier: string | null) => {
    if (!tier) {
      // Free plan - just redirect to signup
      router.push('/signup')
      return
    }

    if (!user) {
      // Not logged in - redirect to signup with plan info
      router.push(`/signup?plan=${tier}`)
      return
    }

    if (tier === 'team') {
      // Team plan - contact sales
      window.location.href = 'mailto:sales@amita.ai?subject=Team Plan Inquiry'
      return
    }

    // Start checkout process
    setLoading(tier)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/dashboard?payment=success&plan=${tier}`,
          cancelUrl: `${window.location.origin}/pricing?payment=cancelled`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  const currentPlan = profile?.subscription_tier || 'free'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              amita.ai
            </Link>
            <div className="flex items-center space-x-3">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log in</Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Get started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-600 text-sm font-medium rounded-full mb-4">
            <SparklesIcon className="h-4 w-4 mr-1" />
            7-day free trial • No credit card required
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as you grow. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)}>
              <XMarkIcon className="h-5 w-5 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.popular 
                    ? 'border-primary-200 bg-gradient-to-b from-primary-50/50 to-white' 
                    : 'border-gray-200'
                } ${currentPlan === plan.id ? 'ring-2 ring-primary-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {currentPlan === plan.id && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <CardDescription className="mt-4">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, i) => (
                      <li key={`limit-${i}`} className="flex items-start opacity-60">
                        <XMarkIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-500 text-sm line-through">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto">
                    <Button 
                      variant={plan.ctaVariant}
                      className="w-full"
                      onClick={() => handleCheckout(plan.tier)}
                      disabled={loading === plan.tier || currentPlan === plan.id}
                    >
                      {loading === plan.tier ? (
                        'Loading...'
                      ) : currentPlan === plan.id ? (
                        'Current Plan'
                      ) : (
                        <>
                          {plan.cta}
                          {plan.tier && <ArrowRightIcon className="ml-2 h-4 w-4" />}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can cancel your subscription at any time from your dashboard. 
                You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens after my free trial?
              </h3>
              <p className="text-gray-600">
                After your 7-day free trial, you'll be charged the monthly subscription fee. 
                You can cancel before the trial ends to avoid any charges.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I qualify for the student discount?
              </h3>
              <p className="text-gray-600">
                You'll need to verify your student status with a valid .edu email address 
                or student ID. The discount applies as long as you're enrolled.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I switch plans later?
              </h3>
              <p className="text-gray-600">
                Absolutely! You can upgrade or downgrade your plan at any time from your 
                account settings. Changes take effect at your next billing cycle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}