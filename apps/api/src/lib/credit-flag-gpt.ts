import { env } from './env'
import { logger } from './logger'

// Generates a plain-English explanation for an advance-pattern flag — shown
// to the employer on the dashboard. The rule layer (advance-pattern-service)
// decides whether to flag; this module only writes the human sentence.
//
// Same security shape as payslip-gpt: minimum PII in the prompt (first name +
// reason code, nothing else), deterministic fallback on any failure, API key
// in header not URL, salary/MoMo/amounts never sent to the third-party LLM.
//
// Provider currently Gemini Flash via REST. To swap, only this file changes.

const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const REQUEST_TIMEOUT_MS = 5_000
const MAX_EXPLANATION_CHARS = 160

// The static fallback. Short, factual, applies to any high-frequency flag.
// Used when the LLM call fails, times out, or returns junk — the flag still
// fires; the explanation just gets less personal.
const FALLBACK_EXPLANATION = 'Multiple advance requests in a short window.'

export type AdvancePatternReason = 'high_frequency'

export interface AdvancePatternExplanationInput {
  workerFirstName: string
  reason: AdvancePatternReason
}

export async function generateAdvancePatternExplanation(
  input: AdvancePatternExplanationInput,
): Promise<string> {
  try {
    const raw = await callGemini(buildPrompt(input))
    const cleaned = sanitise(raw)
    if (!cleaned) {
      logger.warn(
        { workerFirstName: input.workerFirstName, reason: input.reason },
        'advance-pattern explanation empty after sanitise',
      )
      return FALLBACK_EXPLANATION
    }
    return cleaned
  } catch (err) {
    logger.warn(
      { err, workerFirstName: input.workerFirstName, reason: input.reason },
      'advance-pattern explanation generation failed; using fallback',
    )
    return FALLBACK_EXPLANATION
  }
}

function buildPrompt(input: AdvancePatternExplanationInput): string {
  return [
    'You write a single short factual sentence for an employer dashboard.',
    'Context: a worker on an earned-wage-access platform has triggered an',
    'advance-pattern flag. The dashboard shows the flag with your sentence',
    'as the explanation. The employer reads this and decides whether to',
    'check in with the worker. It is informational, not a credit decision.',
    '',
    'STRICT RULES:',
    '- Output ONLY the explanation sentence. No quotes, no preamble.',
    '- One sentence. No more than 25 words.',
    '- Reference the worker by their first name once.',
    '- Plain English, neutral tone — not alarming, not dismissive.',
    '- Suggest a check-in if appropriate, but do not prescribe action.',
    '- DO NOT mention any GHS amounts, salary figures, or specific numbers.',
    '- DO NOT use the words "credit", "risk", "score", or "debt" —',
    '  this is an advance-pattern signal, not a credit assessment.',
    '',
    'CONTEXT:',
    `- Worker first name: ${input.workerFirstName}`,
    `- Trigger: ${reasonDescription(input.reason)}`,
    '',
    'Explanation:',
  ].join('\n')
}

function reasonDescription(reason: AdvancePatternReason): string {
  switch (reason) {
    case 'high_frequency':
      return 'Worker has taken more than 3 advances in the last 7 days.'
  }
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
    const res = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 80,
          topP: 0.9,
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
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .slice(0, MAX_EXPLANATION_CHARS)
}
