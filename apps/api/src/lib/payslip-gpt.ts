import { type MoneyPesewas, formatGhs } from '@wagr/types'
import { env } from './env'
import { logger } from './logger'

// Generates the warm closing line that fills the {{7}} slot in the Meta-
// approved WhatsApp payslip template (see docs/specs/feature-ai.md).
//
// Every other piece of the payslip — gross / advances / net amounts, worker
// name, period — is deterministic from the wage engine. The LLM is only
// trusted to write a short, warm sentence. It never sees the actual GHS
// figures, so it can't get them wrong.
//
// Currently calls Google's Gemini Flash via REST (no SDK — keeps the
// dependency surface small). To swap providers, only this file changes.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const REQUEST_TIMEOUT_MS = 5_000
const MAX_CLOSING_LINE_CHARS = 140

// Safe default used when the LLM call fails, times out, or returns junk.
// Short, warm, applies to anyone. Matches spec.
const FALLBACK_CLOSING_LINE = 'Thank you for your work this month.'

export interface PayslipClosingInput {
  workerFirstName: string
  payPeriodLabel: string // e.g. "November 2026"
  // Carried for prompt context only — the LLM is instructed NOT to mention
  // numbers. We pass the formatted strings rather than raw pesewas so a
  // future iteration can include the period summary without arithmetic.
  grossPesewas: MoneyPesewas
  advancesPesewas: MoneyPesewas
  netPesewas: MoneyPesewas
}

export async function generatePayslipClosingLine(input: PayslipClosingInput): Promise<string> {
  try {
    const raw = await callGemini(buildPrompt(input))
    const cleaned = sanitise(raw)
    if (!cleaned) {
      logger.warn(
        { workerFirstName: input.workerFirstName },
        'payslip closing line empty after sanitise',
      )
      return FALLBACK_CLOSING_LINE
    }
    return cleaned
  } catch (err) {
    logger.warn(
      { err, workerFirstName: input.workerFirstName },
      'payslip closing line generation failed; using fallback',
    )
    return FALLBACK_CLOSING_LINE
  }
}

function buildPrompt(input: PayslipClosingInput): string {
  // The numeric fields are present in the prompt for *context only* — the
  // model is explicitly told not to mention amounts. Including them helps
  // tone (a worker with zero advances vs many advances gets a subtly
  // different closing) without ever risking a wrong number reaching them.
  return [
    "You write a single short warm closing line for a Ghanaian worker's payslip.",
    '',
    'STRICT RULES:',
    '- Output ONLY the closing line. No quotes, no preamble, no sign-off.',
    '- One sentence. No more than 20 words.',
    '- Address the worker by their first name once.',
    '- Plain warm English, like a colleague writing — not formal.',
    '- DO NOT mention any specific GHS amounts, advances, salary, or numbers.',
    '- DO NOT include emoji.',
    '- DO NOT say "Wagr" — the template already signs off.',
    '',
    'WORKER CONTEXT (for tone only, never to be repeated back):',
    `- First name: ${input.workerFirstName}`,
    `- Pay period: ${input.payPeriodLabel}`,
    `- Gross: ${formatGhs(input.grossPesewas)}`,
    `- Advances taken this period: ${formatGhs(input.advancesPesewas)}`,
    `- Net being paid today: ${formatGhs(input.netPesewas)}`,
    '',
    'Closing line:',
  ].join('\n')
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
}

async function callGemini(prompt: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${GEMINI_ENDPOINT}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 80,
          topP: 0.95,
        },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`gemini http ${res.status}`)
    }

    const json = (await res.json()) as GeminiResponse
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('gemini empty response')
    return text
  } finally {
    clearTimeout(timeout)
  }
}

function sanitise(raw: string): string {
  // Collapse whitespace, strip surrounding quotes the model sometimes wraps
  // around the line, and cap length. Better to truncate than to send a
  // multi-sentence ramble.
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .slice(0, MAX_CLOSING_LINE_CHARS)
}
