import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Debug cookies
    const cookieHeader = request.headers.get('cookie')
    const authCookies = cookieHeader ? cookieHeader.split(';').filter(c => 
      c.includes('sb-') || c.includes('supabase')
    ) : []
    
    // Get session
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    return NextResponse.json({
      hasCookies: !!cookieHeader,
      authCookiesCount: authCookies.length,
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      sessionError: sessionError?.message || null,
      userError: userError?.message || null,
      accessTokenPresent: !!session?.access_token
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}