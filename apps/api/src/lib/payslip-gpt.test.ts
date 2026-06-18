import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generatePayslipClosingLine } from './payslip-gpt'

const FALLBACK = 'Thank you for your work this month.'

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
  payPeriodLabel: 'November 2026',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generatePayslipClosingLine', () => {
  it('returns the cleaned LLM output on success', async () => {
    mockFetchOnce(geminiResponse('Great month, Ama — your discipline really shows.'))

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe('Great month, Ama — your discipline really shows.')
  })

  it('sends the prompt to Gemini with the API key in the header (not the URL)', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Take care, Ama.'))

    await generatePayslipClosingLine(INPUT)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // URL is clean — no `?key=` query string. URLs land in logs/proxies;
    // keeping the secret out of the URL keeps it out of those surfaces.
    expect(url).toMatch(/generativelanguage\.googleapis\.com.*generateContent$/)
    expect(url).not.toContain('key=')

    const headers = init.headers as Record<string, string>
    expect(headers['x-goog-api-key']).toBeTruthy()
    expect(init.method).toBe('POST')

    const body = JSON.parse(init.body as string)
    expect(body.contents[0].parts[0].text).toContain('Ama')
    expect(body.contents[0].parts[0].text).toContain('November 2026')
    // The prompt MUST tell the model not to mention numbers — even though
    // we're no longer sending amounts, this rail stops the model from
    // inventing or fishing for figures from its context.
    expect(body.contents[0].parts[0].text).toMatch(/DO NOT mention any specific GHS amounts/i)
  })

  it('does NOT send salary figures into the prompt', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Take care, Ama.'))

    await generatePayslipClosingLine(INPUT)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const prompt = JSON.parse(init.body as string).contents[0].parts[0].text as string
    // Salary data must never reach Google's servers (CLAUDE.md: never log
    // salary; third-party APIs are a logging surface).
    expect(prompt).not.toMatch(/GHS\s*[\d,]+\.\d{2}/)
    expect(prompt).not.toMatch(/gross/i)
    expect(prompt).not.toMatch(/net being paid/i)
  })

  it('strips surrounding quotes that the model sometimes adds', async () => {
    mockFetchOnce(geminiResponse('"Take care, Ama."'))

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe('Take care, Ama.')
  })

  it('collapses internal whitespace and trims', async () => {
    mockFetchOnce(geminiResponse('  Great\n\nwork,   Ama.  '))

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe('Great work, Ama.')
  })

  it('falls back when the model returns an empty string', async () => {
    mockFetchOnce(geminiResponse(''))

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe(FALLBACK)
  })

  it('falls back when Gemini returns a non-OK HTTP status', async () => {
    mockFetchOnce({ error: 'down' }, { ok: false, status: 503 })

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe(FALLBACK)
  })

  it('falls back when fetch throws (network error)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('connection refused'))

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe(FALLBACK)
  })

  it('falls back when the response shape is malformed (no candidates)', async () => {
    mockFetchOnce({
      /* no candidates field */
    })

    const result = await generatePayslipClosingLine(INPUT)

    expect(result).toBe(FALLBACK)
  })

  it('truncates very long lines to the cap', async () => {
    const longLine = 'a'.repeat(500)
    mockFetchOnce(geminiResponse(longLine))

    const result = await generatePayslipClosingLine(INPUT)

    // MAX_CLOSING_LINE_CHARS = 140 in payslip-gpt.ts
    expect(result.length).toBeLessThanOrEqual(140)
  })
})
