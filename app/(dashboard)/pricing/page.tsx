'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { CheckIcon, XMarkIcon, SparklesIcon, AcademicCapIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

interface PricingPlan {
  id: string
  name: string
  slug: string
  type: string
  price_monthly: number
  price_yearly: number
  features: string[]
  limits: {
    analyses_per_month: number
    voice_samples: number
    team_members?: number
  }
  popular?: boolean
  discount?: string
}

const plans: PricingPlan[] = [
  {
    id: '1',
    name: 'Free',
    slug: 'free',
    type: 'individual',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      '5 analyses per month',
      'Basic voice profile',
      'Export to TXT',
      'Email support'
    ],
    limits: {
      analyses_per_month: 5,
      voice_samples: 3
    }
  },
  {
    id: '2',
    name: 'Pro',
    slug: 'pro',
    type: 'individual',
    price_monthly: 9.99,
    price_yearly: 99.99,
    popular: true,
    features: [
      'Unlimited analyses',
      'Advanced voice profile',
      'All export formats',
      'Priority support',
      'API access',
      'Custom presets'
    ],
    limits: {
      analyses_per_month: -1,
      voice_samples: -1
    }
  },
  {
    id: '3',
    name: 'Student',
    slug: 'student',
    type: 'student',
    price_monthly: 4.99,
    price_yearly: 49.99,
    discount: '50% OFF',
    features: [
      'Unlimited analyses',
      'Advanced voice profile',
      'All export formats',
      'Academic tools',
      'Citation checker',
      'Plagiarism detection'
    ],
    limits: {
      analyses_per_month: -1,
      voice_samples: -1
    }
  }
]

const teamPlans: PricingPlan[] = [
  {
    id: '4',
    name: 'Team Starter',
    slug: 'team-starter',
    type: 'team',
    price_monthly: 49.99,
    price_yearly: 499.99,
    features: [
      'Up to 5 team members',
      'Shared voice profiles',
      'Team analytics',
      'Style guide',
      'Admin dashboard',
      'Priority support'
    ],
    limits: {
      analyses_per_month: -1,
      team_members: 5,
      voice_samples: -1
    }
  },
  {
    id: '5',
    name: 'Team Pro',
    slug: 'team-pro',
    type: 'team',
    price_monthly: 149.99,
    price_yearly: 1499.99,
    popular: true,
    features: [
      'Unlimited team members',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'SSO/SAML',
      'Dedicated support',
      'Training sessions'
    ],
    limits: {
      analyses_per_month: -1,
      team_members: -1,
      voice_samples: -1
    }
  },
  {
    id: '6',
    name: 'Enterprise',
    slug: 'enterprise',
    type: 'team',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      'Custom pricing',
      'Unlimited everything',
      'On-premise deployment',
      'Custom AI models',
      'SLA guarantee',
      'Dedicated account manager',
      'Custom training'
    ],
    limits: {
      analyses_per_month: -1,
      team_members: -1,
      voice_samples: -1
    }
  }
]

export default function PricingPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showStudentVerification, setShowStudentVerification] = useState(false)

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      router.push('/signup')
      return
    }

    if (plan.slug === 'free') {
      // Free plan, just update user subscription
      setSelectedPlan(plan.id)
      // TODO: Update user subscription to free
      return
    }

    if (plan.type === 'student') {
      setShowStudentVerification(true)
      return
    }

    if (plan.slug === 'enterprise') {
      // Redirect to contact form
      router.push('/contact?plan=enterprise')
      return
    }

    // For paid plans, redirect to checkout
    setLoading(true)
    setSelectedPlan(plan.id)
    
    // TODO: Integrate with payment processor
    console.log('Redirecting to checkout for plan:', plan.slug)
    
    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }

  const getPrice = (plan: PricingPlan) => {
    if (plan.slug === 'enterprise') return 'Custom'
    const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly / 12
    return price === 0 ? 'Free' : `$${price.toFixed(2)}`
  }

  const getSavings = (plan: PricingPlan) => {
    if (billingCycle !== 'yearly' || plan.price_monthly === 0) return null
    const yearlySavings = (plan.price_monthly * 12) - plan.price_yearly
    if (yearlySavings <= 0) return null
    return `Save $${yearlySavings.toFixed(0)}/year`
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <div className="text-center py-12 px-4">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with our free plan or unlock advanced features to preserve your authentic writing voice
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-green-600 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1 text-green-600 font-semibold">Save 17%</span>
            </span>
          </div>
        </div>

        {/* Individual Plans */}
        <div className="max-w-7xl mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Individual Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                  plan.popular ? 'ring-2 ring-green-600' : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}
                
                {plan.discount && (
                  <div className="absolute -top-4 right-4">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      {plan.discount}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  {plan.type === 'student' && (
                    <AcademicCapIcon className="h-8 w-8 text-purple-600 mb-2" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{getPrice(plan)}</span>
                    {plan.price_monthly > 0 && (
                      <span className="text-gray-500 ml-2">
                        /{billingCycle === 'monthly' ? 'month' : 'month'}
                      </span>
                    )}
                  </div>
                  {getSavings(plan) && (
                    <p className="text-sm text-green-600 mt-1">{getSavings(plan)}</p>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan)}
                  loading={loading && selectedPlan === plan.id}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  {plan.price_monthly === 0 ? 'Current Plan' : 'Get Started'}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Plans */}
        <div className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8">
              <UserGroupIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Team Plans</h2>
              <p className="text-gray-600 mt-2">Collaborate with your team and maintain consistent voice</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {teamPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg p-8 ${
                    plan.popular ? 'ring-2 ring-green-600' : 'border border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Recommended
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900">{getPrice(plan)}</span>
                      {plan.price_monthly > 0 && (
                        <span className="text-gray-500 ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'month'}
                        </span>
                      )}
                    </div>
                    {getSavings(plan) && (
                      <p className="text-sm text-green-600 mt-1">{getSavings(plan)}</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckIcon className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    loading={loading && selectedPlan === plan.id}
                    className={`w-full ${
                      plan.slug === 'enterprise'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : plan.popular
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                    }`}
                  >
                    {plan.slug === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How do I qualify for student pricing?</h3>
              <p className="text-gray-600">You'll need to verify your student status with a valid .edu email address or student ID.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600">We accept all major credit cards, PayPal, and bank transfers for enterprise plans.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a refund policy?</h3>
              <p className="text-gray-600">Yes, we offer a 30-day money-back guarantee on all paid plans.</p>
            </div>
          </div>
        </div>

        {/* Student Verification Modal */}
        {showStudentVerification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <AcademicCapIcon className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 text-center mb-4">
                Verify Student Status
              </h3>
              <p className="text-gray-600 text-center mb-6">
                To access student pricing, please verify your student status with your .edu email address.
              </p>
              <input
                type="email"
                placeholder="your-email@university.edu"
                className="w-full px-4 py-2 border rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowStudentVerification(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement student verification
                    setShowStudentVerification(false)
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Verify
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}