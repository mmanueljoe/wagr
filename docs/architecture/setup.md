# Local Development Setup

This document covers everything needed to get the Wagr development environment running from scratch.
Follow these steps in order. Do not skip any step.

---

## Prerequisites

Install these before starting:

- Node.js 22 LTS (use nvm: `nvm install 22 && nvm use 22`)
- Git
- A Supabase account (free at supabase.com)
- An Upstash account (free at upstash.com)
- A Moolre sandbox account (register at docs.moolre.com)
- A Google AI Studio API key for Gemini (free at aistudio.google.com — no credit card)
- Postman or Bruno for API testing

---

## Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-username/wagr.git
cd wagr

# Install dependencies for both apps
cd apps/web && npm install
cd ../api && npm install
cd ../..
```

---

## Environment Variables

### apps/api/.env

```env
# Server
PORT=3001
NODE_ENV=development

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Upstash Redis
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-token

# Moolre (sandbox)
# Moolre uses different keys for different APIs — see docs/architecture/moolre-api-reference.md
MOOLRE_BASE_URL=https://sandbox.moolre.com
MOOLRE_API_USER=your-moolre-username
MOOLRE_API_KEY=your-private-key       # Used for Transfers, Account Status
MOOLRE_API_PUBKEY=your-public-key     # Used for Payments (Collections)
MOOLRE_SMS_VASKEY=your-sms-service-vas-key            # SMS service instance
MOOLRE_WHATSAPP_VASKEY=your-whatsapp-service-vas-key  # WhatsApp service instance
MOOLRE_ACCOUNT_NUMBER=your-moolre-account-number
MOOLRE_WEBHOOK_SECRET=your-account-secret  # Verifies webhook authenticity

# Generative AI (Gemini Flash — free tier, no card required)
GEMINI_API_KEY=your-gemini-api-key

# App
API_URL=http://localhost:3001
```

### apps/web/.env.local

```env
# Next.js
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000

# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Supabase (public keys only in web app)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Never commit .env files.** Both are in .gitignore.

---

## Supabase Setup

### One-time, per developer

1. Go to **supabase.com** and create a new project named `wagr-dev`.
2. From **Project Settings → API**, copy three values into your `apps/api/.env`:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (also into `apps/web/.env.local` as `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Link the repo to your cloud project. You'll be prompted for the project
   ref (the subdomain part of your project URL) and the database password
   you set when creating the project:
   ```bash
   pnpm db:link
   ```
   This writes a `supabase/.temp/` folder (gitignored) with link metadata.

### Applying migrations

Migration files live in `supabase/migrations/`. Each one is a `*.sql` file
with a timestamp prefix and is **immutable once merged to `main`** — to
change the schema, write a new migration.

```bash
# Apply all pending migrations to your linked cloud project
pnpm db:push

# Regenerate the typed Supabase client (run after every schema change)
pnpm db:types
```

`pnpm db:types` overwrites `packages/types/src/supabase.ts`. That file is
generated — don't edit it by hand.

### About Row-Level Security

RLS is enabled on `employers`, `employees`, `advance_requests`, `repayments`,
and `audit_log`. The api uses the service-role key, which bypasses RLS.
Policies exist so that a leaked anon key would still be safe (it can only
read the employer's own rows).

---

## Upstash Redis Setup

1. Go to upstash.com and create a free Redis database
2. Name it: wagr-dev
3. Copy the REST URL and token into your .env files
4. Test the connection:

```typescript
// Quick test — run with ts-node
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

await redis.set('test', 'wagr')
const value = await redis.get('test')
console.log(value)  // Should print: wagr
await redis.del('test')
```

---

## Moolre Sandbox Setup

1. Register at docs.moolre.com for sandbox access
2. Copy your sandbox API key into the .env file
3. Register a USSD code in the sandbox dashboard
4. Register your local webhook URL for USSD callbacks using ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local API to the internet
ngrok http 3001

# Copy the https URL from ngrok output
# Register it in Moolre sandbox as: https://your-url.ngrok.io/ussd
```

5. Test each API in Postman. The Postman collection is at docs/architecture/moolre-postman.json

---

## Running the Application

Open two terminal windows.

**Terminal 1 — API:**
```bash
cd apps/api
npm run dev
# API running on http://localhost:3001
# Test: curl http://localhost:3001/health
```

**Terminal 2 — Web:**
```bash
cd apps/web
npm run dev
# Web running on http://localhost:3000
```

---

## Running Tests

```bash
# Run wage engine unit tests
cd apps/api
npm test src/lib/wage-engine.test.ts

# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

---

## Git Workflow

We use GitHub Flow: one protected branch (`main`) and short-lived feature
branches off it. Full details live in
[.github/CONTRIBUTING.md](../../.github/CONTRIBUTING.md).

```bash
# Start a new feature, named after the slug
git checkout -b feature/ussd-session-handler-redis-ttl

# Commit using Conventional Commits with the slug as the scope
git commit -m "feat(ussd-session-handler): add Redis session with 120s TTL"

# Push and open a pull request to main
git push -u origin feature/ussd-session-handler-redis-ttl
```

- Branch naming: `feature/<slug>-<short-description>`
- Commit format: `<type>(<slug>): <subject>` (Conventional Commits)
- Merge to `main` is squash-only, via PR, after CI passes and the spec's
  acceptance criteria are checked off.

---

## Deployment

**Frontend (Vercel):**
1. Connect the repository to Vercel
2. Set the root directory to apps/web
3. Add all web environment variables in the Vercel dashboard
4. Every push to main deploys automatically

**Backend (Railway):**
1. Connect the repository to Railway
2. Set the root directory to apps/api
3. Add all API environment variables in the Railway dashboard
4. Every push to main deploys automatically

The production Moolre webhook URL will be the Railway deployment URL.
Update it in the Moolre dashboard when you switch from sandbox to production.
