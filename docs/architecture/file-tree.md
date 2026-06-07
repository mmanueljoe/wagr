# Wagr Repository File Tree

This is the complete file structure for the Wagr monorepo.
Use this as the reference when creating new files.

```
wagr/
│
├── README.md
│
├── .github/
│   └── CONTRIBUTING.md
│
├── docs/
│   │
│   ├── specs/                              # Feature specification files
│   │   ├── jira-stories.md                # All epics and user stories
│   │   ├── feature-employer-auth.md       # [employer-register], [employer-login]
│   │   ├── feature-employee-management.md # [csv-employee-upload], [single-employee-add], [employee-deactivate], [funding-model-select]
│   │   ├── feature-wage-engine.md         # [earned-wage-calc], [max-advance-calc], [fee-calc]
│   │   ├── feature-ussd-flow.md           # [ussd-session-handler] through [ussd-pin-setup]
│   │   ├── feature-disbursements.md       # [moolre-disbursement], [float-funding], [payday-recovery]
│   │   ├── feature-dashboard.md           # [dashboard-home] through [dashboard-credit-flags]
│   │   ├── feature-notifications.md       # [sms-advance-status], [whatsapp-worker-payslip], [whatsapp-employer-summary]
│   │   ├── feature-ai.md                  # [payslip-gpt], [credit-scoring-gpt]
│   │   └── feature-landing-page.md        # [landing-structure] through [landing-social-proof]
│   │
│   ├── architecture/
│   │   ├── setup.md                       # Local development setup
│   │   ├── build-order.md                 # Sprint sequence and dependency map
│   │   ├── schema.sql                     # Database migration SQL
│   │   ├── rls-policies.sql               # Supabase row-level security policies
│   │   └── moolre-postman.json            # Postman collection for Moolre sandbox
│   │
│   └── brand/
│       └── design-system.md               # Colours, typography, component patterns
│
├── apps/
│   │
│   ├── web/                               # Next.js 15 application
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs             # Loads @tailwindcss/postcss for v4
│   │   ├── tsconfig.json
│   │   ├── .env.local                     # Not committed
│   │   │
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx             # Root layout with fonts and providers
│   │       │   ├── globals.css            # Tailwind v4 @theme tokens + shadcn overrides
│   │       │   │
│   │       │   ├── page.tsx               # Landing page (public)
│   │       │   │
│   │       │   ├── (auth)/                # Auth route group — no sidebar layout
│   │       │   │   ├── layout.tsx
│   │       │   │   ├── login/
│   │       │   │   │   └── page.tsx
│   │       │   │   └── register/
│   │       │   │       └── page.tsx
│   │       │   │
│   │       │   ├── dashboard/             # Protected route group — with sidebar
│   │       │   │   ├── layout.tsx         # Sidebar layout wrapper
│   │       │   │   ├── page.tsx           # Dashboard home — stat cards + recent activity
│   │       │   │   ├── employees/
│   │       │   │   │   ├── page.tsx       # Employee list table
│   │       │   │   │   └── [id]/
│   │       │   │   │       └── page.tsx   # Individual employee advance history
│   │       │   │   ├── advances/
│   │       │   │   │   └── page.tsx       # All advance requests with filters
│   │       │   │   ├── payroll/
│   │       │   │   │   └── page.tsx       # Payroll summary and processing
│   │       │   │   └── settings/
│   │       │   │       └── page.tsx       # Company settings, float funding
│   │       │   │
│   │       │   └── api/
│   │       │       └── auth/
│   │       │           └── [...nextauth]/
│   │       │               └── route.ts   # NextAuth handler
│   │       │
│   │       ├── components/
│   │       │   ├── ui/                    # shadcn/ui components (auto-generated)
│   │       │   │   ├── button.tsx
│   │       │   │   ├── card.tsx
│   │       │   │   ├── table.tsx
│   │       │   │   ├── badge.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   └── ...
│   │       │   │
│   │       │   ├── landing/               # Landing page section components
│   │       │   │   ├── nav.tsx
│   │       │   │   ├── hero-section.tsx
│   │       │   │   ├── problem-section.tsx
│   │       │   │   ├── how-it-works-section.tsx
│   │       │   │   ├── features-section.tsx
│   │       │   │   ├── social-proof-section.tsx
│   │       │   │   ├── cta-section.tsx
│   │       │   │   └── footer.tsx
│   │       │   │
│   │       │   ├── dashboard/             # Dashboard-specific components
│   │       │   │   ├── sidebar.tsx
│   │       │   │   ├── stat-card.tsx
│   │       │   │   ├── advance-table.tsx
│   │       │   │   ├── employee-table.tsx
│   │       │   │   ├── payroll-summary.tsx
│   │       │   │   ├── float-balance-card.tsx
│   │       │   │   └── credit-flag-badge.tsx
│   │       │   │
│   │       │   └── shared/                # Components used in both landing and dashboard
│   │       │       ├── wagr-logo.tsx
│   │       │       └── loading-spinner.tsx
│   │       │
│   │       ├── lib/
│   │       │   ├── auth.ts                # NextAuth configuration
│   │       │   ├── api-client.ts          # Typed fetch wrapper for API calls
│   │       │   └── utils.ts               # shadcn utils + shared helpers
│   │       │
│   │       ├── hooks/
│   │       │   ├── use-employer.ts        # Employer data fetching
│   │       │   ├── use-employees.ts       # Employee list fetching
│   │       │   └── use-advances.ts        # Advance request fetching
│   │       │
│   │       └── middleware.ts              # Route protection for /dashboard/*
│   │
│   └── api/                               # Express backend
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env                           # Not committed
│       │
│       └── src/
│           ├── index.ts                   # Express app entry point
│           │
│           ├── routes/
│           │   ├── auth.ts                # POST /auth/register, POST /auth/login
│           │   ├── employers.ts           # GET/PATCH /employers/:id
│           │   ├── employees.ts           # GET/POST/PATCH /employees
│           │   ├── advances.ts            # GET /advances, POST /advances/request
│           │   ├── payroll.ts             # POST /payroll/run
│           │   ├── webhooks.ts            # POST /webhooks/moolre (Collections callbacks)
│           │   └── ussd.ts                # POST /ussd (Moolre USSD callbacks)
│           │
│           ├── lib/
│           │   ├── supabase.ts            # Supabase client (service role)
│           │   ├── redis.ts               # Upstash Redis client
│           │   ├── moolre.ts              # Moolre API integration layer
│           │   ├── openai.ts              # OpenAI client
│           │   ├── wage-engine.ts         # Earned wage calculation logic
│           │   ├── wage-engine.test.ts    # Unit tests
│           │   ├── ussd-session.ts        # USSD session read/write helpers
│           │   ├── ussd-flow.ts           # USSD step handler logic
│           │   ├── ussd-flow.test.ts      # USSD flow unit tests
│           │   ├── payslip-generator.ts   # GPT-4o payslip generation
│           │   └── credit-scoring.ts      # Rule-based credit flag logic
│           │
│           ├── middleware/
│           │   ├── auth.ts                # JWT verification middleware
│           │   ├── validate.ts            # Request body validation (zod)
│           │   └── error-handler.ts       # Global error handler
│           │
│           └── types/
│               ├── employer.ts            # Employer type definitions
│               ├── employee.ts            # Employee type definitions
│               ├── advance.ts             # Advance request type definitions
│               └── moolre.ts              # Moolre API response types
```

---

## Naming Conventions

**Files:** kebab-case for all files. `wage-engine.ts` not `wageEngine.ts`

**Components:** PascalCase for component names, kebab-case for file names.
`StatCard` component lives in `stat-card.tsx`

**Routes:** REST convention. Plural nouns.
`/employees` not `/employee` or `/getEmployees`

**Database columns:** snake_case. `monthly_salary` not `monthlySalary`

**TypeScript types:** PascalCase. `AdvanceRequest` not `advance_request`

**Environment variables:** SCREAMING_SNAKE_CASE. `MOOLRE_API_KEY`

**Jira story references in commits:** `[ussd-session-handler]: add USSD session handler`

---

## What Goes Where

| If you are building... | It goes in... |
|---|---|
| A new page | apps/web/src/app/ |
| A reusable UI component | apps/web/src/components/ |
| A new API route | apps/api/src/routes/ |
| Business logic (no database calls) | apps/api/src/lib/ |
| A Moolre API call | apps/api/src/lib/moolre.ts |
| A database query | Inside the relevant route file or a dedicated db helper |
| A type definition | apps/api/src/types/ or apps/web/src/types/ |
| A spec for a new feature | docs/specs/ |
