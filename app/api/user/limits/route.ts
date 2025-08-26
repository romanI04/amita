import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserLimits } from '@/lib/subscription/limits'
import { generateRequestId } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required', requestId },
        { status: 401 }
      )
    }
    
    // Get user's usage limits
    const limits = await getUserLimits(user.id)
    
    return NextResponse.json(limits)
    
  } catch (error) {
    console.error('Limits API error:', error, { requestId })
    return NextResponse.json(
      { error: 'Failed to fetch usage limits', requestId },
      { status: 500 }
    )
  }
}