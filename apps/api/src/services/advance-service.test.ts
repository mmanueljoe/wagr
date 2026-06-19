import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as supabaseLib from '../lib/supabase'
import { getDashboardSummary, listRecentAdvances } from './advance-service'

const EMPLOYER_ID = 'emp-abc'

// Mock the supabase module at the external-system boundary. The service
// has no pure-function path that avoids Supabase, so this is the right
// seam to test the business logic inside getDashboardSummary.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// getCurrentPayPeriod needs a stable pay_date and today so the SQL filter
// dates are deterministic. We just need the mock to return rows, so we
// don't care exactly which dates are used.

function mockSelect(rows: { status: string }[]) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: rows[0], error: null }),
  }
  chain.lte = vi.fn().mockResolvedValue({ data: rows, error: null })
  vi.spyOn(supabaseLib.supabase, 'from').mockReturnValue(chain as never)
  return chain
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getDashboardSummary', () => {
  it('returns 100% repayment rate when there are no settled advances', async () => {
    mockSelect([{ status: 'pending' }, { status: 'pending' }])

    const summary = await getDashboardSummary(EMPLOYER_ID, 25, new Date('2026-06-19'))

    expect(summary.pending_requests).toBe(2)
    expect(summary.advances_this_period).toBe(2)
    expect(summary.repayment_rate_percent).toBe(100)
  })

  it('calculates repayment rate as repaid / (repaid + disbursed)', async () => {
    mockSelect([
      { status: 'repaid' },
      { status: 'repaid' },
      { status: 'repaid' },
      { status: 'disbursed' },
    ])

    const summary = await getDashboardSummary(EMPLOYER_ID, 25, new Date('2026-06-19'))

    expect(summary.repayment_rate_percent).toBe(75)
    expect(summary.pending_requests).toBe(0)
    expect(summary.advances_this_period).toBe(4)
  })

  it('returns 100% rate and zero counts when no advances exist this period', async () => {
    mockSelect([])

    const summary = await getDashboardSummary(EMPLOYER_ID, 25, new Date('2026-06-19'))

    expect(summary.advances_this_period).toBe(0)
    expect(summary.pending_requests).toBe(0)
    expect(summary.repayment_rate_percent).toBe(100)
  })
})

describe('listRecentAdvances', () => {
  it('converts cedi amounts to pesewas and maps employee name from join', async () => {
    const rows = [
      {
        id: 'adv-1',
        employee_id: 'emp-1',
        requested_amount: 200,
        fee_amount: 6,
        net_disbursed: 194,
        status: 'disbursed',
        requested_at: '2026-06-18T10:00:00Z',
        disbursed_at: '2026-06-18T10:01:00Z',
        employees: { full_name: 'Ama Mensah' },
      },
    ]
    // listRecentAdvances delegates to listAdvances which uses .range() for pagination
    // and returns { data, error, count } (not just { data, error }).
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rows, error: null, count: 1 }),
    }
    vi.spyOn(supabaseLib.supabase, 'from').mockReturnValue(chain as never)

    const advances = await listRecentAdvances(EMPLOYER_ID)

    expect(advances).toHaveLength(1)
    expect(advances[0]?.employee_name).toBe('Ama Mensah')
    expect(advances[0]?.requested_amount_pesewas).toBe(20_000)
    expect(advances[0]?.fee_amount_pesewas).toBe(600)
    expect(advances[0]?.net_disbursed_pesewas).toBe(19_400)
    expect(advances[0]?.status).toBe('disbursed')
  })
})
