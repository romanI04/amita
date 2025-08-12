'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVoiceProfile, useVoiceProfileSelectors } from '@/lib/context/VoiceProfileContext'
import { useProfileUpdates, useSampleEvents } from '@/lib/events/VoiceProfileEvents'
import { Button } from '@/components/ui/Button'
import { PlusIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'

interface RecentAnalysis {
  id: string;
  title: string;
  created_at: string;
  ai_confidence_score: number;
  authenticity_score: number;
}

export default function DashboardPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { state: voiceProfileState } = useVoiceProfile()
  const selectors = useVoiceProfileSelectors()
  
  const [showVoiceprintSuccess, setShowVoiceprintSuccess] = useState(false)
  const [profileUpdateNotification, setProfileUpdateNotification] = useState<string | null>(null)
  
  // Get data from shared state
  const recentAnalyses: RecentAnalysis[] = selectors.getRecentSamples().map(sample => ({
    id: sample.id,
    title: sample.title || 'Untitled Analysis',
    created_at: sample.created_at,
    ai_confidence_score: Number(sample.ai_confidence_score) || 0,
    authenticity_score: Number(sample.authenticity_score) || 0
  }))

  // Listen for profile updates to show real-time notifications
  useProfileUpdates((data) => {
    if (data.reason === 'add_sample') {
      setProfileUpdateNotification(`Profile strengthened (+${data.coverage.wordCount - voiceProfileState.coverage.wordCount} words). Suggestions updated.`)
      setTimeout(() => setProfileUpdateNotification(null), 5000)
    }
  })

  // Listen for sample events to show real-time feedback
  useSampleEvents((eventType, data) => {
    if (eventType === 'sample.analyzed') {
      setProfileUpdateNotification(`Sample analyzed. Integrity: ${Math.round(data.integrity)}, Risk: ${Math.round(data.risk)}%`)
      setTimeout(() => setProfileUpdateNotification(null), 4000)
    }
  })

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (!loading && user && (!profile || !profile.onboarded)) {
      console.log('User needs onboarding, redirecting...')
      router.push('/onboarding')
    }
  }, [loading, user, profile, router])

  // Check for voiceprint creation success
  useEffect(() => {
    if (searchParams.get('voiceprint_created') === 'true') {
      setShowVoiceprintSuccess(true)
      const timer = setTimeout(() => {
        setShowVoiceprintSuccess(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Data is now loaded via VoiceProfileProvider - no manual loading needed

  // Show loading while checking onboarding status
  if (loading || (user && (!profile || !profile.onboarded))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="flex-1">
        {/* Success Banner */}
        {showVoiceprintSuccess && (
          <div className="bg-primary-50 border-b border-primary-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-primary-800 font-medium">
                Your Voice Profile has been created successfully! Your writing analysis is now more personalized.
              </p>
              <button
                onClick={() => setShowVoiceprintSuccess(false)}
                className="text-primary-600 hover:text-primary-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Real-time Profile Update Notification */}
        {profileUpdateNotification && (
          <div className="bg-primary-50 border-b border-primary-200 px-6 py-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <p className="text-primary-800 font-medium">
                {profileUpdateNotification}
              </p>
              <button
                onClick={() => setProfileUpdateNotification(null)}
                className="text-primary-600 hover:text-primary-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-8 bg-gray-50 min-h-screen">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-600 text-lg">
              Ready to analyze your writing and preserve your authentic voice?
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Link href="/analyze">
              <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group border border-transparent hover:border-primary-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl group-hover:from-primary-100 group-hover:to-primary-200 transition-colors">
                    <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Analyze Text</h3>
                    <p className="text-sm text-gray-500 mt-1">{voiceProfileState.coverage.sampleCount}/25 this month</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/upload">
              <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group border border-transparent hover:border-primary-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-colors">
                    <PlusIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Upload Files</h3>
                    <p className="text-sm text-gray-500 mt-1">TXT, PDF, DOCX files</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/profile">
              <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group border border-transparent hover:border-primary-100">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl group-hover:from-purple-100 group-hover:to-purple-200 transition-colors">
                    <SparklesIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Voice Profile</h3>
                    <p className="text-sm text-gray-500 mt-1">View your writing traits</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
            </div>
            
            {voiceProfileState.isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your analyses...</p>
              </div>
            ) : recentAnalyses.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {recentAnalyses.map((analysis) => {
                  const createdAt = new Date(analysis.created_at)
                  const timeAgo = getTimeAgo(createdAt)
                  const aiRisk = analysis.ai_confidence_score || 0
                  const authenticity = analysis.authenticity_score || 0
                  
                  return (
                    <Link key={analysis.id} href={`/analyze?sample_id=${analysis.id}`}>
                      <div className="px-6 py-5 hover:bg-gray-50 cursor-pointer transition-colors group">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                              {analysis.title || 'Untitled Analysis'}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">{timeAgo}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="text-sm font-semibold text-gray-900">
                                {Math.round(authenticity)}% Authentic
                              </div>
                              <div className={`text-xs font-medium mt-1 ${
                                aiRisk < 20 ? 'text-primary-600' : 
                                aiRisk < 40 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {Math.round(aiRisk)}% AI Risk
                              </div>
                            </div>
                            <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                
                {recentAnalyses.length >= 5 && (
                  <div className="px-6 py-4 text-center border-t border-gray-100">
                    <Link href="/analyze" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center">
                      View all analyses
                      <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No analyses yet
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Start by analyzing your first piece of writing to build your voice profile and get insights.
                </p>
                <Link href="/analyze">
                  <Button className="bg-primary-500 text-white hover:bg-primary-600 flex items-center space-x-2">
                    <SparklesIcon className="w-4 h-4" />
                    <span>Analyze Your First Text</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}