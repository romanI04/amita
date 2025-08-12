import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // If next parameter is provided, use it
      if (next) {
        return NextResponse.redirect(new URL(next, request.url))
      }
      
      // For new users, check if they have completed onboarding
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Check if user has a profile (indicates completed onboarding)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single()
        
        if (profile && profile.full_name) {
          // User has completed onboarding, go to dashboard
          return NextResponse.redirect(new URL('/dashboard', request.url))
        } else {
          // New user, redirect to onboarding
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
      
      // Fallback to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/login?error=auth_code_error', request.url))
}