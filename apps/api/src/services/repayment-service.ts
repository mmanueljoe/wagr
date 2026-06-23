import type {
  EmployeeNetwork,
  MoneyPesewas,
  PeriodClosePreview,
  PeriodClosePreviewItem,
  PeriodCloseStatus,
  RepaymentStatus,
} from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { initiatePayment } from '../lib/moolre'
import { supabase } from '../lib/supabase'
import { getCurrentPayPeriod } from '../lib/wage-engine/earned-wage'
import {
  type EmployerSummaryBreakdownItem,
  sendEmployerAdvanceSummary,
  sendWorkerAdvanceSummary,
} from './notification-service'

// Payday recovery — the "money back in" side of Wagr's loop.
//
// During the period, advances debit the employer's float (gross). On close,
// we sum every disbursed advance in the current pay period and pull that
// total from the employer's MoMo via Moolre Payments. On webhook success
// we flip the advances to `repaid` and refund the float (it goes back to
// where it was before the advances started landing). Net effect across the
// loop is zero from the employer's perspective.
//
// Two entry points mirror float-funding-service:
//   - initiatePeriodClose: triggered by the dashboard "Close Pay Period" button
//   - completePeriodClose: triggered by /webhooks/moolre when terminal status arrives

const PESEWAS_PER_CEDI = 100

// Loose-typed client. Both `float_top_ups` and the `momo_number`/`network`
// columns on employers landed in later migrations without a `pnpm db:types`
// run between them. Re-using the same workaround float-funding-service uses
// so this code can read employer.momo_number directly. Drop the cast once
// the supabase types are regenerated.
//
// biome-ignore lint/suspicious/noExplicitAny: pending supabase types regen
const looseDb: any = supabase

export async function getPeriodClosePreview(
  employerId: string,
  today: Date,
): Promise<PeriodClosePreview> {
  const payDate = await getEmployerPayDate(employerId)
  const period = getCurrentPayPeriod(payDate, today)

  const [items, momoNumber, pending] = await Promise.all([
    buildPreviewItems(employerId, period.start, period.end),
    getEmployerMomoNumber(employerId),
    findPendingRepayment(employerId),
  ])

  const total = items.reduce<number>((sum, i) => sum + i.gross_pesewas, 0) as MoneyPesewas

  return {
    items,
    total_to_recover_pesewas: total,
    worker_count: items.length,
    period_start: period.start.toISOString(),
    period_end: period.end.toISOString(),
    employer_momo_number: momoNumber,
    has_pending_close: pending !== null,
    pending_repayment_id: pending?.id ?? null,
  }
}

export async function initiatePeriodClose(
  employerId: string,
  today: Date,
): Promise<{ id: string }> {
  const existing = await findPendingRepayment(employerId)
  if (existing) {
    throw new AppError(
      'CLOSE_ALREADY_IN_PROGRESS',
      409,
      'A pay-period close is already in progress. Wait for it to finish before starting another.',
    )
  }

  const payDate = await getEmployerPayDate(employerId)
  const period = getCurrentPayPeriod(payDate, today)

  const advances = await listDisbursedAdvancesInWindow(employerId, period.start, period.end)
  if (advances.length === 0) {
    throw new AppError(
      'NOTHING_TO_RECOVER',
      400,
      'No disbursed advances in the current pay period — nothing to recover.',
    )
  }

  const totalCedis = roundCedis(advances.reduce<number>((sum, a) => sum + a.requested_amount, 0))
  const advanceIds = advances.map((a) => a.id)
  const externalRef = `wagr-repay-${employerId}-${Date.now()}`

  const { data: row, error } = await supabase
    .from('repayments')
    .insert({
      employer_id: employerId,
      total_amount: totalCedis,
      advance_request_ids: advanceIds,
      status: 'pending',
      moolre_external_ref: externalRef,
    })
    .select('id')
    .single()

  if (error || !row) {
    logger.error({ err: error, employerId }, 'repayments insert failed')
    throw new AppError('REPAYMENT_CREATE_FAILED', 500, 'Could not create repayment')
  }

  const { momoNumber, network } = await getEmployerMomoDetails(employerId)

  let paymentResult: Awaited<ReturnType<typeof initiatePayment>>
  try {
    paymentResult = await initiatePayment({
      amount: totalCedis,
      payer: momoNumber,
      network,
      externalRef,
    })
  } catch (err) {
    logger.error(
      { err, repaymentId: row.id, employerId },
      'moolre initiate payment failed — marking repayment failed',
    )
    await supabase
      .from('repayments')
      .update({
        status: 'failed',
        failure_reason: 'Moolre initiate payment call failed',
      })
      .eq('id', row.id)
    throw new AppError(
      'MOOLRE_PAYMENT_FAILED',
      502,
      'Could not start pay-period recovery with Moolre',
    )
  }

  // Same caveat as initiateFloatTopUp: Moolre may HTTP-200 with a body
  // that says "rejected" (acknowledged=false). Without this check, the
  // repayment row sits at pending forever, the dashboard spins, and no
  // MoMo prompt is ever sent to the employer.
  if (!paymentResult.acknowledged) {
    const reason = `Moolre rejected the recovery request (code ${paymentResult.rawCode})`
    logger.warn(
      { repaymentId: row.id, employerId, moolreCode: paymentResult.rawCode },
      'moolre payment not acknowledged — marking repayment failed',
    )
    await supabase
      .from('repayments')
      .update({ status: 'failed', failure_reason: reason })
      .eq('id', row.id)
    throw new AppError('MOOLRE_PAYMENT_REJECTED', 502, reason)
  }

  await audit({
    action: 'period_close_initiated',
    actor: 'employer',
    employerId,
    metadata: {
      repayment_id: row.id,
      total_amount: totalCedis,
      advance_count: advances.length,
    },
  })

  return { id: row.id }
}

