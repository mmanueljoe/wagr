# Wagr — Jira Epics and User Stories

This document contains all epics and user stories for the Wagr MVP.
Create these on Jira (free tier supports up to 10 users at jira.atlassian.com).

---

## How to Set Up Jira

1. Go to jira.atlassian.com and create a free account
2. Create a new project — choose **Scrum** as the project type
3. Name it **Wagr**
4. Create the epics below first, then create stories under each epic
5. Set up 6 sprints, one per week, named Week 1 through Week 6

---

## Epic Structure

```
WAGR-E1  Foundation and Setup
WAGR-E2  Employer Onboarding
WAGR-E3  Wage Calculation Engine
WAGR-E4  USSD Worker Flow
WAGR-E5  Moolre Disbursements and Collections
WAGR-E6  Employer Dashboard
WAGR-E7  Notifications (SMS and WhatsApp)
WAGR-E8  AI Features
WAGR-E9  Payday Recovery Flow
WAGR-E10 Landing Page and Marketing Site
WAGR-E11 Demo Preparation and Submission
```

---

## WAGR-E1: Foundation and Setup

Stories in this epic establish the project infrastructure. Nothing else can be built until this epic is complete.

---

**[next-scaffold]** — As a developer, I want the Next.js project scaffolded with Tailwind CSS and shadcn/ui so that I can build UI components consistently from day one.

- Acceptance criteria: Next.js 15 app with App Router and React 19 initialised. Tailwind CSS v4 configured. shadcn/ui installed and at least one component (Button) rendering correctly. Wagr brand colours configured as Tailwind v4 CSS variables.
- Sprint: Week 1
- Story points: 2

---

**[express-scaffold]** — As a developer, I want the Express backend scaffolded with TypeScript so that I can build type-safe API routes.

- Acceptance criteria: Express 5 app running on port 3001 on Node.js 22. TypeScript 5 configured with strict mode. Nodemon set up for local development. Health check endpoint at GET /health returns 200.
- Sprint: Week 1
- Story points: 2

---

**[db-schema]** — As a developer, I want the PostgreSQL database set up on Supabase with the full schema migrated so that all application data has a home.

- Acceptance criteria: Supabase project created. All tables from the database schema created via migration files. Row-level security enabled on employers, employees, and advance_requests tables. Connection string available as environment variable.
- Sprint: Week 1
- Story points: 3

---

**[redis-setup]** — As a developer, I want Redis configured on Upstash so that USSD session state can be stored with automatic expiry.

- Acceptance criteria: Upstash Redis instance created. Connection confirmed from the Express backend. A test key can be set and retrieved with a TTL. Redis client utility function exported from a shared module.
- Sprint: Week 1
- Story points: 1

---

**[moolre-sandbox-tested]** — As a developer, I want all Moolre sandbox API endpoints tested in Postman, and the long-lead-time approvals kicked off, so that integration surprises are discovered before application code is written.

- Acceptance criteria:
  - Payments API — test payment initiated successfully in sandbox.
  - Transfers API — test payout to a sandbox MoMo number succeeds.
  - USSD API — test callback handler receives a session.
  - SMS API — test message delivered to a real phone number using Moolre's sandbox sender ID.
  - WhatsApp API — test message delivered to a real WhatsApp number using Moolre's sandbox WhatsApp number.
  - Account callback URL set via Update Account, webhook handler verified end-to-end.
  - **Long-lead-time work started:** register the `Wagr` SMS sender ID for approval; kick off WhatsApp Meta verification flow; submit the `wagr_payslip_v1` template to Meta for approval. None of these block sandbox testing, but they take days, so start them now.
  - All response schemas documented in a Postman collection committed to the repo.
- Sprint: Week 1
- Story points: 3

---

## WAGR-E2: Employer Onboarding

Stories covering employer registration, authentication, and employee management.

---

**[employer-register]** — As an employer, I want to register my company on Wagr so that I can set up my workforce on the platform.

