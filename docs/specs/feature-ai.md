# Spec: AI Features

**Epic:** WAGR-E8 AI Features
**Stories:** [payslip-gpt], [credit-scoring-gpt]
**Sprint:** Week 4
**Status:** Not started

---

## Overview

Wagr uses a generative LLM for two practical features: producing a friendly personalised closing line on each WhatsApp payslip, and producing plain-English explanations of credit scoring flags. Both features use constrained prompts with structured inputs and validated outputs. Neither requires a custom model or fine-tuning.

**Provider note**: this spec was originally written against OpenAI's GPT-4o. The current implementation uses **Google Gemini Flash** instead — same constraints, same outputs, free-tier-friendly. References to "GPT-4o" below describe the original intent; "the LLM" applies regardless of provider. Swapping providers is a one-file change in `apps/api/src/lib/payslip-gpt.ts` because the rest of the codebase only sees the constrained function output.

The AI features must be demonstrable on judging day. They are not decorative — both produce visible output that judges and users can read.

### WhatsApp templates constraint

WhatsApp Business does not allow freeform outbound messages. Every payslip must be sent using a **pre-approved Meta template** with placeholder variables (`{{1}}`, `{{2}}`, etc.). This means GPT-4o cannot generate the whole payslip — only the parts that fit into the template's placeholder slots. The structured fields (name, gross, deductions, net) are filled in deterministically from the database; GPT-4o produces only the human, friendly closing line that varies per worker.

Submit at least one payslip template to Meta for approval as part of [moolre-sandbox-tested]. Meta approval can take 1–3 days. Without an approved template, no WhatsApp message can be sent.

---

## User Stories

**[payslip-gpt]** — As the system, I want a payslip generation service that produces the placeholder values for a Meta-approved WhatsApp template — including a GPT-4o-generated friendly closing line — so each worker receives a personalised payslip on payday.

**[credit-scoring-gpt]** — As the system, I want an **advance-pattern** flag that surfaces workers pulling advances frequently, with a plain-English explanation, so the employer can check in early. (Reframed from "credit scoring" — Wagr does not score creditworthiness or make lending decisions. The flag is informational only. See Acceptance Criteria for the narrower scope.)

---

## Acceptance Criteria

### Payslip Generation ([payslip-gpt])
- [ ] Service accepts structured input: employee name, pay period, gross salary, advance deductions array, net pay, employer name
- [ ] Returns an object matching the Meta-approved payslip template's placeholders: `{ template_name, language, placeholders: { name, period, employer, gross, advances_total, net, closing_line } }`
- [ ] The deterministic placeholders (name, period, employer, gross, advances_total, net) are filled directly from the input — no AI involved
- [ ] GPT-4o is called only for the `closing_line` placeholder — one short, warm, Ghanaian-tone sentence per worker (under 30 words)
- [ ] GPT-4o called with a constrained system prompt that returns only the closing line text, no other formatting
- [ ] If GPT-4o API fails or times out (5 second timeout), `closing_line` falls back to a static string ("Thank you for your work this month.")
- [ ] The full payslip is sent via Moolre WhatsApp Send Message endpoint using the template name and the placeholder values
- [ ] Tone is warm, plain, and Ghanaian in context — not a bank statement
- [ ] Unit tested with mock GPT-4o responses

### Advance Pattern Flag ([credit-scoring-gpt])
- [ ] **Scope reframe**: this is NOT credit scoring. It does not produce a
      score, does not gate advances, does not make lending decisions. It
      surfaces "this worker is taking advances at a frequency worth
      noticing" to the employer as an *informational* signal.
- [ ] One flag trigger:
  - **High frequency** — more than 3 advance requests in any rolling 7-day
    window
- [ ] (Dropped from original spec: a "failed repayment" trigger keyed on
      `advance_request.status='failed'`. That status fires when the
      *disbursement* fails — wrong MoMo number, network issue. That's not
      a worker-risk signal; penalising the worker for a network blip is
      wrong. A genuine "worker left before payday" signal would require
      new schema fields and is out of scope for the buildathon.)
