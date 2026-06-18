import { EMPLOYEE_NETWORKS, type EmployeeNetwork, type MoneyPesewas } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { initiatePayment } from '../lib/moolre'
import { supabase } from '../lib/supabase'
import { notifyFloatFunded, notifyFloatFundingFailed } from './notification-service'

// Loose-typed supabase client. float_top_ups isn't in the generated
// supabase types (migration 20260618120000), and employers has new
// momo_number/network columns (migration 20260618120100). After applying
// both migrations and running `pnpm db:types`, this cast can be removed
// and direct supabase.from('...') calls used everywhere. Schema is correct
// on the DB side regardless — this is purely a typecheck workaround.
//
// biome-ignore lint/suspicious/noExplicitAny: pending supabase types regen
const looseDb: any = supabase

// Float funding is the money-in side of Wagr's loop. The employer's own
// MoMo wallet is debited (via Moolre Payments), the equivalent lands in
// Wagr's Moolre wallet, and we increment their `float_balance` in our DB.
//
// Status delivery is via webhook (not polling) — Moolre's Payments API
// pattern. So this file's two entry points are:
//   - initiateFloatTopUp: called from the dashboard "Fund Float" flow.
//   - completeFloatTopUp: called from the /webhooks/moolre handler when
//     Moolre confirms terminal status.

const PESEWAS_PER_CEDI = 100

export interface InitiateFloatTopUpInput {
  employerId: string
  amountPesewas: MoneyPesewas
  // First-time MoMo setup: when the employer's `momo_number` / `network`
  // rows haven't been set yet (added in migration 20260618120100), the
  // Fund Float dialog asks for them and passes them here. We persist to
  // the employer row alongside the top-up so future Fund Float clicks
  // don't ask again.
  momoNumber?: string
  network?: string
}

export interface InitiatedTopUp {
  id: string
  externalRef: string
  amountCedis: number
}

export async function initiateFloatTopUp(input: InitiateFloatTopUpInput): Promise<InitiatedTopUp> {
  const amountCedis = pesewasToCedis(input.amountPesewas)
  if (amountCedis <= 0) {
    throw new AppError('INVALID_AMOUNT', 400, 'Top-up amount must be greater than zero')
  }

  const { momoNumber, network } = await ensureEmployerMomoDetails(input.employerId, {
    ...(input.momoNumber ? { momoNumber: input.momoNumber } : {}),
    ...(input.network ? { network: input.network } : {}),
  })

  const externalRef = `wagr-float-${input.employerId}-${Date.now()}`

  const { data, error } = await looseDb
    .from('float_top_ups')
    .insert({
      employer_id: input.employerId,
      amount: amountCedis,
      status: 'pending',
      moolre_external_ref: externalRef,
    })
    .select('id')
    .single()

  if (error || !data) {
    logger.error({ err: error, employerId: input.employerId }, 'float_top_ups insert failed')
    throw new AppError('FLOAT_TOPUP_CREATE_FAILED', 500, 'Could not create float top-up')
  }

  try {
    await initiatePayment({
      amount: amountCedis,
      payer: momoNumber,
      network,
      externalRef,
    })
  } catch (err) {
    // Roll the row to failed so the webhook (if it ever fires) can't double-process.
    logger.error(
      { err, topUpId: data.id, employerId: input.employerId },
      'moolre initiate payment failed — marking top-up failed',
    )
    await looseDb
      .from('float_top_ups')
      .update({
        status: 'failed',
        failure_reason: 'Moolre initiate payment call failed',
      })
      .eq('id', data.id)
    throw new AppError('MOOLRE_PAYMENT_FAILED', 502, 'Could not start float top-up with Moolre')
  }

  await audit({
    action: 'float_funding_initiated',
    actor: 'employer',
    employerId: input.employerId,
    metadata: {
      float_top_up_id: data.id,
      amount: amountCedis,
    },
  })

  return { id: data.id, externalRef, amountCedis }
}

export interface CompleteFloatTopUpInput {
  externalRef: string
  txStatus: 1 | 2
  moolreTransactionId?: string
  failureReason?: string
}

export async function completeFloatTopUp(input: CompleteFloatTopUpInput): Promise<void> {
  const { data: row, error: readErr } = await looseDb
    .from('float_top_ups')
    .select('id, employer_id, amount, status')
    .eq('moolre_external_ref', input.externalRef)
    .maybeSingle()

  if (readErr) {
    logger.error({ err: readErr, externalRef: input.externalRef }, 'float_top_ups lookup failed')
    throw new AppError('FLOAT_TOPUP_LOOKUP_FAILED', 500, 'Could not load float top-up')
  }
  if (!row) {
    logger.warn({ externalRef: input.externalRef }, 'webhook for unknown float top-up')
    return
  }
  if (row.status !== 'pending') {
    // Idempotency — Moolre may retry webhooks. Already-terminal rows are
    // safe to ignore.
    logger.info(
      { externalRef: input.externalRef, status: row.status },
      'webhook for already-terminal float top-up; ignoring',
    )
    return
  }

  if (input.txStatus === 1) {
    await markTopUpSucceeded(row.id, row.employer_id, row.amount, input.moolreTransactionId)
  } else {
    await markTopUpFailed(row.id, row.employer_id, row.amount, input.failureReason ?? 'Unknown')
  }
}

// ─── Internals ───────────────────────────────────────────────────────────

interface EmployerMomoDetails {
  momoNumber: string
  network: 'mtn' | 'telecel' | 'at'
}

