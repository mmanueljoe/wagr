import type { MoneyPesewas } from '@wagr/types'
import { AppError } from '../errors/app-error'
import { audit } from '../lib/audit'
import { env } from '../lib/env'
import { logger } from '../lib/logger'
import { generatePaymentLink } from '../lib/moolre'
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

// Float funding is the money-in side of Wagr's loop. The employer visits
// a Moolre-hosted checkout page, pays from their MoMo, Moolre receives
// the money into Wagr's Moolre wallet, and we increment their
// `float_balance` in our DB via webhook.
//
// The hosted-checkout pattern means Wagr never touches the employer's
// MoMo number, OTP, or PIN — Moolre owns that UX end to end. See
// docs/architecture/moolre-api-reference.md (Payments API → Payment Link).
//
// Two entry points:
//   - initiateFloatTopUp: creates the top-up row, generates the Moolre
//     checkout link, returns it for the client to redirect to.
//   - completeFloatTopUp: called from the /webhooks/moolre handler when
//     Moolre confirms terminal status.

const PESEWAS_PER_CEDI = 100

// Minutes the Moolre-hosted checkout link stays valid. Long enough that
// an employer with a slow MoMo experience doesn't get bumped; short
// enough that a stale link can't be replayed later.
const PAYMENT_LINK_EXPIRATION_MINUTES = 15

export interface InitiateFloatTopUpInput {
  employerId: string
  amountPesewas: MoneyPesewas
}

export interface InitiatedTopUp {
  id: string
  externalRef: string
  amountCedis: number
  // Moolre-hosted checkout URL. Client redirects the employer's browser
  // to this URL; Moolre handles the rest of the payment UX.
  authorizationUrl: string
}

export interface FloatStatus {
  balancePesewas: MoneyPesewas
  hasPendingTopUp: boolean
}

export async function getFloatStatus(employerId: string): Promise<FloatStatus> {
  const { data: employer, error: empErr } = await looseDb
    .from('employers')
    .select('float_balance')
    .eq('id', employerId)
    .maybeSingle()

  if (empErr || !employer) {
    throw new AppError('EMPLOYER_NOT_FOUND', 404, 'Employer not found')
  }

  const pendingCountResult = await looseDb
    .from('float_top_ups')
    .select('id', { count: 'exact', head: true })
    .eq('employer_id', employerId)
    .eq('status', 'pending')

  if (pendingCountResult.error) {
    logger.warn(
      { err: pendingCountResult.error, employerId },
      'failed to count pending float top-ups',
    )
  }

  return {
    balancePesewas: cedisToPesewas(employer.float_balance),
    hasPendingTopUp: (pendingCountResult.count ?? 0) > 0,
  }
}

export async function initiateFloatTopUp(input: InitiateFloatTopUpInput): Promise<InitiatedTopUp> {
  const amountCedis = pesewasToCedis(input.amountPesewas)
  if (amountCedis <= 0) {
    throw new AppError('INVALID_AMOUNT', 400, 'Top-up amount must be greater than zero')
  }

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

  const redirectUrl = `${env.WEB_URL}/dashboard?topup=${data.id}`

  let link: Awaited<ReturnType<typeof generatePaymentLink>>
  try {
    link = await generatePaymentLink({
      amountCedis,
      email: env.WAGR_BUSINESS_EMAIL,
      externalRef,
      redirectUrl,
      expirationMinutes: PAYMENT_LINK_EXPIRATION_MINUTES,
      metadata: { top_up_id: data.id, employer_id: input.employerId },
    })
  } catch (err) {
    // Roll the row to failed so the webhook (if it ever fires) can't double-process.
    logger.error(
      { err, topUpId: data.id, employerId: input.employerId },
      'moolre payment link generation failed — marking top-up failed',
    )
    await looseDb
      .from('float_top_ups')
      .update({
        status: 'failed',
        failure_reason: 'Moolre payment link generation failed',
      })
      .eq('id', data.id)
    throw new AppError('MOOLRE_PAYMENT_FAILED', 502, 'Could not start float top-up with Moolre')
  }

  logger.info(
    { topUpId: data.id, employerId: input.employerId, amountCedis, externalRef },
    'moolre payment link generated — redirecting employer to hosted checkout',
  )

  await audit({
    action: 'float_funding_initiated',
    actor: 'employer',
    employerId: input.employerId,
    metadata: {
      float_top_up_id: data.id,
      amount: amountCedis,
    },
  })

  return { id: data.id, externalRef, amountCedis, authorizationUrl: link.authorizationUrl }
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
