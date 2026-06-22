# Build Order and Dependency Map

This document defines the order in which features are built, why, and what each feature unlocks.
The sequence is designed to surface the highest-risk items early and keep the critical path unblocked.

---

## Dependency Graph

```
[next-scaffold]  ──────────────────────────────────────────► All frontend work
[express-scaffold]  ──────────────────────────────────────────► All backend work
[db-schema]  ──► [employer-register] ──► [csv-employee-upload] ──► [dashboard-home]
[redis-setup]  ──► [ussd-session-handler]
[moolre-sandbox-tested]  ──► [moolre-disbursement], [float-funding], [payday-recovery], [sms-advance-status]
[moolre-sandbox-tested]  ──► (transitively) [whatsapp-worker-payslip], [whatsapp-employer-summary] via [payroll-flow]

[earned-wage-calc] ─┐
[max-advance-calc] ─┼──► [ussd-balance-step] ──► [ussd-amount-step] ──► [ussd-confirm-step] ──► [ussd-pin-step] ──► [moolre-disbursement]
[fee-calc] ─┘

[ussd-session-handler] ──► [ussd-balance-step], [ussd-pin-setup]

[moolre-disbursement] ──► [dashboard-advances], [dashboard-credit-flags], [sms-advance-status]
[float-funding] ──► [payday-recovery]
[payday-recovery] ──► [payroll-flow] ──► [whatsapp-worker-payslip], [whatsapp-employer-summary]

[employer-register]  ──► [dashboard-home]
[csv-employee-upload]  ──► [dashboard-employees]

[payslip-gpt] ──► [whatsapp-worker-payslip]
[credit-scoring-gpt] ──► [dashboard-credit-flags]

[next-scaffold]  ──► [landing-structure] ──► [landing-demo-video], [landing-features-bento], [landing-social-proof]
```

---

## Sprint-by-Sprint Build Order

### Sprint 1 — Week of June 3 (Foundation)

Build nothing until all of these are done. Everything depends on them.

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [express-scaffold] | All backend routes |
| 2 | [next-scaffold] | All frontend pages |
| 3 | [db-schema] | Employer auth, employee management |
| 4 | [redis-setup] | USSD session handler |
| 5 | [moolre-sandbox-tested] | All Moolre API integrations |

**Why this order:** Backend before frontend because the frontend will call the backend. Database before auth because auth creates database records. Moolre sandbox last because you need the backend running to test callbacks.

**Sprint 1 done when:** Health check returns 200. Database tables exist. Redis connection confirmed. At least one Moolre Payments and one Transfers call succeed in sandbox.

---

### Sprint 2 — Week of June 9 (Employer Onboarding + Wage Engine)

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [earned-wage-calc] | USSD balance display |
| 2 | [max-advance-calc] | USSD advance cap |
| 3 | [fee-calc] | USSD confirmation screen |
| 4 | [employer-register] | Employee management |
| 5 | [employer-login] | Dashboard access |
| 6 | [csv-employee-upload] | Bulk worker onboarding |
| 7 | [single-employee-add] | Individual onboarding |
| 8 | [employee-deactivate] | Access control |

**Why this order:** Wage engine first because it has no dependencies and is needed by USSD. Auth before employee management because employee routes are protected. Bulk upload before single add because bulk is higher value.

**Sprint 2 done when:** An employer can register, log in, upload employees, and the wage calculator returns correct values for a test employee.

---

### Sprint 3 — Week of June 16 (USSD + Disbursements + SMS)

This sprint contains the highest-risk work. USSD is the core product differentiator and the hardest thing to build.

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [ussd-session-handler] | All USSD steps |
| 2 | [ussd-pin-setup] | Worker onboarding |
| 3 | [ussd-balance-step] | Advance request flow |
| 4 | [ussd-amount-step] | Confirmation screen |
| 5 | [ussd-confirm-step] | PIN step |
| 6 | [ussd-pin-step] | Disbursement trigger |
| 7 | [moolre-disbursement] | Advance payout |
| 8 | [sms-advance-status] | Worker feedback |

**Why this order:** Session handler is the foundation of the entire USSD flow — nothing else works without it. Build one step at a time and test each step in the Moolre sandbox before moving to the next. Disbursement after PIN because it is triggered by PIN confirmation. SMS after disbursement because it confirms disbursement.

**Critical:** Test every USSD step on a real phone in the sandbox, not just in Postman. The 5-second timeout behaves differently on real network conditions.

