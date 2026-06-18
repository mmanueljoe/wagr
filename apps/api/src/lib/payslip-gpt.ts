import { env } from './env'
import { logger } from './logger'

// Generates the warm closing line that fills the {{7}} slot in the Meta-
// approved WhatsApp payslip template (see docs/specs/feature-ai.md).
//
// Every other piece of the payslip — gross / advances / net amounts, worker
// name, period — is deterministic from the wage engine. The LLM is only
// trusted to write a short, warm sentence. We deliberately send the LLM the
// MINIMUM needed for tone (first name + pay period). Salary figures stay on
// our side per CLAUDE.md's "never log salary" rule — third-party APIs count
// as a logging surface.
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
    'WORKER CONTEXT:',
    `- First name: ${input.workerFirstName}`,
    `- Pay period: ${input.payPeriodLabel}`,
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
    // API key goes in the x-goog-api-key header, NOT the URL query string.
    // URLs end up in logs / proxies / telemetry — headers don't (usually).
    // Per Google's docs both auth modes are supported; header is the safe one.
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
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
