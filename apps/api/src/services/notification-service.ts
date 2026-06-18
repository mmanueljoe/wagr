import { type MoneyPesewas, formatGhs } from '@wagr/types'
import { logger } from '../lib/logger'
import { sendSms } from '../lib/moolre'

// All worker-facing notifications go through this module. Format here,
// call Moolre underneath, swallow + log delivery failures. See
// docs/specs/feature-notifications.md.
//
// Failure policy: SMS delivery is best-effort. A failed SMS NEVER blocks
// or reverses the advance — the spec is explicit. We log loud so ops can
// see undelivered notifications, but we never throw to the caller.

export interface AdvanceRequestedInput {
  momoNumber: string
  requestedPesewas: MoneyPesewas
}

export interface AdvanceDisbursedInput {
  momoNumber: string
  netPesewas: MoneyPesewas
}

export interface AdvanceFailedInput {
  momoNumber: string
}

export async function notifyAdvanceRequested(input: AdvanceRequestedInput): Promise<void> {
  const message = `Your Wagr advance request of ${formatGhs(input.requestedPesewas)} has been received. You will be notified when it is sent.`
  await safeSend(input.momoNumber, message, 'advance_requested')
}

export async function notifyAdvanceDisbursed(input: AdvanceDisbursedInput): Promise<void> {
  const message = `${formatGhs(input.netPesewas)} has been sent to your MoMo. Wagr — Don't wait for payday.`
  await safeSend(input.momoNumber, message, 'advance_disbursed')
}

export async function notifyAdvanceFailed(input: AdvanceFailedInput): Promise<void> {
  const message =
    'Your Wagr advance request could not be processed. Contact your employer or try again later.'
  await safeSend(input.momoNumber, message, 'advance_failed')
}

export interface FloatFundedInput {
  phone: string
  amountPesewas: MoneyPesewas
}

export interface FloatFundingFailedInput {
  phone: string
  amountPesewas: MoneyPesewas
}

export async function notifyFloatFunded(input: FloatFundedInput): Promise<void> {
  const message = `Your Wagr float has been funded with ${formatGhs(input.amountPesewas)}. Workers can now request advances.`
  await safeSend(input.phone, message, 'float_funded')
}

export async function notifyFloatFundingFailed(input: FloatFundingFailedInput): Promise<void> {
  const message = `Your Wagr float top-up of ${formatGhs(input.amountPesewas)} could not be processed. Please try again or contact support.`
  await safeSend(input.phone, message, 'float_funding_failed')
}

async function safeSend(to: string, message: string, context: string): Promise<void> {
  try {
    await sendSms({ to, message })
  } catch (err) {
    // SMS delivery is best-effort — never throw upstream. Spec: a failed
    // SMS must not block or reverse the advance.
    logger.error({ err, context }, 'sms notification delivery failed')
  }
}
