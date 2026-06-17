import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as advanceService from '../services/advance-service'
import * as moolre from './moolre'
import { pollUntilTerminal } from './transfer-polling'

const ADVANCE_ID = 'adv-1'
const EXTERNAL_REF = 'wagr-adv-1'

function statusResult(
  overrides: Partial<moolre.TransferStatusResult> = {},
): moolre.TransferStatusResult {
  return {
    txStatus: 0,
    transactionId: null,
    externalRef: EXTERNAL_REF,
    failureReason: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('pollUntilTerminal', () => {
  it('marks disbursed and stops polling on txStatus 1', async () => {
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValueOnce(
      statusResult({ txStatus: 1, transactionId: 'mr-tx-7' }),
    )
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep })

    expect(markDisbursed).toHaveBeenCalledExactlyOnceWith(ADVANCE_ID, 'mr-tx-7')
    expect(markFailed).not.toHaveBeenCalled()
    expect(sleep).not.toHaveBeenCalled() // terminal on first attempt — no waiting
  })

  it('marks failed and stops polling on txStatus 2', async () => {
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValueOnce(
      statusResult({ txStatus: 2, failureReason: 'Wrong number' }),
    )
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep })

    expect(markFailed).toHaveBeenCalledExactlyOnceWith(ADVANCE_ID, 'Wrong number')
  })

  it('keeps polling on txStatus 0 (Pending) until terminal', async () => {
    const getStatus = vi
      .spyOn(moolre, 'getTransferStatus')
      .mockResolvedValueOnce(statusResult({ txStatus: 0 }))
      .mockResolvedValueOnce(statusResult({ txStatus: 0 }))
      .mockResolvedValueOnce(statusResult({ txStatus: 1, transactionId: 'tx' }))
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep })

    expect(getStatus).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledTimes(2) // sleep between attempts 1→2 and 2→3
    expect(markDisbursed).toHaveBeenCalledExactlyOnceWith(ADVANCE_ID, 'tx')
  })

  it('keeps polling on txStatus 3 (Unknown) — never coerces to failed', async () => {
    vi.spyOn(moolre, 'getTransferStatus')
      .mockResolvedValueOnce(statusResult({ txStatus: 3 }))
      .mockResolvedValueOnce(statusResult({ txStatus: 3 }))
      .mockResolvedValueOnce(statusResult({ txStatus: 1, transactionId: 'tx' }))
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep })

    expect(markDisbursed).toHaveBeenCalledOnce()
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('exhausts the attempt budget without marking failed when never terminal', async () => {
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue(statusResult({ txStatus: 0 }))
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep, maxAttempts: 3 })

    expect(markDisbursed).not.toHaveBeenCalled()
    expect(markFailed).not.toHaveBeenCalled() // leave in pending for manual reconciliation
  })

  it('survives transient errors and keeps polling', async () => {
    vi.spyOn(moolre, 'getTransferStatus')
      .mockRejectedValueOnce(new Error('connection blip'))
      .mockResolvedValueOnce(statusResult({ txStatus: 1, transactionId: 'tx' }))
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const sleep = vi.fn().mockResolvedValue(undefined)

    await pollUntilTerminal(ADVANCE_ID, EXTERNAL_REF, { sleep })

    expect(markDisbursed).toHaveBeenCalledOnce()
  })
})
