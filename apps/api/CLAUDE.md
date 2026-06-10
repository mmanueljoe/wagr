# Working in apps/api

Read [the root CLAUDE.md](../../CLAUDE.md) first. This file is the api-specific addendum.

## Stack

- Node.js 22 LTS, Express 5, TypeScript 5 strict
- Run with `tsx` in both dev and production (no compile step yet — that lands
  when the api gets a real bundler)
- pino structured JSON logging (pretty-printed in dev only)
- Zod schemas for env validation and route input validation
- `@t3-oss/env-core` wraps Zod to validate `process.env` at boot — the app
  refuses to start if a required var is missing

## Layout

```
apps/api/src/
├── index.ts                  # App entry — wires middleware + routes + listen
├── errors/
│   └── app-error.ts          # AppError class — the only error type we throw
├── lib/
│   ├── env.ts                # Zod-validated env (the only place that reads process.env)
│   ├── logger.ts             # pino logger
│   ├── audit.ts              # audit_log writer (per ADR 010)
│   ├── session.ts            # Redis-backed session — opaque ID, HttpOnly cookie (BFF / ADR 007)
│   ├── moolre.ts             # All Moolre HTTP calls live here (added per [moolre-sandbox-tested])
│   ├── supabase.ts           # Supabase service-role + anon-key auth clients (added per [db-schema])
│   ├── redis.ts              # Upstash Redis client (added per [redis-setup])
│   └── ussd-session.ts       # Redis USSD session helpers (added per [ussd-session-handler])
├── middleware/
│   ├── error-handler.ts      # Global handler — formats AppError to { error: { code, message } }
│   ├── validate.ts           # Zod request body validator — throws AppError on failure
│   └── require-auth.ts       # Reads session cookie, attaches req.user, throws on miss
├── services/
│   ├── auth-service.ts       # registerEmployer, loginEmployer, getMe
│   └── employer-service.ts   # setFundingModel
├── controllers/
│   ├── auth-controller.ts    # Thin handlers for /auth/* — no business logic
│   └── employer-controller.ts # Thin handler for /employer/*
└── routes/
    ├── health.ts             # /health (liveness), /ready (deps)
    ├── auth.ts               # POST /auth/register, /login, /logout, GET /auth/me
    ├── employer.ts           # PATCH /employer/funding-model
    ├── employees.ts          # GET/POST/PATCH /employees (added per [single-employee-add] etc.)
    ├── advances.ts           # POST /advances/request, GET /advances
    ├── payroll.ts            # POST /payroll/run
    ├── webhooks.ts           # POST /webhooks/moolre (Payments callbacks)
    └── ussd.ts               # POST /ussd (Moolre USSD callbacks)
```

## Layered architecture (per ADR 011 + the root CLAUDE.md engineering practices)

Imports flow one direction: **route → controller → service → lib**. Never the reverse.

- **Routes** wire URL + middleware + controller. No logic.
- **Controllers** read req, call a service, send res. No business logic. They
  throw or propagate — never call `res.status(N).json(...)` for errors.
- **Services** contain business rules. Pure functions where possible. Throw
  `AppError` on failure. Know nothing about Express.
- **Lib** wraps external systems (Supabase, Redis, Moolre, OpenAI). The only
  place we mock when testing.

## Api-specific rules

### Environment
- **Read `process.env` only inside `src/lib/env.ts`.** Every other module imports
  the typed `env` object from there. This guarantees missing or malformed vars
  fail at boot, not at request time.
- New env vars: add the Zod field in `env.ts` AND a placeholder line in
  `.env.example`. Both in the same PR.

### Routes
- Mount routers in `src/index.ts`. One router per file in `src/routes/`.
- Every route validates its body with a Zod schema imported from `@wagr/types`
  via the shared `validate` middleware (once it exists). No raw `req.body.x`.
- Errors return `{ error: { code, message } }`. The global error handler does
  this — throw a real `Error` with a `.status` and `.code` and let it bubble.
- Long-running work (Moolre disbursement, GPT-4o calls): fire it off in the
  background and respond within 1 second.

### Logging
- Import `logger` from `./lib/logger`. Don't use `console.log`.
- Log objects, not strings: `logger.info({ employeeId, amount }, 'advance requested')`.
- Don't log secrets. Don't log full Moolre API responses (they may include
  tokens or personal data) — log the `code` and `status`.

### Moolre integration
- All Moolre HTTP calls go through `src/lib/moolre.ts`. Other modules import
  named functions from there (`initiateTransfer`, `initiatePayment`, `sendSms`,
  `sendWhatsApp`, `pollTransferStatus`). No other file constructs a Moolre URL.
- Always cross-check the shape against [docs/architecture/moolre-api-reference.md](../../docs/architecture/moolre-api-reference.md).
- Canonical network values (`'mtn' | 'telecel' | 'at'`) stay in the database
  and in domain types. Moolre's integer codes are translated only inside
  `moolre.ts`.

### Supabase
- The api is the only thing that talks to Supabase. The web app calls the api;
  the api calls Supabase using the service-role key.
- Use the typed client from `src/lib/supabase.ts`. Tables come from
  `@wagr/types/supabase` (generated by `pnpm db:types`).

### Don't do
- Don't compile to `dist/` yet. We use `tsx` in production. If startup speed
  becomes a problem, add `tsup` and switch then.
- Don't catch errors to "make a function safer." Let them bubble to
  `error-handler.ts` — that's the only place that decides what the client sees.
- Don't add a logging library other than pino. Don't reach for winston.
- Don't import `process.env` outside `lib/env.ts`. If you need a new var,
  declare it there.
