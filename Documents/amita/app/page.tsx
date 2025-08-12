import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { FeatureCard } from '@/components/ui/FeatureCard'
import { Testimonial } from '@/components/ui/Testimonial'
import { FAQ } from '@/components/ui/FAQ'
import { 
  CheckIcon, 
  XMarkIcon, 
  ArrowRightIcon,
  PencilIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

export default function HomePage() {
  const faqItems = [
    {
      question: "How does amita.ai preserve my writing voice?",
      answer: "amita.ai analyzes your unique writing patterns, vocabulary, and style to create a personalized voice fingerprint. We then provide real-time feedback when your writing deviates from your authentic style, helping you maintain consistency."
    },
    {
      question: "Can I trust amita.ai to provide accurate AI detection?",
      answer: "Our AI detection uses advanced algorithms trained on the latest AI writing models. While no detection is 100% perfect, our system provides reliable confidence scores to help you understand potential AI detection risks."
    },
    {
      question: "Will this make me a better writer?",
      answer: "Yes! Unlike tools that do the writing for you, amita.ai teaches you to recognize and develop your own writing skills. You'll learn to identify your strengths and build on them naturally."
    },
    {
      question: "Do you store my writing content?",
      answer: "We only analyze your writing to provide insights and then securely delete the content. Your privacy is our priority, and we never share or store your personal writing long-term."
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Navigation */}
      <nav className="border-b border-neutral-200/50 bg-white/80 backdrop-blur-sm">
        <div className="container-width section-padding">
          <div className="flex items-center justify-between h-18">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold font-heading text-neutral-900">
                amita.ai
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-padding py-24 lg:py-32">
        <div className="container-tight text-center">
          <div className="animate-fade-in-up">
            <h1 className="hero-title mb-8 text-balance">
              Preserve your authentic voice in the age of AI
            </h1>
            <p className="text-xl md:text-2xl text-muted mb-12 text-balance leading-relaxed">
              The only AI tool designed to make you a better human writer—not replace you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link href="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Start analyzing your voice
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="arrow" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-sm text-muted">
              <div>
                <div className="text-2xl font-bold text-neutral-900 mb-1">10,000+</div>
                <div>Writers helped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 mb-1">95%</div>
                <div>Accuracy rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 mb-1">24/7</div>
                <div>Voice analysis</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-neutral-900 mb-1">100%</div>
                <div>Privacy focused</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section-padding py-24 bg-white">
        <div className="container-width">
          <div className="text-center mb-20">
            <div className="section-tag justify-center">
              Features
            </div>
            <h2 className="section-title mb-6">
              Everything you need to preserve your authentic voice
            </h2>
            <p className="text-xl text-muted max-w-3xl mx-auto">
              Discover, analyze, and strengthen your unique writing style with powerful AI-powered tools.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            <FeatureCard
              icon={<DocumentTextIcon className="h-6 w-6" />}
              title="Voice Analysis"
              description="Upload your writing to discover your unique patterns, vocabulary, and style characteristics."
            />
            
            <FeatureCard
              icon={<ShieldCheckIcon className="h-6 w-6" />}
              title="AI Detection"
              description="Know exactly when your content might trigger AI detection tools with confidence scores."
            />
            
            <FeatureCard
              icon={<ChartBarIcon className="h-6 w-6" />}
              title="Writing Analytics"
              description="Track your authenticity score, voice consistency, and writing improvement over time."
            />
            
            <FeatureCard
              icon={<LightBulbIcon className="h-6 w-6" />}
              title="Smart Suggestions"
              description="Get personalized recommendations to strengthen your natural writing style."
            />
            
            <FeatureCard
              icon={<AcademicCapIcon className="h-6 w-6" />}
              title="Skill Building"
              description="Learn to recognize and develop your writing strengths through guided practice."
            />
            
            <FeatureCard
              icon={<PencilIcon className="h-6 w-6" />}
              title="Real-time Feedback"
              description="Instant analysis as you write to maintain your authentic voice across all content."
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding py-24 bg-gradient-soft">
        <div className="container-width">
          <div className="text-center mb-20">
            <div className="section-tag justify-center">
              Testimonials
            </div>
            <h2 className="section-title mb-6">
              What people are saying
            </h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
              Writers, students, and professionals who've preserved their authentic voice with amita.ai
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Testimonial
              quote="As a PhD student, amita.ai is my number one app for writing analysis. It helps me maintain my academic voice while ensuring my work passes originality checks."
              author={{
                name: "Sarah Chen",
                role: "PhD Student",
                company: "Stanford University"
              }}
            />
            
            <Testimonial
              quote="With amita.ai, I'm able to do in 30 mins what used to take 3 hours. There's nothing else like it for writers who want to stay authentic."
              author={{
                name: "Marcus Thompson",
                role: "Content Writer",
                company: "TechCorp"
              }}
            />
            
            <Testimonial
              quote="Using amita.ai feels like having a writing coach who knows exactly how to preserve my voice. It's made me a more confident writer."
              author={{
                name: "Elena Rodriguez",
                role: "Marketing Manager",
                company: "Creative Agency"
              }}
            />
            
            <Testimonial
              quote="I'm using amita.ai right now for all my client communications, and it's amazing! My writing sounds more professional but still feels like me."
              author={{
                name: "David Kim",
                role: "Freelance Consultant"
              }}
            />
            
            <Testimonial
              quote="amita.ai makes analyzing writing so much easier and quicker. A must-try tool for anyone serious about their writing quality."
              author={{
                name: "Jennifer Walsh",
                role: "Technical Writer",
                company: "Software Inc"
              }}
            />
            
            <Testimonial
              quote="I've tried a lot of AI writing apps, and amita.ai is so far ahead in helping writers maintain authenticity while improving quality."
              author={{
                name: "Alex Johnson",
                role: "Blogger & Author"
              }}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="section-padding py-24 bg-white">
        <div className="container-narrow">
          <div className="text-center mb-20">
            <div className="section-tag justify-center">
              FAQ
            </div>
            <h2 className="section-title mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-muted">
              Everything you need to know about preserving your authentic voice
            </p>
          </div>
          
          <FAQ items={faqItems} />
          
          <div className="text-center mt-16">
            <p className="text-muted mb-6">
              Ready to start preserving your authentic writing voice?
            </p>
            <Link href="/signup">
              <Button size="lg">
                Get started for free
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/50 bg-white">
        <div className="container-width section-padding py-16">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold text-neutral-900 mb-4">amita.ai</h3>
              <p className="text-muted mb-6 max-w-md">
                The only AI tool designed to preserve your authentic writing voice. 
                Build real skills while staying productive.
              </p>
              <Link href="/signup">
                <Button variant="outline" size="sm">
                  Get started free
                </Button>
              </Link>
            </div>
            
            <div>
              <h4 className="font-semibold text-neutral-900 mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted">
                <li><Link href="/features" className="hover:text-neutral-900 transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-neutral-900 transition-colors">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-neutral-900 transition-colors">Security</Link></li>
                <li><Link href="/changelog" className="hover:text-neutral-900 transition-colors">Changelog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-neutral-900 mb-4">Support</h4>
              <ul className="space-y-3 text-sm text-muted">
                <li><Link href="/help" className="hover:text-neutral-900 transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-neutral-900 transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-neutral-900 transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-neutral-900 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-neutral-200/50 text-sm text-subtle">
            <div>
              © {new Date().getFullYear()} amita.ai. All rights reserved.
            </div>
            <div className="mt-4 md:mt-0">
              Built with ❤️ for authentic writers everywhere
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}