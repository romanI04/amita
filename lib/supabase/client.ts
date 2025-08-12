import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'

export type { User, Session }

let supabaseInstance: SupabaseClient | null = null

export const createClient = (): SupabaseClient => {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new instance with SSR browser client for proper cookie handling
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('Created singleton Supabase client (SSR browser client with cookie support)')
  return supabaseInstance
}