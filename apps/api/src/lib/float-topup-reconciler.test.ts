import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as auditLib from './audit'
import { reconcileStuckTopUps } from './float-topup-reconciler'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'

const NOW = new Date('2026-01-02T12:00:00.000Z')
const STUCK_BUT_RECENT = '2026-01-02T11:55:00.000Z' // 5min ago — past STUCK_AFTER (60s) but within FORCE_FAIL (1h default)
const STUCK_AND_OLD = '2026-01-02T10:00:00.000Z' // 2h ago — past FORCE_FAIL window

type Row = {
  id: string
  employer_id: string
  amount: number
  initiated_at: string
  status: 'pending' | 'awaiting_otp'
}
type SelectResult = { data: Row[] | null; error: unknown }

function mockStuckQuery(result: SelectResult): { update: ReturnType<typeof vi.fn> } {
  const updateEqStatus = vi.fn().mockResolvedValue({ error: null })
  const updateEqId = vi.fn(() => ({ eq: updateEqStatus }))
  const update = vi.fn(() => ({ eq: updateEqId }))

  // The reconciler now uses `.in('status', [...])` instead of `.eq('status', ...)`
  // because it picks up both 'pending' and 'awaiting_otp' rows.
  const limit = vi.fn().mockResolvedValue(result)
  const lt = vi.fn(() => ({ limit }))
  const inFn = vi.fn(() => ({ lt }))
  const select = vi.fn(() => ({ in: inFn }))

  vi.mocked(supabase.from).mockImplementation(((table: string) => {
    if (table === 'float_top_ups') {
      return { select, update } as never
    }
    return { insert: vi.fn().mockResolvedValue({ error: null }) } as never
  }) as never)

  return { update }
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.mocked(supabase.from).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('reconcileStuckTopUps', () => {
  it('does nothing when the stuck query returns no rows', async () => {
    const { update } = mockStuckQuery({ data: [], error: null })
    const auditSpy = vi.spyOn(auditLib, 'audit').mockResolvedValue()

    await reconcileStuckTopUps(NOW)

    expect(update).not.toHaveBeenCalled()
    expect(auditSpy).not.toHaveBeenCalled()
  })

  it('leaves stuck-but-recent rows alone (within force-fail window)', async () => {
    const { update } = mockStuckQuery({
      data: [
        {
          id: 'tu-1',
          employer_id: 'e-1',
          amount: 500,
          initiated_at: STUCK_BUT_RECENT,
          status: 'pending',
        },
      ],
      error: null,
    })
    const auditSpy = vi.spyOn(auditLib, 'audit').mockResolvedValue()

    await reconcileStuckTopUps(NOW)

    expect(update).not.toHaveBeenCalled()
    expect(auditSpy).not.toHaveBeenCalled()
  })

  it('force-fails rows past the force-fail window', async () => {
    const { update } = mockStuckQuery({
      data: [
        {
          id: 'tu-2',
          employer_id: 'e-1',
          amount: 500,
          initiated_at: STUCK_AND_OLD,
          status: 'pending',
        },
      ],
      error: null,
    })
    const auditSpy = vi.spyOn(auditLib, 'audit').mockResolvedValue()

    await reconcileStuckTopUps(NOW)

    expect(update).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        failure_reason: expect.stringContaining("webhook didn't arrive"),
      }),
    )
    expect(auditSpy).toHaveBeenCalledOnce()
    expect(auditSpy.mock.calls[0]?.[0]).toMatchObject({
      action: 'float_funding_failed',
      actor: 'system',
      employerId: 'e-1',
    })
  })

  it('continues to the next row when one row errors', async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'tu-bad',
          employer_id: 'e-1',
          amount: 500,
          initiated_at: STUCK_AND_OLD,
          status: 'pending',
        },
        {
          id: 'tu-good',
          employer_id: 'e-1',
          amount: 500,
          initiated_at: STUCK_AND_OLD,
          status: 'pending',
        },
      ],
      error: null,
    })
    const lt = vi.fn(() => ({ limit }))
    const inFn = vi.fn(() => ({ lt }))
    const select = vi.fn(() => ({ in: inFn }))

    let updateCallCount = 0
    const updateEqStatus = vi.fn().mockImplementation(() => {
      updateCallCount++
      if (updateCallCount === 1) {
        return Promise.resolve({ error: { message: 'db blip' } })
      }
      return Promise.resolve({ error: null })
    })
    const updateEqId = vi.fn(() => ({ eq: updateEqStatus }))
    const update = vi.fn(() => ({ eq: updateEqId }))

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'float_top_ups') return { select, update } as never
      return { insert: vi.fn().mockResolvedValue({ error: null }) } as never
    }) as never)

    const auditSpy = vi.spyOn(auditLib, 'audit').mockResolvedValue()

    await reconcileStuckTopUps(NOW)

    // Both rows attempted; only the second produced an audit log (the first
    // failed at the update step).
    expect(update).toHaveBeenCalledTimes(2)
    expect(auditSpy).toHaveBeenCalledOnce()
  })

  it('returns quietly when the stuck-query itself errors', async () => {
    const { update } = mockStuckQuery({ data: null, error: { message: 'db down' } })
    const auditSpy = vi.spyOn(auditLib, 'audit').mockResolvedValue()

    await expect(reconcileStuckTopUps(NOW)).resolves.toBeUndefined()
    expect(update).not.toHaveBeenCalled()
    expect(auditSpy).not.toHaveBeenCalled()
  })
})
