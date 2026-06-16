# Spec: Employer Authentication

**Epic:** WAGR-E2 Employer Onboarding
**Stories:** [employer-register], [employer-login]
**Sprint:** Week 2
**Status:** Not started

---

## Overview

Employers access Wagr through a web dashboard. Authentication is handled by NextAuth.js using email and password credentials. On registration, a Supabase Auth account is created alongside an employers table record. On login, a session is established that persists across page refreshes.

---

## User Stories

**[employer-register]** — As an employer, I want to register my company on Wagr so that I can set up my workforce on the platform.

**[employer-login]** — As an employer, I want to log in to my dashboard so that I can manage my employees and advances.

---

## Acceptance Criteria

### Registration
- [ ] Form collects: company_name, email, password, phone, industry, pay_date
- [ ] Supabase Auth creates the user account
- [ ] employers record created in the database on successful auth creation
- [ ] Employer is redirected to /dashboard/onboarding on success
- [ ] Duplicate email returns a clear error: "An account with this email already exists"
- [ ] All fields validated client-side before submission
- [ ] Password minimum 8 characters enforced

### Login
- [ ] Form accepts email and password
- [ ] NextAuth.js session created on success
- [ ] Invalid credentials return: "Incorrect email or password"
- [ ] Session persists across page refreshes
- [ ] Unauthenticated requests to /dashboard/* redirect to /login
- [ ] Remember me option extends session to 30 days

---

## Technical Notes

### Auth Setup

NextAuth.js is used as the session layer. Supabase Auth handles the credential store.

```typescript
// apps/api/src/lib/auth.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)
```

```typescript
// apps/web/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const { handlers, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Validate against Supabase Auth
        // Return employer record on success
      }
    })
  ]
})
```

### Database Interaction

On successful Supabase Auth registration, an employers record must be created immediately. This is done in the registration API route, not in a trigger, to keep the logic visible and debuggable.

```typescript
// After Supabase Auth signup succeeds:
await supabase.from('employers').insert({
  id: authUser.id,  // Same UUID as auth user
  company_name: formData.company_name,
  email: formData.email,
  phone: formData.phone,
  industry: formData.industry,
  pay_date: formData.pay_date,
  float_balance: 0,
})
```

### Route Protection

All /dashboard/* routes are protected via Next.js middleware.

```typescript
// apps/web/src/middleware.ts
import { auth } from '@/lib/auth'

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/dashboard')) {
    return Response.redirect(new URL('/login', req.url))
  }
})
```

---

## UI Notes

### Registration Page (/register)
- Clean centred card layout
- Wagr logo at top
- Form fields with shadcn/ui Input and Label components
- Industry field is a Select with options: Healthcare, Education, Retail, Hospitality, Manufacturing, Other
- Pay date field is a Select with options 1 through 31
- Submit button uses the Wagr primary colour (Deep Midnight Blue #0D1B40)
- Link to login page at the bottom

### Login Page (/login)
- Same centred card layout as registration
- Email and password fields only
- Forgot password link (out of scope for MVP — link is visible but non-functional)
- Link to registration page at the bottom

---

## Dependencies

- [db-schema] (database schema deployed) must be complete before this story can be tested end-to-end

---

## Files to Create

```
apps/web/src/app/(auth)/
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
└── layout.tsx

apps/web/src/app/api/auth/
└── [...nextauth]/
    └── route.ts

apps/web/src/middleware.ts
apps/api/src/routes/auth.ts
apps/api/src/lib/supabase.ts
```
