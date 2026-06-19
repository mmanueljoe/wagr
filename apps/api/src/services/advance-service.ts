import type { AdvanceListItem, AdvanceStatus, MoneyPesewas } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { getCurrentPayPeriod } from '../lib/wage-engine/earned-wage'
import { evaluateAdvancePattern } from './advance-pattern-service'
import {
  notifyAdvanceDisbursed,
  notifyAdvanceFailed,
  notifyAdvanceRequested,
} from './notification-service'

const PESEWAS_PER_CEDI = 100

// Sum of advances the worker has already drawn against the *current* pay
// period — only `disbursed` rows count. `pending` is in-flight (Moolre
// hasn't confirmed), `failed` never moved money, `repaid` is settled.
//
// The max-advance cap is "50% of earned wage minus what's already out",
// so this is the second argument. Returns 0 when the worker has no
// disbursed advances yet — which is true for every worker today until
// [moolre-disbursement] starts creating rows.
export async function getCurrentPeriodDisbursedPesewas(
  employeeId: string,
  payDate: number,
  today: Date,
): Promise<MoneyPesewas> {
  const period = getCurrentPayPeriod(payDate, today)

  const { data, error } = await supabase
    .from('advance_requests')
    .select('requested_amount')
    .eq('employee_id', employeeId)
    .eq('status', 'disbursed')
    .gte('requested_at', period.start.toISOString())
    .lte('requested_at', period.end.toISOString())

  if (error) {
    logger.error({ err: error, employeeId }, 'failed to sum disbursed advances')
    throw new AppError('ADVANCE_SUM_FAILED', 500, 'Could not read advance history')
  }

  // requested_amount is numeric(12,2) cedis in the DB. Convert at this
  // boundary so the wage engine sees pesewas integers only.
  const totalCedis = data.reduce((sum, row) => sum + row.requested_amount, 0)
  return Math.round(totalCedis * PESEWAS_PER_CEDI) as MoneyPesewas
}

// ─── Listing ─────────────────────────────────────────────────────────────

const ADVANCE_LIST_LIMIT = 100

interface ListAdvancesFilters {
  status?: AdvanceStatus
}

// Returns the employer's advances, newest first. Capped at 100 — pagination
// is a polish item once the dashboard has real traffic.
export async function listAdvancesForEmployer(
  employerId: string,
  filters: ListAdvancesFilters = {},
): Promise<AdvanceListItem[]> {
  let query = supabase
    .from('advance_requests')
    .select(
      'id, requested_amount, fee_amount, net_disbursed, status, requested_at, disbursed_at, failure_reason, employees!inner(full_name, momo_number)',
    )
    .eq('employer_id', employerId)
    .order('requested_at', { ascending: false })
    .limit(ADVANCE_LIST_LIMIT)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) {
    logger.error({ err: error, employerId }, 'failed to list advances')
    throw new AppError('ADVANCE_LIST_FAILED', 500, 'Could not load advances')
  }

  return (data ?? []).map(rowToAdvanceListItem)
}

function rowToAdvanceListItem(row: {
  id: string
  requested_amount: number
  fee_amount: number
  net_disbursed: number
  status: string
  requested_at: string
  disbursed_at: string | null
  failure_reason: string | null
  employees:
    | { full_name: string; momo_number: string }
    | { full_name: string; momo_number: string }[]
}): AdvanceListItem {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees
  return {
    id: row.id,
    worker_name: employee?.full_name ?? '',
    worker_momo: employee?.momo_number ?? '',
    requested_pesewas: cedisToPesewas(row.requested_amount),
    fee_pesewas: cedisToPesewas(row.fee_amount),
    net_pesewas: cedisToPesewas(row.net_disbursed),
    status: row.status as AdvanceStatus,
    requested_at: row.requested_at,
    disbursed_at: row.disbursed_at,
    failure_reason: row.failure_reason,
  }
}

// ─── Advance lifecycle ───────────────────────────────────────────────────

// Reconciled interpretation of the spec (feature-disbursements.md):
//   - Float is debited at create-time with the gross requested_amount.
//   - On Moolre success: status → disbursed, wagr_ledger row written.
//   - On Moolre failure: status → failed, float refunded (gross).
// Read-then-write debit isn't strictly race-safe across concurrent advances
// from the same employer. The DB-level CHECK (float_balance >= 0) is the
// backstop. A proper transactional debit is a follow-up — flagged in the
// spec's open questions.

