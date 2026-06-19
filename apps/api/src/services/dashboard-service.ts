import type { DashboardSummary } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { getCurrentPayPeriod } from '../lib/wage-engine/earned-wage'
import { listAdvancesForEmployer } from './advance-service'

const RECENT_ADVANCES_LIMIT = 10

export async function getDashboardSummary(
  employerId: string,
  today: Date,
): Promise<DashboardSummary> {
  const payDate = await getEmployerPayDate(employerId)
  const period = getCurrentPayPeriod(payDate, today)

  const [thisPeriodCount, pendingCount, repaymentRate, recent] = await Promise.all([
    countAdvancesInWindow(employerId, period.start, period.end),
    countAdvancesByStatus(employerId, 'pending'),
    calculateRepaymentRate(employerId),
    listAdvancesForEmployer(employerId),
  ])

  return {
    advances_this_period_count: thisPeriodCount,
    pending_requests_count: pendingCount,
    repayment_rate_percent: repaymentRate,
    recent_advances: recent.slice(0, RECENT_ADVANCES_LIMIT),
  }
}

async function getEmployerPayDate(employerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('employers')
    .select('pay_date')
    .eq('id', employerId)
    .single()

  if (error || !data) {
    logger.error({ err: error, employerId }, 'failed to read employer pay_date')
    throw new AppError('EMPLOYER_READ_FAILED', 500, 'Could not load employer')
  }
  return data.pay_date
}

async function countAdvancesInWindow(employerId: string, start: Date, end: Date): Promise<number> {
  const { count, error } = await supabase
    .from('advance_requests')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .gte('requested_at', start.toISOString())
    .lte('requested_at', end.toISOString())

  if (error) {
    logger.error({ err: error, employerId }, 'failed to count advances in window')
    throw new AppError('ADVANCE_COUNT_FAILED', 500, 'Could not load advance summary')
  }
  return count ?? 0
}

async function countAdvancesByStatus(employerId: string, status: string): Promise<number> {
  const { count, error } = await supabase
    .from('advance_requests')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .eq('status', status)

  if (error) {
    logger.error({ err: error, employerId, status }, 'failed to count advances by status')
    throw new AppError('ADVANCE_COUNT_FAILED', 500, 'Could not load advance summary')
  }
  return count ?? 0
}

// Repayment rate is repaid / (repaid + failed_repayment). Until payday-recovery
// ships and produces `repaid` rows, no advance has been "successfully repaid"
// yet — return null so the dashboard renders "—" instead of a misleading 0%.
async function calculateRepaymentRate(employerId: string): Promise<number | null> {
  const [repaid, failed] = await Promise.all([
    countAdvancesByStatus(employerId, 'repaid'),
    countAdvancesByStatus(employerId, 'failed'),
  ])
  const denom = repaid + failed
  if (denom === 0) return null
  return Math.round((repaid / denom) * 100)
}
