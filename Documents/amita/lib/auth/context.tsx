'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@/lib/supabase/client'
import type { Profile } from '@/types'
import { directInsert, directUpsert } from '@/lib/supabase/direct-api'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error?: any }>
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: any }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error?: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialized, setInitialized] = useState(false)
  
  // Create client instance only once using useMemo
  const supabase = React.useMemo(() => createClient(), [])

  // Direct profile fetch without using hanging supabase.auth.getSession()
  const fetchProfileDirect = React.useCallback(async (userId: string, accessToken?: string) => {
    try {
      console.log('🔍 Fetching profile for user:', userId)
      
      if (!accessToken) {
        console.error('❌ No access token provided for profile fetch')
        setProfile(null)
        return
      }
      
      console.log('🌐 Making authenticated direct REST API call...')
      
      const directUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`
      
      const directResponse = await fetch(directUrl, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`, // Use provided access token for RLS
          'Content-Type': 'application/json'
        }
      })
      
      console.log('📡 Direct fetch response status:', directResponse.status)
      
      if (!directResponse.ok) {
        console.error('❌ Direct fetch failed with status:', directResponse.status)
        const errorText = await directResponse.text()
        console.error('❌ Error response:', errorText)
        setProfile(null)
        return
      }
      
      const directData = await directResponse.json()
      console.log('📊 Profile data received:', !!directData[0])
      
      if (directData.length > 0) {
        setProfile(directData[0])
        console.log('✅ Profile set successfully for:', directData[0].full_name)
      } else {
        console.log('📝 No profile found for user')
        setProfile(null)
      }
    } catch (error) {
      console.error('💥 Network/connection error fetching profile:', error)
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    if (initialized) {
      console.log('⚠️ AuthProvider already initialized, skipping...')
      return // Prevent multiple initializations
    }
    
    console.log('🚀 AuthProvider initializing...')
    setInitialized(true)
    
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          setLoading(false)
          return
        }
        
        console.log('Initial session found:', !!initialSession)
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user) {
          console.log('Initial session user found, fetching profile...')
          await fetchProfileDirect(initialSession.user.id, initialSession.access_token)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    console.log('Setting up auth state change listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, session?.user?.id, 'Session exists:', !!session)
        
        // Batch state updates to prevent multiple re-renders
        setSession(session)
        setUser(session?.user ?? null)
        console.log('📝 Updated user state to:', session?.user?.email || 'null')
        
        if (session?.user) {
          console.log('👤 User found, fetching profile...')
          await fetchProfileDirect(session.user.id, session.access_token)
        } else {
          console.log('❌ No user, clearing profile')
          setProfile(null)
        }
        
        console.log('✅ Setting loading to false')
        setLoading(false)
      }
    )

    return () => {
      console.log('Cleaning up auth subscription...')
      subscription.unsubscribe()
    }
  }, [initialized, supabase, fetchProfileDirect])

  const signUp = async (email: string, password: string) => {
    try {
      console.log('Attempting sign up for:', email)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback`
        }
      })

      if (error) {
        console.log('Sign up error:', error)
        return { error }
      }

      // Only create profile if user was created and confirmed
      if (data.user && data.user.email_confirmed_at) {
        console.log('Creating profile for new user:', data.user.id)
        
        // Wait a bit to ensure auth context is established
        await new Promise(resolve => setTimeout(resolve, 200))
        
        try {
          await directInsert('profiles', {
            id: data.user.id,
            full_name: null
          }, { accessToken: data.session?.access_token })
          console.log('Profile created successfully via direct API')
        } catch (profileError: any) {
          // Ignore duplicate key errors (user already exists)
          if (!profileError.message?.includes('duplicate key value')) {
            console.error('Error creating profile:', profileError)
          }
        }
      }

      console.log('Sign up result:', { data: !!data.user, error })
      return { error: null }
    } catch (error) {
      console.error('Sign up catch error:', error)
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('Sign in result:', { data: !!data.user, error })
      
      if (!error && data.user) {
        console.log('🚀 Sign in successful, manually updating state...')
        // Manually trigger state update if auth state change doesn't fire
        setUser(data.user)
        setSession(data.session)
        console.log('👤 User set to:', data.user.email)
        
        // Fetch real profile with direct API and current session
        console.log('📋 Attempting to fetch real profile...')
        await fetchProfileDirect(data.user.id, data.session?.access_token)
        console.log('📝 Profile fetch completed')
        
        setLoading(false)
        console.log('✅ Loading set to false - auth state fully updated!')
      }
      
      return { error }
    } catch (error) {
      console.error('Sign in catch error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !session) return { error: new Error('No user logged in or no session') }

    try {
      console.log('Updating profile for user:', user.id, 'with updates:', updates)
      
      await directUpsert('profiles', {
        id: user.id,
        ...updates
      }, { accessToken: session.access_token })

      console.log('Profile updated successfully via direct API, refetching...')
      // Refetch the profile to get the complete updated data
      await fetchProfileDirect(user.id, session.access_token)
      return { error: null }
    } catch (error: any) {
      console.error('Error updating profile via direct API:', error)
      return { error }
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile: () => user && session ? fetchProfileDirect(user.id, session.access_token) : Promise.resolve(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}