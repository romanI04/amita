'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth/context'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { validateEmail, validatePassword } from '@/lib/utils'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ 
    email?: string
    password?: string
    confirmPassword?: string
    general?: string 
  }>({})
  
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    // Validation
    const newErrors: { 
      email?: string
      password?: string
      confirmPassword?: string
    } = {}
    
    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else {
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0]
      }
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await signUp(email, password)
      
      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({ general: 'An account with this email already exists. Try signing in instead.' })
        } else if (error.message.includes('Password should be at least 6 characters')) {
          setErrors({ password: 'Password must be at least 6 characters long' })
        } else {
          setErrors({ general: error.message })
        }
      } else {
        // Show success message and redirect to check email
        router.push('/verify-email?email=' + encodeURIComponent(email))
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
            Create your account
          </h1>
          <p className="mt-2 text-neutral-600">
            Join thousands preserving their authentic writing voice
          </p>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Start your journey</CardTitle>
            <CardDescription>
              Create your account to begin analyzing and preserving your unique writing style
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-600">{errors.general}</p>
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
                placeholder="Create a strong password"
                disabled={loading}
                autoComplete="new-password"
                helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              />
              
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                disabled={loading}
                autoComplete="new-password"
              />
              
              <Button 
                type="submit" 
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              
              <p className="text-xs text-neutral-500 text-center">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </p>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-neutral-500">Already have an account?</span>
                </div>
              </div>
              
              <div className="mt-6">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Sign in instead
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