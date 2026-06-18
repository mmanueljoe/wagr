import type { Request, Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as floatService from '../services/float-funding-service'
import { moolreWebhookHandler } from './webhook-controller'

const GOOD_SECRET = 'test-webhook-secret'

interface MockRes {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  _status: number
  _body: unknown
}

function makeRes(): MockRes {
  const res = {
    _status: 200,
    _body: null as unknown,
  } as MockRes
  res.status = vi.fn((code: number) => {
    res._status = code
    return res
  })
  res.json = vi.fn((body: unknown) => {
    res._body = body
    return res
  })
  return res
}

function makeReq(body: unknown): Request {
  return { body } as Request
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('moolreWebhookHandler', () => {
  it('rejects 401 when the secret is missing', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({ data: { externalref: 'wagr-float-emp-123', txstatus: 1 } })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(401)
    expect(completeSpy).not.toHaveBeenCalled()
  })

  it('rejects 401 when the secret is wrong', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: { secret: 'not-the-secret', externalref: 'wagr-float-emp-123', txstatus: 1 },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(401)
    expect(completeSpy).not.toHaveBeenCalled()
  })

  it('routes wagr-float- prefix to completeFloatTopUp on terminal txstatus 1', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: {
        secret: GOOD_SECRET,
        externalref: 'wagr-float-emp-123-1718000000',
        txstatus: 1,
        transactionid: 'mr-tx-7',
      },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(200)
    expect(completeSpy).toHaveBeenCalledExactlyOnceWith({
      externalRef: 'wagr-float-emp-123-1718000000',
      txStatus: 1,
      moolreTransactionId: 'mr-tx-7',
    })
  })

  it('passes failure reason on txstatus 2', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: {
        secret: GOOD_SECRET,
        externalref: 'wagr-float-emp-123-1718000000',
        txstatus: 2,
        message: 'Insufficient balance',
      },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(200)
    expect(completeSpy).toHaveBeenCalledExactlyOnceWith({
      externalRef: 'wagr-float-emp-123-1718000000',
      txStatus: 2,
      failureReason: 'Insufficient balance',
    })
  })

  it('parses numeric-string txstatus values', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: { secret: GOOD_SECRET, externalref: 'wagr-float-emp-123', txstatus: '1' },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(completeSpy).toHaveBeenCalledWith(expect.objectContaining({ txStatus: 1 }))
  })

  it('acks 200 without action on non-terminal txstatus (0 = pending)', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: { secret: GOOD_SECRET, externalref: 'wagr-float-emp-123', txstatus: 0 },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(200)
    expect(completeSpy).not.toHaveBeenCalled()
  })

  it('acks 200 without action on unrecognised externalref prefix', async () => {
    const completeSpy = vi.spyOn(floatService, 'completeFloatTopUp').mockResolvedValue()
    const req = makeReq({
      data: { secret: GOOD_SECRET, externalref: 'wagr-mystery-123', txstatus: 1 },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(200)
    expect(completeSpy).not.toHaveBeenCalled()
  })

  it('still 200s when the downstream handler throws (logged, not retried)', async () => {
    vi.spyOn(floatService, 'completeFloatTopUp').mockRejectedValue(new Error('db down'))
    const req = makeReq({
      data: { secret: GOOD_SECRET, externalref: 'wagr-float-emp-123', txstatus: 1 },
    })
    const res = makeRes()

    await moolreWebhookHandler(req, res as unknown as Response)

    expect(res._status).toBe(200)
  })
})