- Acceptance criteria: Registration form collects company name, email, phone, industry, and pay date. Supabase Auth creates the user account. An employer record is created in the employers table. Employer is redirected to the dashboard on success. Email validation and duplicate email error handled.
- Sprint: Week 2
- Story points: 3

---

**[employer-login]** — As an employer, I want to log in to my dashboard so that I can manage my employees and advances.

- Acceptance criteria: Login form accepts email and password. NextAuth.js session created on success. Invalid credentials show an error message. Session persists across page refreshes. Unauthenticated users are redirected to the login page.
- Sprint: Week 2
- Story points: 2

---

**[csv-employee-upload]** — As an employer, I want to upload my employee list via CSV so that I can onboard my entire workforce at once.

- Acceptance criteria: CSV upload accepts columns: full_name, momo_number, network, monthly_salary, start_date. Rows are validated before insertion — invalid rows are flagged with an error message, valid rows are inserted. Duplicate MoMo numbers within the same employer are rejected. Success summary shows how many employees were added.
- Sprint: Week 2
- Story points: 5

---

**[single-employee-add]** — As an employer, I want to add a single employee manually so that I can onboard new hires without re-uploading the full list.

- Acceptance criteria: Form collects full name, MoMo number, network, monthly salary, and start date. Employee record created and visible in the employee list immediately. Validation errors shown inline.
- Sprint: Week 2
- Story points: 2

---

**[employee-deactivate]** — As an employer, I want to deactivate an employee so that former staff cannot request advances.

- Acceptance criteria: Deactivate button on each employee record. Sets is_active to false. Deactivated employees are excluded from USSD balance lookups. Action is logged in the audit_log.
- Sprint: Week 2
- Story points: 1

---

**[funding-model-select]** — As an employer, I want to select my funding model during onboarding so that Wagr knows whether to use my float or front advances from its own capital.

- Acceptance criteria: Onboarding step presents Model 1 and Model 2 with plain-English descriptions. Selection is saved to the employer record. Model 1 employers are prompted to fund their float before the dashboard activates.
- Sprint: Week 2
- Story points: 2

---

## WAGR-E3: Wage Calculation Engine

Stories covering earned wage calculation logic.

---

**[earned-wage-calc]** — As the system, I want to calculate an employee's earned wages for the current pay period so that advance requests can be validated accurately.

- Acceptance criteria: Formula: (days_elapsed / pay_period_days) x monthly_salary. days_elapsed is calculated from the first day of the current pay period to today. pay_period_days is the total number of days in the current pay period. Result is rounded down to the nearest GHS. Function is unit-tested with at least five edge cases including: first day of period, last day of period, mid-period, new employee in first month, employee with start_date after period start.
- Sprint: Week 2
- Story points: 3

---

**[max-advance-calc]** — As the system, I want to calculate the maximum advance available to an employee so that disbursements never exceed 50% of earned wages.

- Acceptance criteria: Max advance = 50% of earned wage result from [earned-wage-calc]. Any outstanding undisbursed advances from the current period are subtracted from the max advance. Result is rounded down to the nearest GHS. Returns zero if the employee has already advanced their maximum for the period.
- Sprint: Week 2
- Story points: 2

---

**[fee-calc]** — As the system, I want to calculate the service fee for an advance so that the net disbursement amount is accurate.

- Acceptance criteria: Fee = 3% of requested amount, rounded up to the nearest GHS. Net disbursement = requested amount minus fee. Fee amount and net disbursement are both stored on the advance_request record.
- Sprint: Week 2
- Story points: 1

---

## WAGR-E4: USSD Worker Flow

Stories covering the USSD interface workers use to request advances.

---

**[ussd-session-handler]** — As the system, I want a USSD callback handler that manages session state so that workers can navigate a multi-step flow on any phone.