export async function getRepaymentStatus(
  employerId: string,
  repaymentId: string,
): Promise<PeriodCloseStatus> {
  const { data, error } = await supabase
    .from('repayments')
    .select('id, status, total_amount, failure_reason, initiated_at, collected_at, employer_id')
    .eq('id', repaymentId)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, repaymentId }, 'failed to read repayment')
    throw new AppError('REPAYMENT_READ_FAILED', 500, 'Could not read repayment')
  }
  if (!data || data.employer_id !== employerId) {
    throw new AppError('REPAYMENT_NOT_FOUND', 404, 'Repayment not found')
  }

  return {
    id: data.id,
    status: data.status as RepaymentStatus,
    total_pesewas: cedisToPesewas(data.total_amount),
    failure_reason: data.failure_reason,
    initiated_at: data.initiated_at,
    collected_at: data.collected_at,
  }
}

export interface CompletePeriodCloseInput {
  externalRef: string
  txStatus: 1 | 2
  moolreTransactionId?: string
  failureReason?: string
}

export async function completePeriodClose(input: CompletePeriodCloseInput): Promise<void> {
  const { data: row, error } = await supabase
    .from('repayments')
    .select('id, employer_id, total_amount, advance_request_ids, status')
    .eq('moolre_external_ref', input.externalRef)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, externalRef: input.externalRef }, 'repayments lookup failed')
    throw new AppError('REPAYMENT_LOOKUP_FAILED', 500, 'Could not load repayment')
  }
  if (!row) {
    logger.warn({ externalRef: input.externalRef }, 'webhook for unknown repayment')
    return
  }
  if (row.status !== 'pending') {
    logger.info(
      { externalRef: input.externalRef, status: row.status },
      'webhook for already-terminal repayment; ignoring',
    )
    return
  }

  if (input.txStatus === 1) {
    await markRepaymentCollected(row.id, row.employer_id, row.total_amount, row.advance_request_ids)
  } else {
    await markRepaymentFailed(
      row.id,
      row.employer_id,
      row.total_amount,
      input.failureReason ?? 'Unknown',
    )
  }
}

// ─── Internals ───────────────────────────────────────────────────────────

interface PendingRepayment {
  id: string
}

