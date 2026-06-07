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
- An OpenAI account with API access (platform.openai.com)
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
MOOLRE_API_VASKEY=your-vas-key        # Used for SMS and WhatsApp
MOOLRE_ACCOUNT_NUMBER=your-moolre-account-number
MOOLRE_WEBHOOK_SECRET=your-account-secret  # Verifies webhook authenticity

# OpenAI
OPENAI_API_KEY=your-openai-key

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

1. Go to supabase.com and create a new project
2. Name it: wagr-dev
3. Copy the Project URL and keys from Settings → API into your .env files
4. Go to the SQL Editor and run the migration file:

```bash
# From the project root
cat docs/architecture/schema.sql | pbcopy
# Paste into Supabase SQL Editor and run
```

5. Enable Row Level Security on these tables: employers, employees, advance_requests
6. Add the RLS policies from docs/architecture/rls-policies.sql

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