export interface CreateAdvanceInput {
  employeeId: string
  employerId: string
  momoNumber: string
  requestedPesewas: MoneyPesewas
  feePesewas: MoneyPesewas
  netPesewas: MoneyPesewas
}

export interface CreatedAdvance {
  id: string
  externalRef: string
  netCedis: number
  requestedCedis: number
  feeCedis: number
}

export async function createAdvanceRequest(input: CreateAdvanceInput): Promise<CreatedAdvance> {
  const requestedCedis = pesewasToCedis(input.requestedPesewas)
  const feeCedis = pesewasToCedis(input.feePesewas)
  const netCedis = pesewasToCedis(input.netPesewas)

  await debitFloat(input.employerId, requestedCedis)

  const externalRef = `wagr-adv-${crypto.randomUUID()}`
  const { data, error } = await supabase
    .from('advance_requests')
    .insert({
      employee_id: input.employeeId,
      employer_id: input.employerId,
      requested_amount: requestedCedis,
      fee_amount: feeCedis,
      net_disbursed: netCedis,
      status: 'pending',
      moolre_external_ref: externalRef,
    })
    .select('id')
    .single()

  if (error || !data) {
    // The float was already debited — refund it best-effort before bubbling.
    await refundFloat(input.employerId, requestedCedis).catch((err) =>
      logger.error(
        { err, employerId: input.employerId },
        'float refund after insert failure failed',
      ),
    )
    logger.error({ err: error, employeeId: input.employeeId }, 'advance_request insert failed')
    throw new AppError('ADVANCE_CREATE_FAILED', 500, 'Could not create advance request')
  }

  await audit({
    action: 'advance_requested',
    actor: 'worker',
    employerId: input.employerId,
    employeeId: input.employeeId,
    metadata: {
      advance_request_id: data.id,
      requested_amount: requestedCedis,
      fee_amount: feeCedis,
      net_disbursed: netCedis,
    },
  })

  await notifyAdvanceRequested({
    momoNumber: input.momoNumber,
    requestedPesewas: input.requestedPesewas,
  })

  return { id: data.id, externalRef, netCedis, requestedCedis, feeCedis }
}

export async function markAdvanceDisbursed(
  advanceRequestId: string,
  moolreTransactionId: string | null,
): Promise<void> {
  const { data, error } = await supabase
    .from('advance_requests')
    .update({
      status: 'disbursed',
      disbursed_at: new Date().toISOString(),
      moolre_transaction_id: moolreTransactionId,
    })
    .eq('id', advanceRequestId)
    .eq('status', 'pending')
    .select('id, employer_id, employee_id, fee_amount, net_disbursed, employees!inner(momo_number)')
    .maybeSingle()

  if (error) {
    logger.error({ err: error, advanceRequestId }, 'failed to mark advance disbursed')
    throw new AppError('ADVANCE_UPDATE_FAILED', 500, 'Could not update advance request')
  }
  if (!data) {
    // Either the id is wrong or the row is already terminal — don't double-process.
    logger.warn({ advanceRequestId }, 'mark disbursed: advance not found or not pending')
    return
  }

  await accrueWagrRevenue(advanceRequestId, data.fee_amount)

  await audit({
    action: 'advance_disbursed',
    actor: 'system',
    employerId: data.employer_id,
    employeeId: data.employee_id,
    metadata: {
      advance_request_id: data.id,
      moolre_transaction_id: moolreTransactionId,
    },
  })

  await notifyAdvanceDisbursed({
    momoNumber: extractMomo(data.employees),
    netPesewas: cedisToPesewas(data.net_disbursed),
  })

  // Re-evaluate the advance-pattern flag after a successful disbursement.
  // Fire-and-forget: a flag failure should never bubble up to the caller
  // (the disbursement already succeeded; the flag is informational).
  void evaluateAdvancePattern(data.employee_id).catch((err) => {
    logger.error(
      { err, employeeId: data.employee_id },
      'advance-pattern evaluation failed after disbursement',
    )
  })
}

