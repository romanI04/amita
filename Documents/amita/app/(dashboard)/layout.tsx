'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

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

      // If user exists but no profile is found and not already on onboarding
      if (!profile && pathname !== '/onboarding') {
        console.log('No profile found, redirecting to onboarding')
        setHasRedirected(true)
        router.push('/onboarding')
        return
      }

      // If profile exists but user is on onboarding, redirect to dashboard
      if (profile && pathname === '/onboarding') {
        console.log('Profile exists and on onboarding page, redirecting to dashboard')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {children}
    </div>
  )
}