**Sprint 3 done when:** A worker can dial the USSD code on a real phone, request GHS 20, and receive it on a real MoMo wallet with an SMS confirmation.

---

### Sprint 4 — Week of June 23 (Dashboard + AI + Notifications)

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [float-funding] | Payday recovery |
| 2 | [dashboard-home] | Employer overview |
| 3 | [dashboard-employees] | Advance history |
| 4 | [dashboard-advances] | Status monitoring |
| 5 | [payslip-gpt] | WhatsApp payslip |
| 6 | [credit-scoring-gpt] | Dashboard flags |
| 7 | [dashboard-credit-flags] | Employer insight |
| 8 | [payday-recovery] | Full loop |
| 9 | [payroll-flow] | Demo centrepiece |
| 10 | [whatsapp-worker-payslip] | AI demo feature |
| 11 | [whatsapp-employer-summary] | Employer delight |

**Why this order:** Float funding before payday recovery because recovery needs a funded account to collect from. Dashboard views before AI features because flags need somewhere to display. Payslip service before WhatsApp delivery because delivery calls the service. Payday flow last because it depends on everything else being complete.

**Sprint 4 done when:** The full product loop works: employer onboards staff, worker requests advance via USSD, employer processes payroll, workers receive WhatsApp payslips.

---

### Sprint 5 — Week of June 30 (Landing Page + Polish)

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [landing-structure] | Whole landing page — see note below |
| ~~2~~ | ~~[landing-features-bento]~~ | Absorbed by [landing-structure] (design choice) |
| ~~3~~ | ~~[landing-social-proof]~~ | Absorbed by [landing-structure] (design choice) |
| 4 | [landing-demo-video] | Product demonstration |
| 5 | Error states and edge cases | Robust demo |
| 6 | Mobile responsiveness pass | Judging day reliability |
| 7 | [explainer-video] | Submission asset |

**Why two slugs got absorbed:** [landing-structure] shipped as a single-scroll narrative (a worker's day in three real artefacts → "It was already hers" → the math beat → small CTA). The design deliberately dropped both the bento grid and testimonial cards — bento because it reads as the AI-template fintech look we wanted to avoid, testimonials because fabricating quotes pre-launch undermines the page's whole credibility play. The landing-page acceptance criteria those two slugs covered (features visibility, trust signalling) are met inside [landing-structure] through real product screens and honest scale framing.

**Why the rest of the order:** Landing first because all polish work assumes it exists. Video last because the demo video needs to be recorded from the working product.

**Sprint 5 done when:** Landing page is live. All error states handled. Product is mobile responsive. Explainer video is recorded.

---

### Sprint 6 — Week of July 7 (Submission)

| Order | Story | What it unlocks |
|---|---|---|
| 1 | [demo-data-setup] | Reliable judging day demo |
| 2 | Full end-to-end QA | Submission confidence |
| 3 | [explainer-video] | Submission asset |
| 4 | [submission] | Entry confirmed |
| 5 | Voting campaign push | Fan Favourite award |

**Sprint 6 done when:** Submitted on startup.moolre.com before July 13.

---

## What to Do When You Are Blocked

A story is blocked when a dependency is not complete. When this happens:

1. Move to the next story in the sprint that has no unresolved dependencies
2. If the entire sprint is blocked, pull forward the next sprint's non-dependent stories
3. Do not start a story whose dependency is partially complete — partial implementations cause harder bugs than waiting

The most likely blocker is [ussd-session-handler]. If this takes longer than 3 days, start [float-funding] and [dashboard-home] in parallel, then return to USSD.

---

## Team Split Suggestion

Given two developers working part-time:

**Developer 1 (stronger on backend):**
[express-scaffold], [db-schema], [redis-setup], [moolre-sandbox-tested], [earned-wage-calc], [max-advance-calc], [fee-calc], [ussd-session-handler] through [moolre-disbursement], [float-funding], [payday-recovery], [payslip-gpt], [credit-scoring-gpt]

**Developer 2 (stronger on frontend):**
[next-scaffold], [employer-register], [employer-login], [csv-employee-upload], [single-employee-add], [employee-deactivate], [funding-model-select], [dashboard-home], [dashboard-employees], [dashboard-advances], [payroll-flow], [dashboard-credit-flags], [landing-structure] through [landing-social-proof]

These overlap in Sprint 4 when both developers work toward the same dashboard features. Use daily check-ins on WhatsApp to sync and avoid merge conflicts.
