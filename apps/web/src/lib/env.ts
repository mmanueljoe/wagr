import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: z.string().url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
  // CI sets SKIP_ENV_VALIDATION=1 because the build step doesn't have access
  // to our public Supabase keys (and shouldn't — they belong in Vercel).
  // Dev and prod still validate; this only skips the check at `next build`
  // time inside the GitHub runner, where the keys aren't injected.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
