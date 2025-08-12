'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Auto-redirect authenticated users away from auth pages
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="auth-layout flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  // Only show auth pages if user is not authenticated
  if (user) {
    return null // Will redirect, so don't show content
  }

  return (
    <div className="auth-layout">
      {children}
    </div>
  )
}