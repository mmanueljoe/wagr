import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { ussdErrorHandler } from './ussd-error-handler'

function fakeRes() {
  const status = vi.fn()
  const json = vi.fn()
  const res: Partial<Response> = { status, json }
  status.mockReturnValue(res)
  return { res: res as Response, status, json }
}

describe('ussdErrorHandler', () => {
  it('returns 200 with an END response so the worker never sees a hung screen', () => {
    const { res, status, json } = fakeRes()
    ussdErrorHandler(
      new Error('redis exploded'),
      { url: '/ussd' } as Request,
      res,
      vi.fn() as NextFunction,
    )

    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith({
      message: 'Session error. Please dial again.',
      reply: false,
    })
  })
})