export async function markAdvanceFailed(
  advanceRequestId: string,
  failureReason: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('advance_requests')
    .update({
      status: 'failed',
      failure_reason: failureReason.slice(0, 500),
    })
    .eq('id', advanceRequestId)
    .eq('status', 'pending')
    .select('id, employer_id, employee_id, requested_amount, employees!inner(momo_number)')
    .maybeSingle()

  if (error) {
    logger.error({ err: error, advanceRequestId }, 'failed to mark advance failed')
    throw new AppError('ADVANCE_UPDATE_FAILED', 500, 'Could not update advance request')
  }
  if (!data) {
    logger.warn({ advanceRequestId }, 'mark failed: advance not found or not pending')
    return
  }

  await refundFloat(data.employer_id, data.requested_amount).catch((err) =>
    logger.error({ err, employerId: data.employer_id, advanceRequestId }, 'float refund failed'),
  )

  await audit({
    action: 'advance_failed',
    actor: 'system',
    employerId: data.employer_id,
    employeeId: data.employee_id,
    metadata: {
      advance_request_id: data.id,
      failure_reason: failureReason.slice(0, 500),
    },
  })

  await notifyAdvanceFailed({ momoNumber: extractMomo(data.employees) })
}

// ─── Internals ───────────────────────────────────────────────────────────

async function debitFloat(employerId: string, grossCedis: number): Promise<void> {
  const { data: emp, error: readErr } = await supabase
    .from('employers')
    .select('float_balance')
    .eq('id', employerId)
    .single()

  if (readErr || !emp) {
    logger.error({ err: readErr, employerId }, 'failed to read employer float')
    throw new AppError('FLOAT_READ_FAILED', 500, 'Could not read float balance')
  }
  if (emp.float_balance < grossCedis) {
    throw new AppError('INSUFFICIENT_FLOAT', 409, 'Employer float is insufficient for this advance')
  }

  const next = roundCedis(emp.float_balance - grossCedis)
  const { error: writeErr } = await supabase
    .from('employers')
    .update({ float_balance: next })
    .eq('id', employerId)

  if (writeErr) {
    logger.error({ err: writeErr, employerId }, 'failed to debit float')
    throw new AppError('FLOAT_DEBIT_FAILED', 500, 'Could not debit float balance')
  }
}

async function refundFloat(employerId: string, grossCedis: number): Promise<void> {
  const { data: emp, error: readErr } = await supabase
    .from('employers')
    .select('float_balance')
    .eq('id', employerId)
    .single()

  if (readErr || !emp) {
    throw new AppError('FLOAT_READ_FAILED', 500, 'Could not read float balance')
  }
  const next = roundCedis(emp.float_balance + grossCedis)
  const { error } = await supabase
    .from('employers')
    .update({ float_balance: next })
    .eq('id', employerId)
  if (error) {
    throw new AppError('FLOAT_REFUND_FAILED', 500, 'Could not refund float balance')
  }
}

interface WagrLedgerInsert {
  advance_request_id: string
  fee_amount: number
}

async function accrueWagrRevenue(advanceRequestId: string, feeCedis: number): Promise<void> {
  // wagr_ledger isn't yet in the generated supabase types — run
  // `pnpm db:types` after applying migration 20260617120000 to remove
  // this cast. Until then, the schema is correct on the DB side; we just
  // bypass the type check at the call.
  const ledger = (
    supabase as unknown as {
      from(table: 'wagr_ledger'): {
        insert(row: WagrLedgerInsert): Promise<{ error: { message: string } | null }>
      }
    }
  ).from('wagr_ledger')

  const { error } = await ledger.insert({
    advance_request_id: advanceRequestId,
    fee_amount: feeCedis,
  })
  if (error) {
    // Don't throw — the disbursement already succeeded. Loud log + future
    // reconciliation will catch missing ledger rows.
    logger.error({ err: error, advanceRequestId, feeCedis }, 'wagr_ledger insert failed')
  }
}

function pesewasToCedis(pesewas: MoneyPesewas): number {
  return roundCedis(pesewas / PESEWAS_PER_CEDI)
}

function cedisToPesewas(cedis: number): MoneyPesewas {
  return Math.round(cedis * PESEWAS_PER_CEDI) as MoneyPesewas
}

function roundCedis(value: number): number {
  // numeric(12,2) — keep two decimal places exact to avoid drift on repeated
  // float arithmetic.
  return Math.round(value * 100) / 100
}

// Supabase's PostgREST join returns the related row as either an object or
// a single-element array depending on the relationship cardinality.
// employees!inner gives us exactly one row but the generated type widens to
// the union — narrow defensively.
function extractMomo(joined: { momo_number: string } | { momo_number: string }[]): string {
  return Array.isArray(joined) ? (joined[0]?.momo_number ?? '') : joined.momo_number
}
