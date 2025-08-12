import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { directInsert } from '@/lib/supabase/direct-api'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  if (!code) {
    console.log('No auth code provided, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    console.log('Processing email confirmation callback with code:', code.slice(0, 10) + '...')
    
    const supabase = await createClient()
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
    }

    if (!data.user) {
      console.error('No user returned from code exchange')
      return NextResponse.redirect(new URL('/login?error=no_user', request.url))
    }

    console.log('Email confirmed successfully for user:', data.user.email)

    // Check if user has a profile
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name, onboarded')
      .eq('id', data.user.id)
      .single()

    if (!existingProfile) {
      // Create profile for new confirmed user
      try {
        console.log('Creating profile for confirmed user:', data.user.id)
        
        await directInsert('profiles', {
          id: data.user.id,
          full_name: null,
          onboarded: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { accessToken: data.session?.access_token })
        
        console.log('Profile created successfully for confirmed user')
        
        // Redirect to onboarding for new users
        return NextResponse.redirect(new URL('/onboarding', request.url))
        
      } catch (profileError: any) {
        console.error('Error creating profile after confirmation:', profileError)
        // Continue to onboarding even if profile creation fails
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    } else {
      // Existing user - check onboarding status
      if (existingProfile.onboarded && existingProfile.full_name) {
        // Completed user, go to dashboard
        return NextResponse.redirect(new URL(next, request.url))
      } else {
        // User exists but hasn't completed onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }
}