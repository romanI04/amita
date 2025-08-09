'use client'

import React from 'react'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  UserCircleIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth()

  const mockStats = {
    voiceHealthScore: 85,
    aiDetectionRisk: 'low' as const,
    totalSamples: 0,
    improvementStreak: 0
  }

  const getRiskColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low':
        return 'text-success-700 bg-success-100'
      case 'medium':
        return 'text-warning-700 bg-warning-100'
      case 'high':
        return 'text-error-700 bg-error-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-neutral-200/50 sticky top-0 z-50">
        <div className="container-width section-padding">
          <div className="flex items-center justify-between h-18">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold font-heading text-neutral-900">
                amita.ai
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted">
                Welcome, {profile?.full_name || user?.email?.split('@')[0]}
              </span>
              <Button variant="ghost" onClick={signOut} size="sm">
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container-width section-padding py-12">
        {/* Welcome Section */}
        <div className="mb-12 animate-fade-in-up">
          <h1 className="section-title mb-4">
            Your Writing Dashboard
          </h1>
          <p className="text-xl text-muted">
            Track your authentic voice and improve your writing skills
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card hover className="animate-scale-in">
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary-100 rounded-2xl">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-secondary-700" />
                </div>
                <span className="text-3xl font-bold text-neutral-900">
                  {mockStats.voiceHealthScore}%
                </span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Voice Health</h3>
              <p className="text-sm text-muted">Your authenticity score</p>
            </CardContent>
          </Card>

          <Card hover className="animate-scale-in" style={{animationDelay: '0.1s'}}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-warning-100 rounded-2xl">
                  <ExclamationTriangleIcon className="h-6 w-6 text-warning-700" />
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full capitalize ${getRiskColor(mockStats.aiDetectionRisk)}`}>
                  {mockStats.aiDetectionRisk}
                </span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">AI Detection Risk</h3>
              <p className="text-sm text-muted">Detection likelihood</p>
            </CardContent>
          </Card>

          <Card hover className="animate-scale-in" style={{animationDelay: '0.2s'}}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-primary-100 rounded-2xl">
                  <DocumentTextIcon className="h-6 w-6 text-primary-700" />
                </div>
                <span className="text-3xl font-bold text-neutral-900">
                  {mockStats.totalSamples}
                </span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Samples Analyzed</h3>
              <p className="text-sm text-muted">Total writing samples</p>
            </CardContent>
          </Card>

          <Card hover className="animate-scale-in" style={{animationDelay: '0.3s'}}>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-success-100 rounded-2xl">
                  <ChartBarIcon className="h-6 w-6 text-success-700" />
                </div>
                <span className="text-3xl font-bold text-neutral-900">
                  {mockStats.improvementStreak}
                  <span className="text-lg text-muted ml-1">days</span>
                </span>
              </div>
              <h3 className="font-semibold text-neutral-900 mb-1">Improvement Streak</h3>
              <p className="text-sm text-muted">Consecutive days writing</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Quick Actions */}
          <Card hover className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Actions</CardTitle>
              <CardDescription>
                Start analyzing your writing to preserve your authentic voice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/analyze" className="block">
                <Button className="w-full justify-start h-14 text-base group">
                  <PlusIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Analyze New Text
                </Button>
              </Link>
              <Link href="/upload" className="block">
                <Button variant="secondary" className="w-full justify-start h-12 text-base group">
                  <DocumentTextIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                  Upload Document
                </Button>
              </Link>
              <Link href="/profile" className="block">
                <Button variant="secondary" className="w-full justify-start h-12 text-base group">
                  <UserCircleIcon className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                  View Voice Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card hover className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            <CardHeader>
              <CardTitle className="text-2xl">Getting Started</CardTitle>
              <CardDescription>
                Your journey to preserving authentic writing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-secondary-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Upload your first writing sample</h4>
                    <p className="text-muted">Let us analyze your unique writing style</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-neutral-500">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Review your voice profile</h4>
                    <p className="text-muted">Understand what makes your writing unique</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-neutral-500">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-900 mb-1">Start improving</h4>
                    <p className="text-muted">Get personalized coaching tips</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card hover className="animate-fade-in-up" style={{animationDelay: '0.4s'}}>
          <CardHeader>
            <CardTitle className="text-2xl">Recent Activity</CardTitle>
            <CardDescription>
              Your latest writing analysis and improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-16">
              <div className="mb-8">
                <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-10 w-10 text-neutral-400" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  No writing samples analyzed yet
                </h3>
                <p className="text-muted max-w-md mx-auto mb-8">
                  Upload your first writing sample to start building your authentic voice profile and get personalized insights.
                </p>
              </div>
              
              <Link href="/analyze">
                <Button size="lg" className="group">
                  Upload Your First Sample
                  <PlusIcon className="ml-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}