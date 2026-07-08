# Submission form answers — draft

For startup.moolre.com, submitting **July 12** (every extra day live is
voting time). Adjust lengths to the form's character limits on the day.
Everything below is true as of submission — no invented numbers.

## The problem

Ghanaian SME workers are paid monthly, but life is priced daily. When a
school bill or clinic fee lands mid-month, a worker's options are asking the
boss for a favour, borrowing from family, or an informal lender at punishing
rates. The money they need usually already exists — it's the wages they've
earned since the 1st. They just can't reach it.

## The solution

Wagr is earned-wage access built for how Ghana actually works. A worker dials
a USSD code on any phone — no app, no smartphone, no data — sees the wages
they've already earned, and withdraws a portion to their MoMo wallet in under
60 seconds, for a flat 3% fee. No interest, no debt: it's their own money,
early. Employers onboard their team on a web dashboard, pre-fund a float,
see every advance in real time, and settle automatically on payday — workers
then get a WhatsApp payslip.

## How we use Moolre (all five APIs)

1. **USSD** — the entire worker experience: PIN setup, earned-balance
   display, advance request, confirmation. Redis-backed sessions inside
   Moolre's 5-second response budget.
2. **Transfers** — disburses the advance to the worker's MoMo, with status
   polling and a background reconciler (never marks failed unless Moolre
   says txstatus 2).
3. **Payments** — money in: employer float top-ups through the full 3-step
   OTP flow, and payday recovery — both completed by HMAC-verified webhooks.
4. **SMS** — instant worker status messages: advance requested, disbursed,
   or failed with a clear reason.
5. **WhatsApp** — Meta-template payslips to workers and period summaries to
   employers after each payday close.

One integration module owns every call, including the per-API auth keys and
the per-API network-code maps.

## Tech stack

Next.js 16 dashboard (Vercel) · Express 5 + TypeScript api (Railway) ·
Supabase Postgres with RLS and DB-level money guards · Upstash Redis ·
Gemini Flash for UX copy only — every financial number and decision is
deterministic code. All amounts are integer pesewas; every money-moving
request is idempotent; a worker can hold at most one pending advance,
enforced by a unique partial index in Postgres.

## Team

Two engineers. Built between June 3 and July 12, 2026.

## Traction / status

Working end-to-end product against Moolre: the full loop — onboard, fund
float, USSD advance, MoMo payout, SMS, payday recovery, WhatsApp payslips —
runs as a scripted smoke test we gate every demo on. Pilot recruitment with
2–3 Accra SMEs (chop bar, construction crew, small shop) begins the week
after submission.

<!-- Fill these on submission day: -->
- Live URL: _TODO_
- Video: _TODO_
- Contact: _TODO_
