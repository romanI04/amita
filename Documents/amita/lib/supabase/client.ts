import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient, User, Session } from '@supabase/supabase-js'

export type { User, Session }

let supabaseInstance: SupabaseClient | null = null

export const createClient = (): SupabaseClient => {
  // Return existing instance if it exists
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new instance with basic supabase-js client instead of SSR
  supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-my-custom-header': 'client-debug'
        }
      }
    }
  )

  console.log('Created singleton Supabase client (basic supabase-js)')
  return supabaseInstance
}