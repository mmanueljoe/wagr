import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import {
  type AdvancePatternReason,
  generateAdvancePatternExplanation,
} from '../lib/credit-flag-gpt'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'

// Surface "this worker has been pulling advances frequently" to the
// employer as an INFORMATIONAL signal. Not credit scoring — see
// docs/specs/feature-ai.md "Advance Pattern Flag" for the scope reframe.
//
// One rule today: more than 3 advances in any rolling 7-day window.
// The `credit_flag` / `credit_flag_reason` / `credit_flag_at` columns on
// `employees` are reused (avoids a migration); UI surfaces them as
// "advance pattern" not "credit".

const HIGH_FREQUENCY_WINDOW_DAYS = 7
const HIGH_FREQUENCY_THRESHOLD = 3

// `disbursed` and `repaid` both count as "the worker received this advance".
// `pending` is in-flight; `failed` never reached the worker. Counting only
// the two outcomes that actually mean money moved keeps the signal honest.
const COUNTED_STATUSES = ['disbursed', 'repaid'] as const

export async function evaluateAdvancePattern(employeeId: string): Promise<void> {
  const employee = await loadEmployee(employeeId)
  if (!employee) {
    logger.warn({ employeeId }, 'advance-pattern eval: employee not found')
    return
  }

  const recent = await countRecentAdvances(employeeId)
  const shouldFlag = recent > HIGH_FREQUENCY_THRESHOLD

  if (shouldFlag && !employee.credit_flag) {
    await raiseFlag(employee)
    return
  }
  if (!shouldFlag && employee.credit_flag) {
    await clearFlag(employee)
    return
  }
  // Either already flagged and still over threshold, or already unflagged
  // and still under — no-op. The flag's existing reason text stands.
}

// ─── Internals ───────────────────────────────────────────────────────────

interface EmployeeFlagRow {
  id: string
  employer_id: string
  full_name: string
  credit_flag: boolean
}

async function loadEmployee(employeeId: string): Promise<EmployeeFlagRow | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, employer_id, full_name, credit_flag')
    .eq('id', employeeId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, employeeId }, 'advance-pattern: employee load failed')
    throw new AppError('EMPLOYEE_LOAD_FAILED', 500, 'Could not load worker')
  }
  return data
}

async function countRecentAdvances(employeeId: string): Promise<number> {
  const since = new Date(Date.now() - HIGH_FREQUENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const { count, error } = await supabase
    .from('advance_requests')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .in('status', COUNTED_STATUSES as unknown as string[])
    .gte('requested_at', since.toISOString())

  if (error) {
    logger.error({ err: error, employeeId }, 'advance-pattern: count query failed')
    throw new AppError('ADVANCE_COUNT_FAILED', 500, 'Could not read advance history')
  }
  return count ?? 0
}

async function raiseFlag(employee: EmployeeFlagRow): Promise<void> {
  const reason: AdvancePatternReason = 'high_frequency'
  const firstName = pickFirstName(employee.full_name)
  const explanation = await generateAdvancePatternExplanation({
    workerFirstName: firstName,
    reason,
  })

  const { error } = await supabase
    .from('employees')
    .update({
      credit_flag: true,
      credit_flag_reason: explanation,
      credit_flag_at: new Date().toISOString(),
    })
    .eq('id', employee.id)

  if (error) {
    logger.error({ err: error, employeeId: employee.id }, 'advance-pattern: flag write failed')
    throw new AppError('FLAG_WRITE_FAILED', 500, 'Could not update advance-pattern flag')
  }

  await audit({
    action: 'advance_pattern_flagged',
    actor: 'system',
    employerId: employee.employer_id,
    employeeId: employee.id,
    metadata: { reason, explanation },
  })
}

async function clearFlag(employee: EmployeeFlagRow): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({
      credit_flag: false,
      credit_flag_reason: null,
      credit_flag_at: null,
    })
    .eq('id', employee.id)

  if (error) {
    logger.error({ err: error, employeeId: employee.id }, 'advance-pattern: flag clear failed')
    throw new AppError('FLAG_WRITE_FAILED', 500, 'Could not clear advance-pattern flag')
  }

  await audit({
    action: 'advance_pattern_cleared',
    actor: 'system',
    employerId: employee.employer_id,
    employeeId: employee.id,
  })
}

function pickFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}
