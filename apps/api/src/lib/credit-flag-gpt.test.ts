import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateAdvancePatternExplanation } from './credit-flag-gpt'

const FALLBACK = 'Multiple advance requests in a short window.'

function geminiResponse(text: string) {
  return {
    candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
  }
}

function mockFetchOnce(json: unknown, init: { ok?: boolean; status?: number } = {}) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => json,
  } as Response)
}

const INPUT = {
  workerFirstName: 'Ama',
  reason: 'high_frequency' as const,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateAdvancePatternExplanation', () => {
  it('returns the cleaned LLM output on success', async () => {
    mockFetchOnce(
      geminiResponse('Ama has taken several advances recently — a quick check-in might help.'),
    )

    const result = await generateAdvancePatternExplanation(INPUT)

    expect(result).toBe('Ama has taken several advances recently — a quick check-in might help.')
  })

  it('sends the API key in the header, not the URL', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Ama may need a check-in.'))

    await generateAdvancePatternExplanation(INPUT)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).not.toContain('key=')
    const headers = init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBeTruthy()
  })

  it('does NOT leak salary figures or specific advance amounts into the prompt', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Ama may need a check-in.'))

    await generateAdvancePatternExplanation(INPUT)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const prompt = JSON.parse(init.body as string).contents[0].parts[0].text as string
    // No GHS amounts of any shape leak into the prompt.
    expect(prompt).not.toMatch(/GHS\s*[\d,]+\.\d{2}/)
    expect(prompt).not.toMatch(/GHS\s*\d+/)
    // No raw numeric figures (other than the 3 / 7-day threshold the rule
    // description uses, which are policy constants, not PII).
    expect(prompt).not.toMatch(/\b\d{4,}\b/)
  })

  it('instructs the model NOT to use credit/risk/score language', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Ama may need a check-in.'))

    await generateAdvancePatternExplanation(INPUT)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const prompt = JSON.parse(init.body as string).contents[0].parts[0].text as string
    expect(prompt).toMatch(/DO NOT use the words "credit", "risk", "score", or "debt"/i)
  })

  it('strips surrounding quotes', async () => {
    mockFetchOnce(geminiResponse('"Ama may need a check-in."'))

    const result = await generateAdvancePatternExplanation(INPUT)

    expect(result).toBe('Ama may need a check-in.')
  })

  it('falls back when Gemini returns an empty string', async () => {
    mockFetchOnce(geminiResponse(''))

    expect(await generateAdvancePatternExplanation(INPUT)).toBe(FALLBACK)
  })

  it('falls back on a non-OK HTTP status', async () => {
    mockFetchOnce({ error: 'down' }, { ok: false, status: 503 })

    expect(await generateAdvancePatternExplanation(INPUT)).toBe(FALLBACK)
  })

  it('falls back when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('connection refused'))

    expect(await generateAdvancePatternExplanation(INPUT)).toBe(FALLBACK)
  })

  it('falls back when the response shape is malformed', async () => {
    mockFetchOnce({
      /* no candidates field */
    })

    expect(await generateAdvancePatternExplanation(INPUT)).toBe(FALLBACK)
  })

  it('truncates very long lines to the cap', async () => {
    mockFetchOnce(geminiResponse('a'.repeat(500)))

    const result = await generateAdvancePatternExplanation(INPUT)

    // MAX_EXPLANATION_CHARS = 160 in credit-flag-gpt.ts
    expect(result.length).toBeLessThanOrEqual(160)
  })
})
