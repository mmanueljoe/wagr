import type { MoneyPesewas } from '@wagr/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '../errors/app-error'
import * as moolre from '../lib/moolre'
import {
  notifyAdvanceDisbursed,
  notifyAdvanceFailed,
  notifyAdvanceRequested,
} from './notification-service'

const MOMO = '0241235993'

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('notifyAdvanceRequested', () => {
  it('formats the request-received message with the gross amount', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceRequested({ momoNumber: MOMO, requestedPesewas: 20_000 as MoneyPesewas })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message:
        'Your Wagr advance request of GHS 200.00 has been received. You will be notified when it is sent.',
    })
  })

  it('swallows SMS delivery failures so the advance is not blocked', async () => {
    vi.spyOn(moolre, 'sendSms').mockRejectedValue(new AppError('MOOLRE_HTTP_FAILED', 502, 'down'))
    await expect(
      notifyAdvanceRequested({ momoNumber: MOMO, requestedPesewas: 5_000 as MoneyPesewas }),
    ).resolves.toBeUndefined()
  })
})

describe('notifyAdvanceDisbursed', () => {
  it('formats the arrival message with the net amount', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceDisbursed({ momoNumber: MOMO, netPesewas: 19_400 as MoneyPesewas })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message: "GHS 194.00 has been sent to your MoMo. Wagr — Don't wait for payday.",
    })
  })
})

describe('notifyAdvanceFailed', () => {
  it('sends the generic failure message', async () => {
    const sendSms = vi.spyOn(moolre, 'sendSms').mockResolvedValue()
    await notifyAdvanceFailed({ momoNumber: MOMO })

    expect(sendSms).toHaveBeenCalledExactlyOnceWith({
      to: MOMO,
      message:
        'Your Wagr advance request could not be processed. Contact your employer or try again later.',
    })
  })

  it('swallows SMS delivery failures', async () => {
    vi.spyOn(moolre, 'sendSms').mockRejectedValue(new Error('boom'))
    await expect(notifyAdvanceFailed({ momoNumber: MOMO })).resolves.toBeUndefined()
  })
})
