import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { 
  ArrowRightIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  ChartBarIcon,
  DocumentMagnifyingGlassIcon,
  PencilSquareIcon,
  CheckIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Navigation */}
      <nav className="relative z-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-gray-900">
                amita.ai
              </h1>
              <div className="hidden md:flex space-x-6">
                <Link href="#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Features
                </Link>
                <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  How It Works
                </Link>
                <Link href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Pricing
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-primary-500 hover:bg-primary-600">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Try today badge */}
      <div className="relative z-10 flex justify-center mt-12">
        <div className="inline-flex items-center px-3 py-1 bg-primary-50 text-primary-600 text-sm font-medium rounded-full">
          <SparklesIcon className="h-4 w-4 mr-1" />
          Try today!
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 px-4 pt-8 pb-20 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Preserve Your Authentic Voice
            <br />
            <span className="text-primary-500">While Using AI</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            The only AI tool designed to strengthen your unique writing style. 
            Detect AI patterns, maintain authenticity, and become a more confident writer.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Start Writing Better
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="relative z-10 py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">95%</div>
              <div className="text-sm text-gray-600 mt-1">AI Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">10k+</div>
              <div className="text-sm text-gray-600 mt-1">Writers Protected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">Real-time</div>
              <div className="text-sm text-gray-600 mt-1">Voice Analysis</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600 mt-1">Privacy Focused</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">
              Protect Your Voice
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">
              Master Your Writing Identity
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Leverage AI-powered insights to understand and preserve your unique writing style 
              while avoiding detection patterns.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 rounded-xl inline-flex mb-4">
                <DocumentMagnifyingGlassIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                AI Detection Analysis
              </h3>
              <p className="text-gray-600 mb-4">
                Instantly identify AI-generated patterns in your writing. Understand exactly 
                which sections might trigger detection and why.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl inline-flex mb-4">
                <PencilSquareIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Voice Fingerprinting
              </h3>
              <p className="text-gray-600 mb-4">
                Create a unique profile of your writing style. Track vocabulary, tone, 
                and patterns that make your writing distinctly yours.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-3 rounded-xl inline-flex mb-4">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Progress Tracking
              </h3>
              <p className="text-gray-600 mb-4">
                Monitor your authenticity score over time. See how your writing evolves 
                and maintains its human touch.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-3 rounded-xl inline-flex mb-4">
                <LightBulbIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Smart Suggestions
              </h3>
              <p className="text-gray-600 mb-4">
                Get personalized tips to enhance your natural writing style without 
                triggering AI detection systems.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-3 rounded-xl inline-flex mb-4">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Privacy First
              </h3>
              <p className="text-gray-600 mb-4">
                Your content is analyzed locally whenever possible. We never store 
                or share your personal writing.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-3 rounded-xl inline-flex mb-4">
                <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Continuous Learning
              </h3>
              <p className="text-gray-600 mb-4">
                Our AI adapts to the latest detection models, ensuring you stay ahead 
                of evolving AI detection systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">
              Simple Process
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">
              Three Steps to Authentic Writing
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-8 mb-4">
                <div className="bg-primary-100 text-primary-600 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Upload Your Text
                </h3>
                <p className="text-gray-600">
                  Paste or upload any text you've written with or without AI assistance.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-8 mb-4">
                <div className="bg-primary-100 text-primary-600 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Get Instant Analysis
                </h3>
                <p className="text-gray-600">
                  Receive detailed insights about AI patterns and your authenticity score.
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white rounded-2xl shadow-soft p-8 mb-4">
                <div className="bg-primary-100 text-primary-600 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Improve & Track
                </h3>
                <p className="text-gray-600">
                  Apply suggestions and watch your authenticity score improve over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-primary-500 font-semibold text-sm uppercase tracking-wider">
              Pricing
            </span>
            <h2 className="text-4xl font-bold text-gray-900 mt-3 mb-4">
              Choose Your Plan
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Start free and upgrade as you grow. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="relative border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-4">
                  Perfect for trying out amita.ai
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">5 analyses per month</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Basic AI detection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Voice fingerprint creation</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary-200 bg-gradient-to-b from-primary-50/50 to-white">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-4">
                  For serious writers and professionals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Unlimited analyses</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Advanced AI detection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Real-time suggestions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Progress tracking</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Export reports</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Team Plan */}
            <Card className="relative border-gray-200">
              <CardHeader>
                <CardTitle className="text-2xl">Team</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <CardDescription className="mt-4">
                  For teams and organizations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Everything in Pro</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">5 team members</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Team analytics</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Priority support</span>
                  </li>
                  <li className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary-500 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">Custom integrations</span>
                  </li>
                </ul>
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 bg-gradient-to-r from-primary-500 to-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Write with Confidence?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of writers who trust amita.ai to preserve their authentic voice 
            while leveraging AI tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
                Start Free Trial
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">amita.ai</h3>
              <p className="text-gray-600 text-sm">
                Preserve your authentic writing voice in the age of AI.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-600 hover:text-gray-900 text-sm">Features</Link></li>
                <li><Link href="#pricing" className="text-gray-600 hover:text-gray-900 text-sm">Pricing</Link></li>
                <li><Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-gray-900 text-sm">About</Link></li>
                <li><Link href="/blog" className="text-gray-600 hover:text-gray-900 text-sm">Blog</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-gray-900 text-sm">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900 text-sm">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-gray-600 hover:text-gray-900 text-sm">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center">
            <p className="text-gray-600 text-sm">
              © 2025 amita.ai. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}