- Acceptance criteria: Express route POST /ussd receives Moolre USSD callbacks. Session state stored in Redis with key ussd:session:{sessionId} (Moolre's sessionId from the callback, not the phone number) and 120-second TTL. Handler returns a valid USSD response within 5 seconds. Session is cleared after completion or timeout. Each step in the flow pre-computes all required values before returning a response.
- Sprint: Week 3
- Story points: 8
- Note: This is the highest-risk story in the build. Budget two full evenings to understand the Moolre USSD callback model before writing code.

---

**[ussd-balance-step]** — As a worker, I want to dial the Wagr USSD code and see my earned balance so that I know how much I can access.

- Acceptance criteria: Step 1 prompts for staff ID or registered phone number. Step 2 displays worker name, current earned balance, and maximum available advance. Employee not found returns a clear error message and ends the session. Balance is pre-computed at session start, not during the session.
- Sprint: Week 3
- Story points: 3
- Depends on: [ussd-session-handler], [max-advance-calc]

---

**[ussd-amount-step]** — As a worker, I want to request an advance amount via USSD so that I can specify exactly how much I need.

- Acceptance criteria: Step 3 prompts for the amount. Amount is validated against the maximum advance. Amount below GHS 10 is rejected with a message. Amount above maximum is rejected with the maximum amount shown. Valid amount proceeds to confirmation step.
- Sprint: Week 3
- Story points: 2
- Depends on: [ussd-balance-step]

---

**[ussd-confirm-step]** — As a worker, I want to see a confirmation screen before authorising my advance so that I know exactly what I will receive.

- Acceptance criteria: Step 4 displays: requested amount, service fee, net amount to be received, and the MoMo number it will be sent to. Worker can confirm or cancel. Cancel ends the session with no action taken.
- Sprint: Week 3
- Story points: 2
- Depends on: [ussd-amount-step]

---

**[ussd-pin-step]** — As a worker, I want to confirm my advance with my PIN so that my advance is protected from unauthorised requests.

- Acceptance criteria: Step 5 prompts for 4-digit PIN. PIN is validated against the bcrypt hash in the employees table. Three incorrect attempts locks the session and shows a message to contact the employer. Correct PIN creates the advance_request record with status: pending and triggers the disbursement flow.
- Sprint: Week 3
- Story points: 3
- Depends on: [ussd-confirm-step]

---

**[ussd-pin-setup]** — As a worker, I want to set my USSD PIN on first use so that I can authorise future advance requests.

- Acceptance criteria: First USSD session for a new employee detects no PIN is set. Additional step prompts worker to set a 4-digit PIN and confirm it. PIN is hashed with bcrypt and stored on the employee record. Subsequent sessions use PIN validation from [ussd-pin-step].
- Sprint: Week 3
- Story points: 2
- Depends on: [ussd-session-handler]

---

## WAGR-E5: Moolre Disbursements and Collections

Stories covering money movement via Moolre APIs.

---

**[moolre-disbursement]** — As the system, I want to disburse an advance to a worker's MoMo wallet via Moolre's Transfers API so that money reaches the worker within 60 seconds of PIN confirmation.

- Acceptance criteria: After PIN confirmation in [ussd-pin-step], the disbursement is triggered asynchronously. Moolre Transfers API is called with: amount (net disbursement), receiver MoMo number, network code, and a unique externalref. The advance stays in `pending` until Transfer Status polling (every 5 seconds, up to 24 attempts) returns a terminal `txstatus`. On `txstatus = 1` (Success): advance → disbursed. On `txstatus = 2` (Failed): advance → failed and employer notified. On `txstatus = 0` (Pending) or `3` (Unknown): keep polling — never assume failure. All events written to audit_log.
- Sprint: Week 3
- Story points: 5
- Depends on: [ussd-pin-step], [moolre-sandbox-tested]

---

**[float-funding]** — As an employer, I want to fund my float via Moolre's Payments API so that advances can be disbursed from my account.

- Acceptance criteria: Dashboard shows a Fund Float button for Model 1 employers. Clicking it initiates a Moolre Payments request for the employer's specified amount. The employer receives a MoMo PIN prompt on their phone. On payment confirmation via Moolre webhook (`txstatus = 1`), the employer's float_balance is updated in the database. Employer receives an SMS confirmation via [sms-advance-status]. The webhook handler verifies the `secret` field in the payload matches our account secret.
- Sprint: Week 4
- Story points: 4
- Depends on: [moolre-sandbox-tested], [employer-register]

---

**[payday-recovery]** — As the system, I want to recover outstanding advances from an employer on payday via Moolre's Payments API so that Wagr's float is replenished automatically.

- Acceptance criteria: Employer triggers the payroll run from the dashboard. System calculates total outstanding advances for the period. Moolre Payments API called for the total amount from the employer's account. If the employer authorised within an active USSD session, the session ID is passed to skip the OTP step. On Moolre webhook with `txstatus = 1`: all included advance records updated to status: repaid, repayment record created. On `txstatus = 2`: employer notified, payroll run blocked until resolved.
- Sprint: Week 4
- Story points: 5
- Depends on: [float-funding], [moolre-disbursement]

---

## WAGR-E6: Employer Dashboard

Stories covering the employer-facing web application.

---

**[dashboard-home]** — As an employer, I want a dashboard home screen showing my float balance and recent activity so that I have an overview of what is happening.

- Acceptance criteria: Float balance displayed prominently with the current amount. Number of advances pending, approved, and disbursed this period shown as stat cards. Recent advance requests listed with employee name, amount, status, and timestamp. Dashboard refreshes data on page load.
- Sprint: Week 4
- Story points: 3
- Depends on: [employer-register], [employer-login]

---

**[dashboard-employees]** — As an employer, I want to view my full employee list with their advance history so that I can see who is using the platform and how.

- Acceptance criteria: Table showing all active employees with: name, MoMo number, monthly salary, total advances this period, and current status. Sortable by name and advance amount. Search by name. Click on an employee row opens their advance history.
- Sprint: Week 4
- Story points: 3
- Depends on: [csv-employee-upload], [single-employee-add]

---

**[dashboard-advances]** — As an employer, I want to see all advance requests with their current status so that I can monitor activity in real time.

- Acceptance criteria: Table showing all advance requests for the current period: employee name, requested amount, fee, net disbursed, status badge, and timestamp. Filter by status: all, pending, disbursed, failed. Export to CSV button.
- Sprint: Week 4
- Story points: 3
- Depends on: [moolre-disbursement]

---

**[payroll-flow]** — As an employer, I want to process payroll from the dashboard so that advances are recovered and net salaries are sent automatically.

- Acceptance criteria: Payroll section shows a summary: each employee, gross salary, total advances to deduct, net salary. Employer reviews and clicks Process Payroll. Confirmation modal shows total to be collected from employer and total to be disbursed to employees. On confirmation, triggers [payday-recovery] (collection) then [moolre-disbursement] batch (net salary disbursements). Progress shown in real time. Completion summary shows how many employees were paid.
- Sprint: Week 4
- Story points: 5
- Depends on: [payday-recovery], [moolre-disbursement]

---

**[dashboard-credit-flags]** — As an employer, I want to see AI credit scoring flags on my employee list so that I can identify workers with risky advance patterns.

- Acceptance criteria: Employees with flagged patterns show a warning badge on the employee list. Clicking the badge opens a panel showing the flag reason in plain English (generated by GPT-4o). Flag criteria: more than 3 advance requests in a 7-day period, or a failed repayment on a previous advance. Flag logic runs nightly and on each new advance request.
- Sprint: Week 4
- Story points: 4
- Depends on: [dashboard-employees], [moolre-disbursement]

---

## WAGR-E7: Notifications

Stories covering SMS and WhatsApp notifications.

---

**[sms-advance-status]** — As a worker, I want to receive an SMS when my advance request is received and when it is disbursed so that I know the status of my request.

- Acceptance criteria: SMS sent via Moolre SMS API on two events: (1) advance_request created with status pending — message: "Your Wagr advance request of GHS [amount] has been received." (2) advance_request updated to status disbursed — message: "GHS [net_amount] has been sent to your MoMo. Wagr." SMS delivery failure is logged but does not block the advance flow.
- Sprint: Week 3
- Story points: 2
- Depends on: [moolre-disbursement], [moolre-sandbox-tested]

---

**[whatsapp-worker-payslip]** — As a worker, I want to receive my payslip on WhatsApp on payday so that I have a clear record of my earnings and deductions.

- Acceptance criteria: WhatsApp message sent via Moolre WhatsApp API after net salary is disbursed, using a Meta-approved template (`wagr_payslip_v1`). Template placeholders include: employee name, pay period, employer name, gross salary, total advances, net pay, and a GPT-4o-generated closing line (under 30 words, warm tone, Ghanaian context). The structured fields come from the database; only the closing line is AI-generated. Message delivered within 5 minutes of payroll completion. Requires the template to be approved by Meta — submitted during [moolre-sandbox-tested].
- Sprint: Week 4
- Story points: 3
- Depends on: [payroll-flow], [moolre-sandbox-tested]

---

**[whatsapp-employer-summary]** — As an employer, I want to receive a WhatsApp payroll summary after processing payroll so that I have a record of what was paid.

- Acceptance criteria: WhatsApp message sent to the employer's registered phone after payroll completion, using a Meta-approved template (`wagr_employer_summary_v1`). Template placeholders include: total employees paid, total advances recovered, total net salaries disbursed, and a GPT-4o-generated closing sentence. The list of individual employees and their net pay amounts is included if the template's variable cap allows it; otherwise linked to the dashboard. Template must be approved by Meta — submitted during [moolre-sandbox-tested].
- Sprint: Week 4
- Story points: 2
- Depends on: [payroll-flow]

---

## WAGR-E8: AI Features

Stories covering GPT-4o integrations.

---

**[payslip-gpt]** — As the system, I want a payslip generation service that produces the placeholder values for a Meta-approved WhatsApp payslip template, including a GPT-4o-generated friendly closing line, so payslips feel personal and readable while complying with WhatsApp Business rules.

- Acceptance criteria: Service accepts: employee name, pay period, employer name, gross salary, advance deductions array, total advances, net pay. Returns an object with `template_name`, `language`, and `placeholders`. Structured placeholders (name, period, employer, gross, advances_total, net) are filled deterministically from the input. The `closing_line` placeholder is generated by GPT-4o with a constrained prompt (under 30 words, friendly tone, Ghanaian context). Fallback to a static closing line ("Thank you for your work this month.") if GPT-4o API fails or times out. Unit tested with mock GPT-4o responses.
- Sprint: Week 4
- Story points: 3

---

**[credit-scoring-gpt]** — As the system, I want a credit scoring service that flags employees with risky advance patterns and generates a plain-English explanation so that employers can review flags on the dashboard.

- Acceptance criteria: Scoring runs on two triggers: nightly cron job and on each new advance_request creation. Rule-based checks: more than 3 requests in 7 days, or any failed repayment. For each flagged employee, GPT-4o called to generate a one-sentence plain-English explanation. Flag and explanation stored on the employee record. Old flags are cleared when the pattern resolves.
- Sprint: Week 4
- Story points: 4

---

## WAGR-E9: Payday Recovery Flow

Covered by [payday-recovery] and [payroll-flow]. No additional stories needed.

---

## WAGR-E10: Landing Page and Marketing Site

Stories covering the public-facing marketing website.

---

**[landing-structure]** — As a potential employer, I want to land on a page that clearly explains what Wagr does and how to get started so that I understand the product before signing up.

- Acceptance criteria: Landing page has six sections: hero, problem, how it works, features, social proof, and CTA. Hero section includes the tagline, a subheading, and a Register your company button. Page is mobile responsive. Page loads in under 3 seconds. Built with Aceternity UI components.
- Sprint: Week 5
- Story points: 5

---

**[landing-demo-video]** — As a visitor, I want to see a demo video or animated flow on the landing page so that I can understand the product without reading.

- Acceptance criteria: A short looping video or animated mockup embedded in the hero or How it works section. Shows: worker dialing USSD, balance appearing, advance confirmed, MoMo notification. Video is under 30 seconds and autoplays muted.
- Sprint: Week 5
- Story points: 3
- Depends on: [landing-structure]

---

**[landing-features-bento]** — As a visitor, I want to see a Features section that explains how Wagr uses Moolre APIs so that the platform's capabilities are clear.

- Acceptance criteria: Six feature cards covering: USSD access, instant MoMo disbursement, employer dashboard, WhatsApp payslips, AI credit scoring, and payday recovery. Each card has an icon, a title, and a two-sentence description. Built with Aceternity UI bento grid component.
- Sprint: Week 5
- Story points: 2
- Depends on: [landing-structure]

---

**[landing-social-proof]** — As a visitor, I want to see a social proof section with a worker quote and an employer quote so that the product feels real and trustworthy.

- Acceptance criteria: Two testimonial cards. Worker card: nurse persona, quote about accessing wages before school fees were due. Employer card: clinic owner persona, quote about eliminating manual advance requests. Cards include a name, role, and company. Note: for the competition, these are representative personas, not real user quotes.
- Sprint: Week 5
- Story points: 1
- Depends on: [landing-structure]

---

## WAGR-E11: Demo Preparation and Submission

---

**[demo-data-setup]** — As the team, I want a demo employer account pre-loaded with realistic data so that judging day demonstrations are reliable and convincing.

- Acceptance criteria: Demo employer: Accra Wellness Clinic, 8 employees, float balance GHS 500. Three employees have advance history from the current period. One employee has a credit scoring flag. Demo worker USSD PIN set and tested. Full flow tested on a real phone with a real MoMo number at least 10 times before judging day.
- Sprint: Week 6
- Story points: 3

---

**[explainer-video]** — As the team, I want a 60-second explainer video recorded and ready for submission so that the Best Explainer Video award is targeted.

- Acceptance criteria: Video covers four scenes as per the demo script in the PRD. Under 60 seconds. Shot on a real phone showing real product flows. Exported as MP4 at 1080p minimum. Uploaded to a shareable link.
- Sprint: Week 5 to 6
- Story points: 2

---

**[submission]** — As the team, I want the submission form on startup.moolre.com completed and submitted before July 13 so that Wagr is entered in the competition.

- Acceptance criteria: All submission fields completed. Product demo link functional. Explainer video link attached. Team information correct. Submitted before the July 13 deadline. Screenshot of confirmation saved.
- Sprint: Week 6
- Story points: 1

---

## Sprint Assignment Summary

| Sprint | Week | Stories | Focus |
|---|---|---|---|
| Sprint 1 | June 3 to 8 | [next-scaffold] through [moolre-sandbox-tested] | Foundation |
| Sprint 2 | June 9 to 15 | [employer-register] through [fee-calc] | Employer onboarding + wage engine |
| Sprint 3 | June 16 to 22 | [ussd-session-handler] through [moolre-disbursement], [sms-advance-status] | USSD flow + disbursements + SMS |
| Sprint 4 | June 23 to 29 | [float-funding] through [dashboard-credit-flags], [whatsapp-worker-payslip] through [credit-scoring-gpt] | Dashboard + AI + notifications |
| Sprint 5 | June 30 to July 6 | [landing-structure] through [landing-social-proof], [explainer-video] | Landing page + video |
| Sprint 6 | July 7 to 13 | [demo-data-setup], [explainer-video], [submission] | Demo prep + submission |

---

## Story Point Scale

| Points | Meaning |
|---|---|
| 1 | Under 2 hours |
| 2 | Half a day |
| 3 | One full day |
| 5 | Two to three days |
| 8 | A full week — break this down if possible |
