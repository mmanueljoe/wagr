import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { ussdErrorHandler } from './ussd-error-handler'

function fakeRes() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
  }
}

describe('ussdErrorHandler', () => {
  it('returns 200 with an END response so the worker never sees a hung screen', () => {
    const res = fakeRes()
    ussdErrorHandler(
      new Error('redis exploded'),
      { url: '/ussd' } as Request,
      res,
      vi.fn() as NextFunction,
    )

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Session error. Please dial again.',
      reply: false,
    })
  })
})
