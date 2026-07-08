# Wagr

> Don't wait for payday.

Wagr is earned-wage access for Ghanaian SME workers: a salaried employee dials
a USSD code on any phone — no app, no smartphone, no loan — and receives a
portion of wages they have **already earned** in their MoMo wallet within 60
seconds. Employers keep control through a web dashboard: they fund the float,
see every advance, and settle in one click on payday.

**The problem:** salaries in Ghana arrive monthly, but life is priced daily.
When school fees or a clinic bill land mid-month, a worker's options are
asking the boss for a favour, borrowing from family, or an informal lender.
The money they need usually already exists — it's the wages they've earned
since the 1st. Wagr unlocks it.

- **Live app:** _TODO: production URL_
- **Demo video:** _TODO: video URL_
- **Live demo script:** [docs/demo-script.md](docs/demo-script.md)

## How it works

```
             ┌──────────────────────── WAGR ────────────────────────┐
             │                                                      │
 Employer ──►│  Next.js dashboard ──► Express api ──► Supabase (PG) │
 (browser)   │      (Vercel)          (Railway)   └─► Upstash Redis │
             │                            │                         │
             │                            ▼                         │
             │                     lib/moolre.ts  ◄── the ONLY file │
             │                            │          that talks to  │
             └────────────────────────────┼──────────  Moolre ──────┘
                                          ▼
             ┌───────────────────── MOOLRE (×5 APIs) ────────────────┐
 Worker ────►│  USSD menu   Transfers→MoMo   Payments←MoMo           │
 (any phone) │  SMS status  WhatsApp payslips                        │
             └────────────────────────────────────────────────────────┘
```

The browser never talks to Supabase or Moolre — everything flows through the
api (BFF pattern, opaque session cookie, tokens never reach the client). All
money is computed in integer pesewas, every money-moving call carries an
idempotency key, and "one pending advance per worker" is enforced by a unique
partial index in Postgres, not app code.

## All five Moolre APIs, and where they live

Every Moolre call goes through one file — [`apps/api/src/lib/moolre.ts`](apps/api/src/lib/moolre.ts) —
which owns the per-API auth headers and the per-API network-code maps
(the same network has different integer codes on different Moolre APIs).

| Moolre API | What Wagr uses it for | Entry points |
|---|---|---|
| **USSD** | The entire worker flow: PIN setup, balance, advance request, confirm | [`routes/ussd.ts`](apps/api/src/routes/ussd.ts) → [`lib/ussd-flow.ts`](apps/api/src/lib/ussd-flow.ts) (pure state machine, Redis sessions) |
| **Transfers** | Disbursing the advance to the worker's MoMo (status via **polling**) | `initiateTransfer` + [`lib/transfer-polling.ts`](apps/api/src/lib/transfer-polling.ts) + [`lib/advance-reconciler.ts`](apps/api/src/lib/advance-reconciler.ts) |
| **Payments** | Employer float funding (3-step OTP flow) and payday recovery (status via **webhook**) | `initiatePayment` + [`controllers/webhook-controller.ts`](apps/api/src/controllers/webhook-controller.ts) |
| **SMS** | Worker status messages: advance requested / disbursed / failed | `sendSms` via [`services/notification-service.ts`](apps/api/src/services/notification-service.ts) |
| **WhatsApp** | Payslips to workers + period summary to employers (Meta templates; Gemini writes only the closing line — numbers are deterministic code) | `sendWhatsAppTemplate` via [`services/notification-service.ts`](apps/api/src/services/notification-service.ts) |

## Run the demo

```bash
pnpm install
cp apps/api/.env.example apps/api/.env    # fill in Supabase, Upstash, Moolre sandbox keys
pnpm db:migrate && pnpm db:seed
pnpm dev                                  # web on :3000, api on :3001

# the pre-demo gate — drives the entire loop end to end:
pnpm smoke                                # add --simulate-webhooks if ngrok isn't running
```

`pnpm smoke` exercises: employer registers → workers uploaded → float funded
via Payments (OTP leg included) → worker dials USSD, sets PIN, requests an
advance, confirms with PIN → Transfers polling lands the money → SMS →
dashboard reflects it → period closes → repayment collected. If it prints
`SMOKE TEST GREEN`, the demo loop works.

## Tech stack

| Layer | Technology |
|---|---|
| Web | Next.js 16 (App Router, React 19), Tailwind CSS v4, shadcn/ui, TanStack Query |
| Api | Node.js 22, Express 5, TypeScript 5 strict, Zod at every boundary |
| Data | Supabase Postgres (RLS on, CHECK constraints on every financial table), Upstash Redis (sessions) |
| AI | Gemini Flash — UX copy only (payslip closing line, flag explanations); never money decisions |
| Payments | Moolre — all five APIs (USSD, Transfers, Payments, SMS, WhatsApp) |
| Deploy | Vercel (web), Railway (api) |

## For reviewers in a hurry

- The state machine that runs the worker flow: [`apps/api/src/lib/ussd-flow.ts`](apps/api/src/lib/ussd-flow.ts) — pure, fully unit-tested
- Money correctness: integer pesewas (ADR 008), idempotency keys, DB-level guards — see [`supabase/migrations/`](supabase/migrations/)
- What we know is unfinished, on purpose: [docs/architecture/tech-debt.md](docs/architecture/tech-debt.md)
- Feature specs (the contract for every slug): [docs/specs/](docs/specs/)
- Sprint sequence and dependency map: [docs/architecture/build-order.md](docs/architecture/build-order.md)
- Moolre integration reference (auth keys, network-code footguns, webhook-vs-polling): [docs/architecture/moolre-api-reference.md](docs/architecture/moolre-api-reference.md)

---

Built for the **Moolre Startup Cup** — submission July 12, 2026. Team: 2 engineers.
