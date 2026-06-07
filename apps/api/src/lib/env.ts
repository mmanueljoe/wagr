import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3001),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_KEY: z.string().min(1),

    UPSTASH_REDIS_URL: z.string().url(),
    UPSTASH_REDIS_TOKEN: z.string().min(1),

    MOOLRE_BASE_URL: z.string().url(),
    MOOLRE_API_USER: z.string().min(1),
    MOOLRE_API_KEY: z.string().min(1),
    MOOLRE_API_PUBKEY: z.string().min(1),
    MOOLRE_API_VASKEY: z.string().min(1),
    MOOLRE_ACCOUNT_NUMBER: z.string().min(1),
    MOOLRE_USSD_SECRET: z.string().min(1),

    OPENAI_API_KEY: z.string().min(1),

    SENTRY_DSN: z.string().url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
