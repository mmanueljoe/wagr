import { createClient } from '@supabase/supabase-js'
import type { Database } from '@wagr/types/supabase'
import { env } from './env'

// Service-role client — bypasses RLS. Use this for all api → Supabase data
// access. Never expose this client (or its key) to the web.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Anon-key client. Used only to verify a user's password at login via
// signInWithPassword. We discard the returned session immediately because
// our own Redis-backed session is the source of truth (BFF — see ADR 007).
// We can't do password verification with the service-role client.
export function createSupabaseAuthClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
