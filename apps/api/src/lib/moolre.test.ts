import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors/app-error'
import { getTransferStatus, initiateTransfer } from './moolre'

// We mock global fetch so this file doesn't talk to Moolre. Env is set in
// vitest's setup; if MOOLRE_BASE_URL/credentials aren't present these tests
// still pass because we only verify the request shape and response parsing.

const SUCCESS_ENVELOPE = {
  status: 1,
  code: 'TRA01',
  message: 'Transfer initiated',
  data: { txstatus: 0, transactionid: 'mr-tx-12345' },
}

const TERMINAL_SUCCESS = {
  status: 1,
  code: 'TRA02',
  message: 'Transfer successful',
  data: { txstatus: 1, transactionid: 'mr-tx-12345' },
}

const TERMINAL_FAILURE = {
  status: 1,
  code: 'TRA09',
  message: 'Wrong number',
  data: { txstatus: 2, transactionid: 'mr-tx-12345' },
}

function mockFetchOnce(json: unknown, init: { ok?: boolean; status?: number } = {}) {
  const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => json,
  } as Response)
  return fetchMock
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('initiateTransfer', () => {
  it('posts the right body to /open/transact/transfer with X-API-KEY', async () => {
    const fetchMock = mockFetchOnce(SUCCESS_ENVELOPE)

    const result = await initiateTransfer({
      amount: 194,
      receiver: '0241235993',
      network: 'mtn',
      externalRef: 'wagr-adv-abc',
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/open\/transact\/transfer$/)
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers['X-API-USER']).toBeTruthy()
    expect(headers['X-API-KEY']).toBeTruthy()
    expect(headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({
      type: 1,
      channel: 1, // MTN → 1 for Transfers
      currency: 'GHS',
      amount: '194.00',
      receiver: '0241235993',
      externalref: 'wagr-adv-abc',
    })
    expect(typeof body.accountnumber).toBe('string')

    expect(result.txStatus).toBe(0)
    expect(result.transactionId).toBe('mr-tx-12345')
    expect(result.externalRef).toBe('wagr-adv-abc')
  })

  it('translates network values to the Transfers channel codes', async () => {
    mockFetchOnce(SUCCESS_ENVELOPE)
    let body = await captureBody(() =>
      initiateTransfer({ amount: 100, receiver: '0', network: 'telecel', externalRef: 'x' }),
    )
    expect(body.channel).toBe(6)

    mockFetchOnce(SUCCESS_ENVELOPE)
    body = await captureBody(() =>
      initiateTransfer({ amount: 100, receiver: '0', network: 'at', externalRef: 'y' }),
    )
    expect(body.channel).toBe(7)
  })

  it('throws AppError on a non-OK HTTP response', async () => {
    mockFetchOnce({ status: 0, code: 'TRA99', message: 'down' }, { ok: false, status: 500 })
    await expect(
      initiateTransfer({ amount: 1, receiver: '0', network: 'mtn', externalRef: 'x' }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('parses txstatus when Moolre returns it as a string', async () => {
    mockFetchOnce({ ...SUCCESS_ENVELOPE, data: { txstatus: '1', transactionid: 'tx' } })
    const result = await initiateTransfer({
      amount: 1,
      receiver: '0',
      network: 'mtn',
      externalRef: 'x',
    })
    expect(result.txStatus).toBe(1)
  })

  it('falls back to txstatus 3 (Unknown) for unrecognised values', async () => {
    mockFetchOnce({ ...SUCCESS_ENVELOPE, data: { txstatus: 'weird' } })
    const result = await initiateTransfer({
      amount: 1,
      receiver: '0',
      network: 'mtn',
      externalRef: 'x',
    })
    expect(result.txStatus).toBe(3)
  })
})

describe('getTransferStatus', () => {
  it('posts to /open/transact/status with the externalRef', async () => {
    const fetchMock = mockFetchOnce(TERMINAL_SUCCESS)

    const result = await getTransferStatus('wagr-adv-abc')

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/open\/transact\/status$/)
    const body = JSON.parse((init.body as string) ?? '{}')
    expect(body.externalref).toBe('wagr-adv-abc')

    expect(result.txStatus).toBe(1)
    expect(result.transactionId).toBe('mr-tx-12345')
    expect(result.externalRef).toBe('wagr-adv-abc')
  })

  it('returns terminal failure (txstatus 2) and exposes the message as failureReason', async () => {
    mockFetchOnce(TERMINAL_FAILURE)
    const result = await getTransferStatus('wagr-adv-abc')
    expect(result.txStatus).toBe(2)
    expect(result.failureReason).toBe('Wrong number')
  })
})

async function captureBody<T>(action: () => Promise<T>): Promise<Record<string, unknown>> {
  await action()
  const fetchSpy = global.fetch as unknown as { mock: { calls: Array<[string, RequestInit]> } }
  const lastCall = fetchSpy.mock.calls.at(-1)
  if (!lastCall) throw new Error('captureBody: fetch was not called')
  return JSON.parse(lastCall[1].body as string)
}