async function ensureEmployerMomoDetails(
  employerId: string,
  override: { momoNumber?: string; network?: string },
): Promise<EmployerMomoDetails> {
  const { data: employer, error } = await looseDb
    .from('employers')
    .select('momo_number, network, phone')
    .eq('id', employerId)
    .maybeSingle()

  if (error || !employer) {
    throw new AppError('EMPLOYER_NOT_FOUND', 404, 'Employer not found')
  }

  // Columns added in migration 20260618120100 — once `pnpm db:types` runs
  // we can drop this manual shape.
  const stored = employer as {
    momo_number: string | null
    network: string | null
    phone: string
  }

  // Prefer override (explicit input from the dialog) when stored is null.
  const momoNumberRaw = stored.momo_number ?? override.momoNumber
  const networkRaw = stored.network ?? override.network

  if (!momoNumberRaw) {
    throw new AppError(
      'MOMO_DETAILS_REQUIRED',
      400,
      'MoMo number is required for float funding. Add it in the dialog.',
    )
  }
  if (!/^[0-9]{10}$/.test(momoNumberRaw)) {
    throw new AppError(
      'INVALID_MOMO_NUMBER',
      400,
      'MoMo number must be 10 digits in local format, e.g. 0241235993',
    )
  }
  if (!networkRaw || !isEmployeeNetwork(networkRaw)) {
    throw new AppError(
      'INVALID_NETWORK',
      400,
      'Network is required and must be one of: mtn, telecel, at',
    )
  }

  // Persist if newly provided. Best-effort — top-up still proceeds even if
  // the save fails, since we already have the values in memory for the
  // Moolre call.
  if (!stored.momo_number || !stored.network) {
    const { error: saveErr } = await looseDb
      .from('employers')
      .update({ momo_number: momoNumberRaw, network: networkRaw })
      .eq('id', employerId)
    if (saveErr) {
      logger.warn({ err: saveErr, employerId }, 'failed to persist employer momo details')
    }
  }

  return { momoNumber: momoNumberRaw, network: networkRaw }
}

function isEmployeeNetwork(value: string): value is EmployeeNetwork {
  return (EMPLOYEE_NETWORKS as readonly string[]).includes(value)
}

async function markTopUpSucceeded(
  topUpId: string,
  employerId: string,
  amountCedis: number,
  moolreTransactionId: string | undefined,
): Promise<void> {
  const { error: updateErr } = await looseDb
    .from('float_top_ups')
    .update({
      status: 'succeeded',
      completed_at: new Date().toISOString(),
      moolre_transaction_id: moolreTransactionId ?? null,
    })
    .eq('id', topUpId)

  if (updateErr) {
    logger.error({ err: updateErr, topUpId }, 'failed to mark top-up succeeded')
    throw new AppError('FLOAT_TOPUP_UPDATE_FAILED', 500, 'Could not update float top-up')
  }

  await creditEmployerFloat(employerId, amountCedis)

  const phone = await getEmployerPhone(employerId)

  await audit({
    action: 'float_funded',
    actor: 'employer',
    employerId,
    metadata: { float_top_up_id: topUpId, amount: amountCedis },
  })

  if (phone) {
    await notifyFloatFunded({ phone, amountPesewas: cedisToPesewas(amountCedis) })
  }
}

async function markTopUpFailed(
  topUpId: string,
  employerId: string,
  amountCedis: number,
  failureReason: string,
): Promise<void> {
  const { error } = await looseDb
    .from('float_top_ups')
    .update({
      status: 'failed',
      failure_reason: failureReason.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq('id', topUpId)

  if (error) {
    logger.error({ err: error, topUpId }, 'failed to mark top-up failed')
    throw new AppError('FLOAT_TOPUP_UPDATE_FAILED', 500, 'Could not update float top-up')
  }

  const phone = await getEmployerPhone(employerId)

  await audit({
    action: 'float_funding_failed',
    actor: 'employer',
    employerId,
    metadata: {
      float_top_up_id: topUpId,
      amount: amountCedis,
      failure_reason: failureReason.slice(0, 500),
    },
  })

  if (phone) {
    await notifyFloatFundingFailed({ phone, amountPesewas: cedisToPesewas(amountCedis) })
  }
}

async function creditEmployerFloat(employerId: string, amountCedis: number): Promise<void> {
  const { data: emp, error: readErr } = await supabase
    .from('employers')
    .select('float_balance')
    .eq('id', employerId)
    .single()

  if (readErr || !emp) {
    throw new AppError('FLOAT_READ_FAILED', 500, 'Could not read float balance')
  }
  const next = roundCedis(emp.float_balance + amountCedis)
  const { error } = await supabase
    .from('employers')
    .update({ float_balance: next })
    .eq('id', employerId)
  if (error) {
    throw new AppError('FLOAT_CREDIT_FAILED', 500, 'Could not credit float balance')
  }
}

async function getEmployerPhone(employerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('employers')
    .select('phone')
    .eq('id', employerId)
    .maybeSingle()
  if (error || !data) return null
  return data.phone
}

function pesewasToCedis(pesewas: MoneyPesewas): number {
  return roundCedis(pesewas / PESEWAS_PER_CEDI)
}

function cedisToPesewas(cedis: number): MoneyPesewas {
  return Math.round(cedis * PESEWAS_PER_CEDI) as MoneyPesewas
}

function roundCedis(value: number): number {
  return Math.round(value * 100) / 100
}