- [ ] Evaluation runs on two triggers: nightly cron at 2am and on each
      new advance_request creation (fire-and-forget after `markAdvanceDisbursed`)
- [ ] For each flagged worker, the LLM (Gemini Flash) called to generate a
      one-sentence plain-English explanation for the employer
- [ ] Flag and explanation stored on the employee record using the
      existing `credit_flag` (boolean), `credit_flag_reason` (text), and
      `credit_flag_at` (timestamptz) columns. (Column names kept as-is to
      avoid a schema migration; UI labels them "advance pattern" not
      "credit".)
- [ ] Flag clears automatically when the pattern resolves (frequency drops
      back below threshold on the next evaluation tick)
- [ ] LLM prompt contains only the trigger reason code + worker first name.
      No salary, no MoMo, no advance amounts sent to the third-party LLM
      (per the security pattern hardened in [payslip-gpt])
- [ ] Static fallback explanation when the LLM call fails:
      `"Multiple advance requests in a short window."`
- [ ] Unit tested for trigger logic — LLM call is mocked in tests

---

## Technical Notes

### Meta-approved advance summary template

Wagr submits this template to Meta for approval (via the Moolre portal). Until Meta approves it, no WhatsApp message can be sent. Submit during [moolre-sandbox-tested].

**Wording note**: This is an **advance summary**, not a payslip. Wagr does
not pay the worker's salary — the employer's existing payroll does that
separately. The template wording is deliberately honest about this so we
don't make false claims about money Wagr never moved.

```
Template name: wagr_advance_summary_v1
Language: en
Body:
Hi {{1}}, your {{2}} advance summary from {{3}}.

Advances you took this period: GHS {{4}}

Your employer will pay your regular salary minus this amount through
their normal payroll.

{{5}}
— Wagr
```

| Placeholder | Source | Example |
|---|---|---|
| `{{1}}` worker first name | database | `Abena` |
| `{{2}}` pay period | database | `June 2026` |
| `{{3}}` employer name | database | `Accra Wellness Clinic` |
| `{{4}}` total advances this period | database | `300` |
| `{{5}}` closing line | **LLM (Gemini Flash)** | `Take care of yourself this month, Abena.` |

### Payslip generator implementation

```typescript
// apps/api/src/lib/payslip-generator.ts

interface PayslipInput {
  employee_name: string
  pay_period: string          // e.g. "June 2026"
  gross_salary: number
  advances: { date: string; amount: number }[]
  total_advances: number
  net_pay: number
  employer_name: string
}

interface PayslipTemplatePayload {
  template_name: string
  language: string
  placeholders: {
    name: string
    period: string
    employer: string
    gross: string
    advances_total: string
    net: string
    closing_line: string
  }
}

export async function generatePayslip(input: PayslipInput): Promise<PayslipTemplatePayload> {
  // Deterministic placeholders — no AI
  const placeholders = {
    name: input.employee_name,
    period: input.pay_period,
    employer: input.employer_name,
    gross: input.gross_salary.toLocaleString('en-GH'),
    advances_total: input.total_advances.toLocaleString('en-GH'),
    net: input.net_pay.toLocaleString('en-GH'),
    closing_line: await generateClosingLine(input),
  }

  return { template_name: 'wagr_payslip_v1', language: 'en', placeholders }
}

const CLOSING_LINE_PROMPT = `
You are Wagr, a Ghanaian earned wage access platform.
Write one short, warm closing sentence (under 30 words) for a worker's WhatsApp payslip.
Be friendly and human — not like a bank. Use plain English with Ghanaian warmth.
If the worker took advances, acknowledge it without judgement.
Output only the sentence, no greeting, no signature.
`

async function generateClosingLine(input: PayslipInput): Promise<string> {
  const userMessage = `Worker: ${input.employee_name}. Took GHS ${input.total_advances} in advances this period. Net pay: GHS ${input.net_pay}.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: CLOSING_LINE_PROMPT },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 60,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) throw new Error('Empty GPT-4o response')
    return content

  } catch (error) {
    // Fallback closing line if GPT-4o fails or times out
    return 'Thank you for your work this month.'
  }
}
```

### Example rendered payslip (after Moolre fills the template)

```
Hi Abena, your June 2026 payslip from Accra Wellness Clinic.

