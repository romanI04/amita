'use client'

import React, { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResendEmail = async () => {
    if (!email) return
    
    setResending(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })
      
      if (error) throw error
      
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    } catch (err) {
      console.error('Resend error:', err)
      setError(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <EnvelopeIcon className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a confirmation link to{email && (
                <span className="font-medium text-neutral-900 block mt-1">
                  {email}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Next steps:</p>
                  <ol className="list-decimal list-inside space-y-1 text-left">
                    <li>Open your email inbox</li>
                    <li>Click the confirmation link in the email from amita.ai</li>
                    <li>Return here to sign in to your account</li>
                  </ol>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            {resent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">Verification email resent successfully!</p>
              </div>
            )}
            
            <div className="pt-4 space-y-3">
              <Link href="/login">
                <Button className="w-full">
                  Continue to sign in
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResendEmail}
                loading={resending}
                disabled={resending || !email}
              >
                Resend verification email
              </Button>
            </div>
            
            <div className="text-sm text-neutral-500">
              <p>Didn't receive the email? Check your spam folder or</p>
              <Link 
                href="/signup" 
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                try signing up again
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="mt-8">
            <CardContent className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}