// Loaded by vitest before any test module via vitest.config.ts.
// env.ts boots from process.env at import time, so any test that pulls in a
// module that touches env (logger, supabase, moolre, etc.) needs these set
// or boot fails with "Invalid environment variables". These are fake values
// for unit tests — the real ones come from .env in dev and the platform's
// secret store in prod.

process.env.NODE_ENV ??= 'test'
process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
process.env.SUPABASE_SERVICE_KEY ??= 'test-service-key'
process.env.UPSTASH_REDIS_URL ??= 'http://localhost:8079'
process.env.UPSTASH_REDIS_TOKEN ??= 'test-redis-token'
process.env.MOOLRE_BASE_URL ??= 'https://sandbox.moolre.com'
process.env.MOOLRE_API_USER ??= 'test-user'
process.env.MOOLRE_API_KEY ??= 'test-key'
process.env.MOOLRE_API_PUBKEY ??= 'test-pubkey'
process.env.MOOLRE_SMS_VASKEY ??= 'test-sms-vaskey'
process.env.MOOLRE_WHATSAPP_VASKEY ??= 'test-whatsapp-vaskey'
process.env.MOOLRE_ACCOUNT_NUMBER ??= '0000000000'
process.env.MOOLRE_USSD_SECRET ??= 'test-secret'
process.env.OPENAI_API_KEY ??= 'test-openai-key'
