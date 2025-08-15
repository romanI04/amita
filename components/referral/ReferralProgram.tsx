'use client'

import React, { useState, useEffect } from 'react'
import { GiftIcon, ShareIcon, LinkIcon, UserGroupIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ReferralStats {
  has_code: boolean
  code?: string
  share_url?: string
  reward_type?: string
  reward_value?: number
  stats?: {
    total_referrals: number
    pending_referrals: number
    completed_referrals: number
    total_rewards_earned: number
  }
  recent_referrals?: Array<{
    id: string
    status: string
    signup_at: string
  }>
}

export function ReferralProgram() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchReferralStats()
  }, [])

  const fetchReferralStats = async () => {
    try {
      const response = await fetch('/api/referral/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching referral stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const createReferralCode = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/referral/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_type: 'free_month',
          reward_value: 1,
        })
      })
      
      if (response.ok) {
        await fetchReferralStats()
      }
    } catch (error) {
      console.error('Error creating referral code:', error)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = () => {
    if (stats?.share_url) {
      navigator.clipboard.writeText(stats.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareOnTwitter = () => {
    const text = `I'm using amita.ai to improve my writing authenticity! Use my referral code ${stats?.code} for a free month: `
    const url = stats?.share_url || ''
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  const shareOnLinkedIn = () => {
    const url = stats?.share_url || ''
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats?.has_code) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GiftIcon className="h-5 w-5 text-green-600" />
            Referral Program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <GiftIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Earn Free Months!</h3>
            <p className="text-gray-600 mb-6">
              Share amita.ai with friends and earn 1 free month for each friend who signs up.
              Your friends also get their first month free!
            </p>
            <Button
              onClick={createReferralCode}
              loading={creating}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShareIcon className="h-4 w-4 mr-2" />
              Get Your Referral Link
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="h-5 w-5 text-green-600" />
          Your Referral Program
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg">
          <h3 className="font-semibold mb-3">Your Referral Link</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={stats.share_url}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={shareOnTwitter}
              variant="outline"
              size="sm"
            >
              Share on Twitter
            </Button>
            <Button
              onClick={shareOnLinkedIn}
              variant="outline"
              size="sm"
            >
              Share on LinkedIn
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <UserGroupIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.stats?.total_referrals || 0}</div>
            <div className="text-sm text-gray-600">Total Referrals</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <ClockIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.stats?.pending_referrals || 0}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.stats?.completed_referrals || 0}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <GiftIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{stats.stats?.total_rewards_earned || 0}</div>
            <div className="text-sm text-gray-600">Months Earned</div>
          </div>
        </div>

        {/* Recent Referrals */}
        {stats.recent_referrals && stats.recent_referrals.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Recent Referrals</h3>
            <div className="space-y-2">
              {stats.recent_referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      referral.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm">
                      New signup on {new Date(referral.signup_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    referral.status === 'completed' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {referral.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rewards Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Share your unique referral link with friends</li>
            <li>• They get 1 free month when they sign up</li>
            <li>• You get 1 free month when they complete signup</li>
            <li>• No limit on referrals - earn unlimited free months!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}