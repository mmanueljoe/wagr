import { createClient } from '@supabase/supabase-js'
import type { Database } from '@wagr/types/supabase'
import { env } from './env'

// Service-role client — bypasses RLS. Use this for all api → Supabase calls.
// Never expose this client (or its key) to the web.
export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
