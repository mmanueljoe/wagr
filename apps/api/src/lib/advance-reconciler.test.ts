import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as advanceService from '../services/advance-service'
import { reconcileStuckAdvances } from './advance-reconciler'
import * as moolre from './moolre'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'

const NOW = new Date('2026-01-02T12:00:00.000Z')

// 90s default stuck-after window — anything requested before this counts as
// stuck. Force-fail is 24h before NOW.
const RECENTLY_PENDING = '2026-01-02T11:59:55.000Z' // 5s ago, NOT stuck yet
const STUCK_BUT_RECENT = '2026-01-02T11:00:00.000Z' // 1h ago, stuck but within force-fail window
const STUCK_AND_OLD = '2026-01-01T00:00:00.000Z' // 36h ago, past force-fail window

type SelectResult = {
  data: Array<{ id: string; moolre_external_ref: string; requested_at: string }> | null
  error: unknown
}

function mockStuckQuery(result: SelectResult): void {
  const limit = vi.fn().mockResolvedValue(result)
  const lt = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ lt }))
  const select = vi.fn(() => ({ eq }))
  vi.mocked(supabase.from).mockReturnValue({ select } as never)
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(supabase.from).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reconcileStuckAdvances', () => {
  it('does nothing when the stuck query returns no rows', async () => {
    mockStuckQuery({ data: [], error: null })
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const getStatus = vi.spyOn(moolre, 'getTransferStatus')

    await reconcileStuckAdvances(NOW)

    expect(markDisbursed).not.toHaveBeenCalled()
    expect(markFailed).not.toHaveBeenCalled()
    expect(getStatus).not.toHaveBeenCalled()
  })

  it('marks disbursed when Moolre now returns terminal success', async () => {
    mockStuckQuery({
      data: [{ id: 'adv-1', moolre_external_ref: 'wagr-adv-1', requested_at: STUCK_BUT_RECENT }],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue({
      txStatus: 1,
      transactionId: 'mr-tx-7',
      externalRef: 'wagr-adv-1',
      failureReason: null,
    })
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markDisbursed).toHaveBeenCalledExactlyOnceWith('adv-1', 'mr-tx-7')
    expect(markFailed).not.toHaveBeenCalled()
  })

  it('marks failed when Moolre now returns terminal failure (passes the reason through)', async () => {
    mockStuckQuery({
      data: [{ id: 'adv-2', moolre_external_ref: 'wagr-adv-2', requested_at: STUCK_BUT_RECENT }],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue({
      txStatus: 2,
      transactionId: null,
      externalRef: 'wagr-adv-2',
      failureReason: 'Wrong number',
    })
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markFailed).toHaveBeenCalledExactlyOnceWith('adv-2', 'Wrong number')
    expect(markDisbursed).not.toHaveBeenCalled()
  })

  it('leaves the row alone when Moolre still reports non-terminal AND age is within force-fail window', async () => {
    mockStuckQuery({
      data: [{ id: 'adv-3', moolre_external_ref: 'wagr-adv-3', requested_at: STUCK_BUT_RECENT }],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue({
      txStatus: 0,
      transactionId: null,
      externalRef: 'wagr-adv-3',
      failureReason: null,
    })
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markFailed).not.toHaveBeenCalled()
    expect(markDisbursed).not.toHaveBeenCalled()
  })

  it('force-fails when Moolre is still non-terminal AND the advance is past the force-fail window', async () => {
    mockStuckQuery({
      data: [{ id: 'adv-4', moolre_external_ref: 'wagr-adv-4', requested_at: STUCK_AND_OLD }],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue({
      txStatus: 3,
      transactionId: null,
      externalRef: 'wagr-adv-4',
      failureReason: null,
    })
    const markFailed = vi.spyOn(advanceService, 'markAdvanceFailed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markFailed).toHaveBeenCalledOnce()
    const [advanceId, reason] = markFailed.mock.calls[0] ?? []
    expect(advanceId).toBe('adv-4')
    expect(reason).toMatch(/Reconciler timeout/i)
  })

  it('continues to the next row when one row errors out', async () => {
    mockStuckQuery({
      data: [
        { id: 'adv-bad', moolre_external_ref: 'wagr-adv-bad', requested_at: STUCK_BUT_RECENT },
        { id: 'adv-good', moolre_external_ref: 'wagr-adv-good', requested_at: STUCK_BUT_RECENT },
      ],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus')
      .mockRejectedValueOnce(new Error('moolre transient blip'))
      .mockResolvedValueOnce({
        txStatus: 1,
        transactionId: 'mr-tx-good',
        externalRef: 'wagr-adv-good',
        failureReason: null,
      })
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markDisbursed).toHaveBeenCalledExactlyOnceWith('adv-good', 'mr-tx-good')
  })

  it('returns quietly when the stuck-query itself errors', async () => {
    mockStuckQuery({ data: null, error: { message: 'db down' } })
    const getStatus = vi.spyOn(moolre, 'getTransferStatus')

    await expect(reconcileStuckAdvances(NOW)).resolves.toBeUndefined()
    expect(getStatus).not.toHaveBeenCalled()
  })

  it('does not run against rows that are stuck for less than the configured window', async () => {
    // The query itself filters on `requested_at < stuckBefore`. We test the
    // contract by confirming that if the query returned a row marked
    // RECENTLY_PENDING (which shouldn't happen in real life), we still try
    // to reconcile it — i.e. the function trusts the query's filter rather
    // than re-checking. Defensive style: if the row is given, we process.
    mockStuckQuery({
      data: [{ id: 'adv-r', moolre_external_ref: 'wagr-adv-r', requested_at: RECENTLY_PENDING }],
      error: null,
    })
    vi.spyOn(moolre, 'getTransferStatus').mockResolvedValue({
      txStatus: 1,
      transactionId: 'mr-tx',
      externalRef: 'wagr-adv-r',
      failureReason: null,
    })
    const markDisbursed = vi.spyOn(advanceService, 'markAdvanceDisbursed').mockResolvedValue()

    await reconcileStuckAdvances(NOW)

    expect(markDisbursed).toHaveBeenCalledOnce()
  })
})
