'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import { VoiceProfileProvider } from '@/lib/context/VoiceProfileContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    console.log('Dashboard Layout Effect - Loading:', loading, 'User:', !!user, 'Profile:', !!profile, 'Pathname:', pathname, 'HasRedirected:', hasRedirected)
    
    if (!loading && !hasRedirected) {
      if (!user) {
        console.log('No user, redirecting to login')
        setHasRedirected(true)
        router.push('/login')
        return
      }

      // IMMEDIATELY redirect to onboarding if not onboarded
      // Check this FIRST before anything else
      if ((!profile || !profile.onboarded) && pathname !== '/onboarding') {
        console.log('User needs onboarding, redirecting IMMEDIATELY...')
        setHasRedirected(true)
        // Use replace to prevent back button issues
        router.replace('/onboarding')
        return
      }

      // If user has completed onboarding but is on onboarding page, redirect to dashboard
      if (profile && profile.onboarded && pathname === '/onboarding') {
        console.log('User has completed onboarding, redirecting to dashboard')
        setHasRedirected(true)
        router.push('/dashboard')
        return
      }
    }
  }, [user, loading, profile, router, pathname, hasRedirected])

  // Reset redirect flag when pathname changes
  useEffect(() => {
    setHasRedirected(false)
  }, [pathname])

  // ALWAYS show loading state while we determine onboarding status
  // This prevents ANY dashboard glimpse
  if (loading || !user || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user needs onboarding, show loading while redirecting
  if (profile && !profile.onboarded && pathname !== '/onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Preparing your experience...</p>
        </div>
      </div>
    )
  }

  return (
    <VoiceProfileProvider>
      <div className="min-h-screen bg-neutral-50">
        {children}
      </div>
    </VoiceProfileProvider>
  )
}