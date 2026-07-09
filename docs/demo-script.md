# Wagr live demo script

The exact click-by-click and dial-by-dial sequence for the pitch. Practise it
until it's boring. **Run the smoke test before every demo, every video
recording, every deploy:**

```
pnpm --filter api dev        # terminal 1 — api running
pnpm smoke                   # terminal 2 — must end "SMOKE TEST GREEN"
```

If the smoke test is red, do not demo. Fix first.

---

## Setup (before judges are in the room)

- [ ] Smoke test green (above)
- [ ] Dashboard open at `/login`, logged out, in a clean browser profile
- [ ] Demo employer exists with float ≥ GHS 200 and 3+ workers loaded
- [ ] Worker phone: real SIM (MTN preferred), MoMo wallet active, PIN known
- [ ] Employer phone: MoMo wallet with ≥ GHS 250 for the float top-up leg
- [ ] Both phones on mobile data/network — not conference-room wifi promises
- [ ] ngrok (or the production api) reachable from Moolre — webhook path live
- [ ] Phone screen mirrored or camera pointed at it, MoMo + SMS notifications ON

## The loop (≈ 4 minutes)

### 1. The worker side — this is the product (90 seconds)

1. Say: *"Abena earned this money already. Watch how long it takes her to get it."*
2. On the worker phone, dial the USSD code.
3. **Balance screen** appears: earned wage + max advance. Read it out.
4. Press `1` → enter `50` → confirm screen shows amount, **3% fee**, net.
5. Press `1` → enter the 4-digit PIN.
6. "Request submitted" — start counting out loud if you're confident.
7. **MoMo credit alert lands on the phone.** This is the money shot — pause
   and let the judges hear the notification sound.
8. SMS status message arrives right behind it.

### 2. The employer side — control and visibility (60 seconds)

1. Log in to the dashboard.
2. Home: float balance, advances this period, pending count.
3. **Advances page**: the GHS 50 advance from 30 seconds ago is sitting there
   as `disbursed` with the fee broken out.
4. Employees page: show the worker's advance history + the advance-pattern
   flag if the demo data has one (explain: deterministic rule, AI only writes
   the explanation text).

### 3. Money in and money round-trip (60 seconds)

1. Fund Float: enter GHS 100 → OTP arrives on employer phone → enter OTP →
   MoMo PIN prompt → approve. Balance updates when the webhook lands.
2. Close Period (if demo data allows): preview shows what will be recovered
   per worker → run → repayment collects from the employer's MoMo →
   **workers receive WhatsApp payslips** with the AI closing line.
   Show one on the worker phone.

### 4. The one-liner close (10 seconds)

> "Any phone. No app. No loan. Money they already earned — in under a
> minute. Built on all five Moolre APIs."

## Failure-path party trick (optional, 30 seconds)

Judges trust a demo more after they've seen it refuse to break:

- Enter a wrong PIN on purpose → "Wrong PIN. 2 attempts remaining."
- Ask a judge to dial with **their own SIM** → "Number not registered on
  Wagr. Contact your employer." Clean end, no hang.

## If something goes wrong live

- USSD step hangs longer than ~5s → say "network — it happens", redial.
  Sessions are stateless per dial; a fresh dial starts clean.
- Transfer slow → the advances page shows `pending`; explain the
  polling/reconciler honestly and move to the employer side. Check back —
  it will flip to `disbursed`.
- Webhook not arriving on float top-up → the reconciler force-fails safely;
  say so, show the failure message, and move on. Honest failure handling IS
  the fintech pitch.

## Where the five Moolre APIs live (for technical judges)

| API | Where in code |
|---|---|
| USSD | `apps/api/src/routes/ussd.ts` → `lib/ussd-flow.ts` (state machine) |
| Transfers (money out) | `apps/api/src/lib/moolre.ts` → `initiateTransfer`, polled by `lib/transfer-polling.ts` |
| Payments (money in) | `apps/api/src/lib/moolre.ts` → `initiatePayment`, completed by `/webhooks/moolre` |
| SMS | `apps/api/src/lib/moolre.ts` → `sendSms` via `services/notification-service.ts` |
| WhatsApp | `apps/api/src/lib/moolre.ts` → `sendWhatsAppTemplate` (Meta-approved templates) |
