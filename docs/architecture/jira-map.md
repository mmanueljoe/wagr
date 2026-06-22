# Jira ID Mapping

Stable slugs used throughout the docs, mapped to the current Jira issue IDs.
**The slug is the identifier.** It never changes. The Jira ID is just where the story lives today.

When Jira renumbers a story (delete + recreate, project reset, etc.), only the **Jira ID** column changes. Slugs and titles stay put.

**Tip:** prefix your Jira story titles with the slug in square brackets (e.g. `[ussd-session-handler] USSD callback handler...`) so you can still find a story by slug even if its ID drifts.

---

## Foundation (Epic: Foundation and Setup)

| Slug | Title | Jira ID |
|---|---|---|
| next-scaffold | Next.js 15 + Tailwind v4 + shadcn/ui scaffold | |
| express-scaffold | Express 5 + TypeScript backend scaffold | |
| db-schema | Supabase Postgres schema + RLS | |
| redis-setup | Upstash Redis client + session TTL | |
| moolre-sandbox-tested | Moolre sandbox APIs verified in Postman | |

## Employer Onboarding (Epic: Employer Onboarding)

| Slug | Title | Jira ID |
|---|---|---|
| employer-register | Employer company registration | |
| employer-login | Employer dashboard login | |
| csv-employee-upload | Bulk employee upload via CSV | |
| single-employee-add | Add individual employee | |
| employee-deactivate | Deactivate employee | |

## Wage Engine (Epic: Wage Calculation Engine)

| Slug | Title | Jira ID |
|---|---|---|
| earned-wage-calc | Earned wage calculation | |
| max-advance-calc | Max advance (50% cap) calculation | |
| fee-calc | Service fee (flat GHS 10) calculation | |

## USSD Worker Flow (Epic: USSD Worker Flow)

| Slug | Title | Jira ID |
|---|---|---|
| ussd-session-handler | USSD callback handler with Redis session | |
| ussd-balance-step | USSD step: balance display | |
| ussd-amount-step | USSD step: amount entry | |
| ussd-confirm-step | USSD step: confirmation screen | |
| ussd-pin-step | USSD step: PIN confirmation | |
| ussd-pin-setup | USSD first-use PIN setup | |

## Disbursements + Collections (Epic: Moolre Disbursements and Collections)

| Slug | Title | Jira ID |
|---|---|---|
| moolre-disbursement | Advance disbursement via Moolre Transfers API | |
| float-funding | Employer float funding via Moolre Payments API | |
| payday-recovery | Payday advance recovery via Moolre Payments API | |

## Employer Dashboard (Epic: Employer Dashboard)

| Slug | Title | Jira ID |
|---|---|---|
| dashboard-home | Dashboard home: float balance + activity | |
| dashboard-employees | Employee list with advance history | |
| dashboard-advances | Advance requests list with filters | |
| payroll-flow | Process payroll from dashboard | |
| dashboard-credit-flags | Credit scoring flags on employee list | |

## Notifications (Epic: Notifications)

| Slug | Title | Jira ID |
|---|---|---|
| sms-advance-status | SMS on advance received + disbursed | |
| whatsapp-worker-payslip | WhatsApp payslip to worker on payday | |
| whatsapp-employer-summary | WhatsApp payroll summary to employer | |

## AI (Epic: AI Features)

| Slug | Title | Jira ID |
|---|---|---|
| payslip-gpt | GPT-4o payslip generation service | |
| credit-scoring-gpt | AI credit scoring with GPT-4o explanations | |

## Landing Page (Epic: Landing Page and Marketing Site)

| Slug | Title | Jira ID |
|---|---|---|
| landing-structure | Landing page (day-as-narrative artifact-stack, replaces bento + testimonials) | |
| landing-demo-video | Landing demo video / animated mockup | |
| ~~landing-features-bento~~ | Absorbed by `landing-structure` — design choice dropped the bento grid in favour of a narrative artifact-stack | |
| ~~landing-social-proof~~ | Absorbed by `landing-structure` — no fabricated testimonials pre-launch; trust signalled through honesty about scale | |

## Demo + Submission (Epic: Demo Preparation and Submission)

| Slug | Title | Jira ID |
|---|---|---|
| demo-data-setup | Demo employer + pre-loaded realistic data | |
| explainer-video | 60-second explainer video | |
| submission | Competition submission on startup.moolre.com | |

---

## How to use this file

1. After creating/renumbering stories in Jira, fill in the **Jira ID** column.
2. In all other docs, refer to stories by slug: `[ussd-session-handler]` — never by Jira ID.
3. If a story is split or merged, update the slug list here first, then update the docs that reference the old slug.
