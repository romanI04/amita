'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { validateEmail } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})
  
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    // Validation
    const newErrors: { email?: string; password?: string } = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: 'Invalid email or password. Please check your credentials and try again.' })
        } else if (error.message.includes('Email not confirmed')) {
          setErrors({ general: 'Please check your email and click the confirmation link before signing in.' })
        } else {
          setErrors({ general: error.message })
        }
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold font-heading text-neutral-900">
            Welcome back
          </h1>
          <p className="mt-2 text-neutral-600">
            Sign in to continue preserving your authentic voice
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Enter your email and password to access your writing analysis dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-error-50 border border-error-200 rounded-2xl p-4">
                  <p className="text-sm text-error-700">{errors.general}</p>
                </div>
              )}
              
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
              
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link 
                    href="/forgot-password" 
                    className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">New to amita.ai?</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link href="/signup">
                  <Button variant="outline" className="w-full">
                    Create your account
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}