async function findPendingRepayment(employerId: string): Promise<PendingRepayment | null> {
  const { data, error } = await supabase
    .from('repayments')
    .select('id')
    .eq('employer_id', employerId)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (error) {
    logger.error({ err: error, employerId }, 'failed to check pending repayments')
    return null
  }
  return data
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

async function getEmployerMomoNumber(employerId: string): Promise<string | null> {
  const { data, error } = await looseDb
    .from('employers')
    .select('momo_number')
    .eq('id', employerId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { momo_number: string | null }).momo_number ?? null
}

async function getEmployerMomoDetails(
  employerId: string,
): Promise<{ momoNumber: string; network: EmployeeNetwork }> {
  const { data, error } = await looseDb
    .from('employers')
    .select('momo_number, network')
    .eq('id', employerId)
    .maybeSingle()

  if (error || !data) {
    throw new AppError('EMPLOYER_NOT_FOUND', 404, 'Employer not found')
  }

  const stored = data as { momo_number: string | null; network: string | null }
  if (!stored.momo_number || !stored.network) {
    throw new AppError(
      'MOMO_DETAILS_REQUIRED',
      400,
      'Your MoMo number is not set. Fund Float once to register it, then try closing again.',
    )
  }
  if (!/^[0-9]{10}$/.test(stored.momo_number)) {
    throw new AppError('INVALID_MOMO_NUMBER', 400, 'Stored MoMo number is malformed')
  }
  return {
    momoNumber: stored.momo_number,
    network: stored.network as EmployeeNetwork,
  }
}

interface DisbursedAdvanceRow {
  id: string
  employee_id: string
  requested_amount: number
  disbursed_at: string | null
  employees: { full_name: string } | { full_name: string }[] | null
}

async function listDisbursedAdvancesInWindow(
  employerId: string,
  start: Date,
  end: Date,
): Promise<DisbursedAdvanceRow[]> {
  const { data, error } = await supabase
    .from('advance_requests')
    .select('id, employee_id, requested_amount, disbursed_at, employees!inner(full_name)')
    .eq('employer_id', employerId)
    .eq('status', 'disbursed')
    .gte('requested_at', start.toISOString())
    .lte('requested_at', end.toISOString())

  if (error) {
    logger.error({ err: error, employerId }, 'failed to list disbursed advances')
    throw new AppError('ADVANCE_LIST_FAILED', 500, 'Could not load advances')
  }
  return (data ?? []) as DisbursedAdvanceRow[]
}

async function buildPreviewItems(
  employerId: string,
  start: Date,
  end: Date,
): Promise<PeriodClosePreviewItem[]> {
  const rows = await listDisbursedAdvancesInWindow(employerId, start, end)

  const byEmployee = new Map<string, PeriodClosePreviewItem>()
  for (const row of rows) {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees
    const name = employee?.full_name ?? ''
    const grossPesewas = cedisToPesewas(row.requested_amount)
    const lastAt = row.disbursed_at ?? new Date(0).toISOString()

    const existing = byEmployee.get(row.employee_id)
    if (existing) {
      existing.advances_taken_count += 1
      existing.gross_pesewas = (existing.gross_pesewas + grossPesewas) as MoneyPesewas
      if (lastAt > existing.last_advance_at) existing.last_advance_at = lastAt
    } else {
      byEmployee.set(row.employee_id, {
        employee_id: row.employee_id,
        worker_name: name,
        advances_taken_count: 1,
        last_advance_at: lastAt,
        gross_pesewas: grossPesewas,
      })
    }
  }

  return Array.from(byEmployee.values()).sort((a, b) => b.gross_pesewas - a.gross_pesewas)
}

async function markRepaymentCollected(
  repaymentId: string,
  employerId: string,
  totalCedis: number,
  advanceIds: string[],
): Promise<void> {
  const { error: updErr } = await supabase
    .from('repayments')
    .update({
      status: 'collected',
      collected_at: new Date().toISOString(),
    })
    .eq('id', repaymentId)

  if (updErr) {
    logger.error({ err: updErr, repaymentId }, 'failed to mark repayment collected')
    throw new AppError('REPAYMENT_UPDATE_FAILED', 500, 'Could not update repayment')
  }

  const { error: advErr } = await supabase
    .from('advance_requests')
    .update({ status: 'repaid' })
    .in('id', advanceIds)
    .eq('status', 'disbursed')

  if (advErr) {
    logger.error(
      { err: advErr, repaymentId, advanceCount: advanceIds.length },
      'failed to flip advances to repaid',
    )
    // Don't throw — the repayment is settled, manual reconciliation can fix
    // any drift. Failing the webhook would trigger Moolre retries on an
    // already-settled payment.
  }

  await creditEmployerFloat(employerId, totalCedis)

  await audit({
    action: 'period_close_collected',
    actor: 'system',
    employerId,
    metadata: {
      repayment_id: repaymentId,
      total_amount: totalCedis,
      advance_count: advanceIds.length,
    },
  })

  // The repayment is settled at this point. Fan-out runs after the audit
  // log so even if the process is killed mid-send, the books are consistent.
  // Failures inside the fan-out are swallowed + audit-logged per worker.
  fanOutAdvanceSummaries(repaymentId, employerId, advanceIds).catch((err) => {
    logger.error(
      { err, repaymentId, employerId },
      'whatsapp advance summary fan-out crashed unexpectedly',
    )
  })
}

interface AdvanceSummaryRow {
  employee_id: string
  requested_amount: number
  employees: {
    full_name: string
    momo_number: string
  } | null
}

async function fanOutAdvanceSummaries(
  repaymentId: string,
  employerId: string,
  advanceIds: string[],
): Promise<void> {
  if (advanceIds.length === 0) return

  const [employerProfile, payDate, advances] = await Promise.all([
    getEmployerProfile(employerId),
    getEmployerPayDate(employerId),
    listAdvancesWithEmployee(advanceIds),
  ])

  if (!employerProfile) {
    logger.error({ employerId, repaymentId }, 'cannot fan out summaries: employer profile missing')
    return
  }

  const payPeriodLabel = formatPayPeriodLabel(getCurrentPayPeriod(payDate, new Date()).end)

  interface PerWorker {
    employeeId: string
    fullName: string
    momoNumber: string
    totalPesewas: MoneyPesewas
  }

  const byEmployee = new Map<string, PerWorker>()
  for (const row of advances) {
    if (!row.employees) continue
    const grossPesewas = cedisToPesewas(row.requested_amount)
    const existing = byEmployee.get(row.employee_id)
    if (existing) {
      existing.totalPesewas = (existing.totalPesewas + grossPesewas) as MoneyPesewas
    } else {
      byEmployee.set(row.employee_id, {
        employeeId: row.employee_id,
        fullName: row.employees.full_name,
        momoNumber: row.employees.momo_number,
        totalPesewas: grossPesewas,
      })
    }
  }

  const workers = Array.from(byEmployee.values())

  const workerSends = workers.map((worker) =>
    sendWorkerAdvanceSummary({
      employerId,
      employeeId: worker.employeeId,
      momoNumber: worker.momoNumber,
      workerFullName: worker.fullName,
      employerName: employerProfile.companyName,
      payPeriodLabel,
      totalAdvancesPesewas: worker.totalPesewas,
      ref: `wagr-summary-${repaymentId}-${worker.employeeId}`,
    }),
  )

  const totalRecoveredPesewas = workers.reduce<number>(
    (sum, w) => sum + w.totalPesewas,
    0,
  ) as MoneyPesewas

  const breakdown: EmployerSummaryBreakdownItem[] = workers.map((w) => ({
    workerFirstName: firstName(w.fullName),
    totalAdvancesPesewas: w.totalPesewas,
  }))

  const employerSend = sendEmployerAdvanceSummary({
    employerId,
    phone: employerProfile.phone,
    employerDisplayName: employerProfile.companyName,
    payPeriodLabel,
    workerCount: workers.length,
    totalRecoveredPesewas,
    breakdown,
    ref: `wagr-employer-summary-${repaymentId}`,
  })

  await Promise.allSettled([...workerSends, employerSend])
}

async function getEmployerProfile(
  employerId: string,
): Promise<{ companyName: string; phone: string } | null> {
  const { data, error } = await supabase
    .from('employers')
    .select('company_name, phone')
    .eq('id', employerId)
    .maybeSingle()
  if (error || !data) return null
  return { companyName: data.company_name, phone: data.phone }
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

async function listAdvancesWithEmployee(advanceIds: string[]): Promise<AdvanceSummaryRow[]> {
  const { data, error } = await supabase
    .from('advance_requests')
    .select('employee_id, requested_amount, employees!inner(full_name, momo_number)')
    .in('id', advanceIds)

  if (error) {
    logger.error(
      { err: error, advanceCount: advanceIds.length },
      'failed to load advances for summary fan-out',
    )
    return []
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as {
      employee_id: string
      requested_amount: number
      employees:
        | { full_name: string; momo_number: string }
        | { full_name: string; momo_number: string }[]
        | null
    }
    const employee = Array.isArray(r.employees) ? r.employees[0] : r.employees
    return {
      employee_id: r.employee_id,
      requested_amount: r.requested_amount,
      employees: employee ?? null,
    }
  })
}

function formatPayPeriodLabel(endOfPeriod: Date): string {
  return endOfPeriod.toLocaleString('en-GH', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

async function markRepaymentFailed(
  repaymentId: string,
  employerId: string,
  totalCedis: number,
  failureReason: string,
): Promise<void> {
  const { error } = await supabase
    .from('repayments')
    .update({
      status: 'failed',
      failure_reason: failureReason.slice(0, 500),
    })
    .eq('id', repaymentId)

  if (error) {
    logger.error({ err: error, repaymentId }, 'failed to mark repayment failed')
    throw new AppError('REPAYMENT_UPDATE_FAILED', 500, 'Could not update repayment')
  }

  await audit({
    action: 'period_close_failed',
    actor: 'system',
    employerId,
    metadata: {
      repayment_id: repaymentId,
      total_amount: totalCedis,
      failure_reason: failureReason.slice(0, 500),
    },
  })
}

async function creditEmployerFloat(employerId: string, amountCedis: number): Promise<void> {
  const { data: emp, error: readErr } = await supabase
    .from('employers')
    .select('float_balance')
    .eq('id', employerId)
    .single()

  if (readErr || !emp) {
    logger.error({ err: readErr, employerId }, 'failed to read float for credit')
    return
  }
  const next = roundCedis(emp.float_balance + amountCedis)
  const { error } = await supabase
    .from('employers')
    .update({ float_balance: next })
    .eq('id', employerId)
  if (error) {
    logger.error({ err: error, employerId }, 'failed to credit float after recovery')
  }
}

function cedisToPesewas(cedis: number): MoneyPesewas {
  return Math.round(cedis * PESEWAS_PER_CEDI) as MoneyPesewas
}

function roundCedis(value: number): number {
  return Math.round(value * 100) / 100
}
