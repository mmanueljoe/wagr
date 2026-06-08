import { createBrowserClient } from '@supabase/ssr'
import { env } from './env'

// Browser-side Supabase client. Uses the anon key — safe to expose, the
// service-role key never leaves the api. This client talks to Supabase Auth
// only (signInWithPassword, getSession). All database reads/writes go
// through the Wagr api per CLAUDE.md.
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