Gross: GHS 1,400
Advances taken: GHS 300
Net pay: GHS 1,100

You worked hard for it. Take care of yourself this month.
— Wagr
```

### Credit Scoring Logic

```typescript
// apps/api/src/lib/credit-scoring.ts

interface CreditScoringInput {
  employee_id: string
  employer_id: string
}

export async function scoreEmployee(input: CreditScoringInput): Promise<void> {
  const recentAdvances = await getAdvancesLast90Days(input.employee_id)

  const flags: string[] = []

  // High frequency check — more than 3 requests in any 7-day window
  const hasHighFrequency = checkHighFrequency(recentAdvances)
  if (hasHighFrequency) {
    flags.push('high_frequency')
  }

  // Failed repayment check
  const hasFailedRepayment = recentAdvances.some(a => a.status === 'failed')
  if (hasFailedRepayment) {
    flags.push('failed_repayment')
  }

  if (flags.length > 0) {
    const explanation = await generateFlagExplanation(flags, recentAdvances)
    await updateEmployeeCreditFlag(input.employee_id, true, explanation)
  } else {
    // Clear the flag if the pattern has resolved
    await updateEmployeeCreditFlag(input.employee_id, false, null)
  }
}

function checkHighFrequency(advances: AdvanceRequest[]): boolean {
  // Sliding 7-day window check
  for (let i = 0; i < advances.length; i++) {
    const windowStart = new Date(advances[i].requested_at)
    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 7)

    const inWindow = advances.filter(a => {
      const d = new Date(a.requested_at)
      return d >= windowStart && d <= windowEnd
    })

    if (inWindow.length > 3) return true
  }
  return false
}
```

### Credit Flag Explanation Prompt

```typescript
const FLAG_PROMPT = `
You are Wagr, a Ghanaian earned wage access platform.
An employee has been flagged by our credit scoring system.
Write one plain-English sentence explaining the flag to their employer.
Be factual and neutral — do not be judgmental.
Do not use jargon. Output only the sentence.
`

async function generateFlagExplanation(
  flags: string[],
  advances: AdvanceRequest[]
): Promise<string> {
  const flagDescriptions = {
    high_frequency: 'requested advances more than 3 times in a 7-day period',
    failed_repayment: 'has an advance that could not be collected on payday',
  }

  const flagText = flags.map(f => flagDescriptions[f]).join(' and ')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: FLAG_PROMPT },
      { role: 'user', content: `This employee has ${flagText}.` }
    ],
    max_tokens: 60,
    temperature: 0.3,
  })

  return response.choices[0]?.message?.content ?? 'This employee has been flagged for review.'
}
```

### Example Flag Explanation Outputs

High frequency:
> "This employee made 5 advance requests within a 7-day period, which may indicate financial pressure beyond their current salary level."

Failed repayment:
> "A previous advance from this employee could not be recovered on payday — verify their account details are correct and their salary was processed as expected."

---

## Dependencies

| Story | Depends On |
|---|---|
| [payslip-gpt] | [payroll-flow] (payroll run triggers payslip generation) |
| [credit-scoring-gpt] | [moolre-disbursement] (advance data exists to score), [db-schema] (employee table has credit flag columns) |

---

## Database Additions

Add these columns to the employees table for credit flag storage:

```sql
ALTER TABLE employees
  ADD COLUMN credit_flag BOOLEAN DEFAULT FALSE,
  ADD COLUMN credit_flag_reason TEXT,
  ADD COLUMN credit_flag_date TIMESTAMPTZ;
```

Add this to the schema migration file at docs/architecture/schema.sql.

---

## Files to Create

```
apps/api/src/lib/
├── payslip-generator.ts         # GPT-4o payslip generation + static fallback
├── payslip-generator.test.ts    # Unit tests with mocked GPT-4o responses
├── credit-scoring.ts            # Flag logic + GPT-4o explanation generation
└── credit-scoring.test.ts       # Unit tests for flag trigger logic
```
