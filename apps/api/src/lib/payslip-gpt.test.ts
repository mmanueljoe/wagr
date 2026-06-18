import type { MoneyPesewas } from '@wagr/types'
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
  grossPesewas: 250_000 as MoneyPesewas,
  advancesPesewas: 40_000 as MoneyPesewas,
  netPesewas: 210_000 as MoneyPesewas,
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

  it('sends the prompt as Gemini-shaped contents to the right endpoint', async () => {
    const fetchMock = mockFetchOnce(geminiResponse('Take care, Ama.'))

    await generatePayslipClosingLine(INPUT)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/generativelanguage\.googleapis\.com.*generateContent\?key=/)
    expect(init.method).toBe('POST')

    const body = JSON.parse(init.body as string)
    expect(body.contents[0].parts[0].text).toContain('Ama')
    expect(body.contents[0].parts[0].text).toContain('November 2026')
    // The prompt MUST tell the model not to repeat numbers — this is the
    // safety rail that stops it surfacing inaccurate amounts to workers.
    expect(body.contents[0].parts[0].text).toMatch(/DO NOT mention any specific GHS amounts/i)
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
