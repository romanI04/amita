'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

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
            
            <div className="pt-4">
              <Link href="/login">
                <Button className="w-full">
                  Continue to sign in
                </Button>
              </Link>
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