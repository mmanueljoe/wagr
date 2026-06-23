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
    // VAS keys are issued per service in the Moolre dashboard, not per
    // account — one key per SMS service instance, one per WhatsApp service
    // instance. Both go in the same X-API-VASKEY header at request time,
    // just with different values depending on which API we're calling.
    MOOLRE_SMS_VASKEY: z.string().min(1),
    MOOLRE_WHATSAPP_VASKEY: z.string().min(1),
    MOOLRE_ACCOUNT_NUMBER: z.string().min(1),
    // Returned by Moolre when we POST /open/account/update with our callback
    // URL. Every webhook from Moolre includes this in the payload's `secret`
    // field — we verify on every incoming request.
    MOOLRE_WEBHOOK_SECRET: z.string().min(1),

    // Generative AI provider for the payslip closing line + credit-flag
    // reasoning. Currently Google's Gemini Flash because it has a generous
    // no-credit-card free tier; the call shape lives in lib/payslip-gpt.ts
    // and could swap to any other provider with a one-file change.
    GEMINI_API_KEY: z.string().min(1),

    WEB_URL: z.string().url().default('http://localhost:3000'),

    SENTRY_DSN: z.string().url().optional(),

    // Advance reconciler — periodically resolves advances that the initial
    // polling budget couldn't terminate. See lib/advance-reconciler.ts.
    // Defaults: run every 5 min, treat anything pending > 90s as stuck,
    // force-fail (refund float, SMS worker) after 24 hours.
    RECONCILER_INTERVAL_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5 * 60 * 1000),
    RECONCILER_STUCK_AFTER_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(90 * 1000),
    RECONCILER_FORCE_FAIL_AFTER_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(24 * 60 * 60 * 1000),

    // Float top-up reconciler — same shape as the advance reconciler but
    // for the money-IN side (employer pre-funding via Moolre Payments).
    // Webhooks should land within seconds, so STUCK_AFTER is tight (60s)
    // and FORCE_FAIL is short (1h). Past FORCE_FAIL we assume the webhook
    // is never coming and mark the top-up failed.
    FLOAT_TOPUP_RECONCILER_STUCK_AFTER_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 1000),
    FLOAT_TOPUP_RECONCILER_FORCE_FAIL_AFTER_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 1000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
