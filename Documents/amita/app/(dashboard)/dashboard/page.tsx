'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PlusIcon, DocumentTextIcon, SparklesIcon } from '@heroicons/react/24/outline'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
  const [showVoiceprintSuccess, setShowVoiceprintSuccess] = useState(false)
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])
  const [analysisCount, setAnalysisCount] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(true)

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

  // Load user's analyses data
  useEffect(() => {
    if (!user || loading) return

    const loadAnalysesData = async () => {
      try {
        const supabase = createClient()
        
        // Get recent analyses
        const { data: analyses, error: analysesError } = await supabase
          .from('writing_samples')
          .select('id, title, created_at, ai_confidence_score, authenticity_score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (analysesError) {
          console.error('Error loading analyses:', analysesError)
        } else {
          setRecentAnalyses(analyses || [])
        }

        // Get total count for this month
        const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
        const { count, error: countError } = await supabase
          .from('writing_samples')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id)
          .gte('created_at', `${currentMonth}-01`)
          .lt('created_at', `${currentMonth}-31`)

        if (countError) {
          console.error('Error loading count:', countError)
        } else {
          setAnalysisCount(count || 0)
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadAnalysesData()
  }, [user, loading])

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
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-green-800 font-medium">
                🎉 Your Voice Profile has been created successfully! Your writing analysis is now more personalized.
              </p>
              <button
                onClick={() => setShowVoiceprintSuccess(false)}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.full_name?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-600">
              Ready to analyze your writing and preserve your authentic voice?
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            <Link href="/analyze">
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Analyze Text</h3>
                    <p className="text-sm text-gray-500">{analysisCount}/25 this month</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-50 cursor-not-allowed">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-500">Voice Coaching</h3>
                  <p className="text-sm text-gray-400">Coming soon</p>
                </div>
              </div>
            </div>

            <Link href="/profile">
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Voice Profile</h3>
                    <p className="text-sm text-gray-500">View your writing traits</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            </div>
            
            {isLoadingData ? (
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
                      <div className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {analysis.title || 'Untitled Analysis'}
                            </h3>
                            <p className="text-sm text-gray-500">{timeAgo}</p>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="text-right">
                              <div className="text-gray-900 font-medium">
                                {Math.round(authenticity)}% Authentic
                              </div>
                              <div className={`text-xs ${
                                aiRisk < 20 ? 'text-green-600' : 
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
                  <div className="px-6 py-4 text-center border-t border-gray-200">
                    <Link href="/analyze" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View all analyses →
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
                  <Button className="bg-gray-900 text-white hover:bg-gray-800">
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Analyze Your First Text
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