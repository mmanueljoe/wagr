import { type MoneyPesewas, formatGhs } from '@wagr/types'
import { audit } from '../lib/audit'
import { logger } from '../lib/logger'
import { sendSms, sendWhatsAppTemplate } from '../lib/moolre'
import { generateEmployerClosingLine, generatePayslipClosingLine } from '../lib/payslip-gpt'

// WhatsApp templates — both pending Meta approval via the Moolre portal.
// Until approved, live sends will 4xx; nothing else breaks. See
// docs/architecture/moolre-api-reference.md (WhatsApp API → Templates).
const ADVANCE_SUMMARY_TEMPLATE = 'wagr_advance_summary_v1'
const EMPLOYER_SUMMARY_TEMPLATE = 'wagr_employer_summary_v1'
const WHATSAPP_LANGUAGE = 'en'

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

export interface WorkerAdvanceSummaryInput {
  employerId: string
  employeeId: string
  momoNumber: string
  workerFullName: string
  employerName: string
  payPeriodLabel: string // e.g. "June 2026"
  totalAdvancesPesewas: MoneyPesewas
  ref?: string
}

// Sends one worker's advance summary over WhatsApp. Best-effort by design —
// the spec is explicit that delivery failure must not block or reverse the
// repayment. We log + audit each outcome so ops can chase undelivered sends.
export async function sendWorkerAdvanceSummary(input: WorkerAdvanceSummaryInput): Promise<void> {
  const firstName = input.workerFullName.trim().split(/\s+/)[0] ?? input.workerFullName
  const closingLine = await generatePayslipClosingLine({
    workerFirstName: firstName,
    payPeriodLabel: input.payPeriodLabel,
  })

  const placeholders = [
    firstName,
    input.payPeriodLabel,
    input.employerName,
    formatGhs(input.totalAdvancesPesewas),
    closingLine,
  ]

  try {
    await sendWhatsAppTemplate({
      to: input.momoNumber,
      templateName: ADVANCE_SUMMARY_TEMPLATE,
      language: WHATSAPP_LANGUAGE,
      placeholders,
      ...(input.ref ? { ref: input.ref } : {}),
    })
    await audit({
      action: 'whatsapp_summary_sent',
      actor: 'system',
      employerId: input.employerId,
      employeeId: input.employeeId,
      metadata: { template: ADVANCE_SUMMARY_TEMPLATE, ref: input.ref ?? null },
    })
  } catch (err) {
    logger.error(
      { err, employerId: input.employerId, employeeId: input.employeeId },
      'whatsapp advance summary delivery failed',
    )
    await audit({
      action: 'whatsapp_summary_failed',
      actor: 'system',
      employerId: input.employerId,
      employeeId: input.employeeId,
      metadata: {
        template: ADVANCE_SUMMARY_TEMPLATE,
        ref: input.ref ?? null,
        error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
      },
    })
  }
}

export interface EmployerSummaryBreakdownItem {
  workerFirstName: string
  totalAdvancesPesewas: MoneyPesewas
}

export interface EmployerAdvanceSummaryInput {
  employerId: string
  phone: string // WhatsApp recipient — employer's `phone` column.
  employerDisplayName: string // First name of contact OR company short name.
  payPeriodLabel: string
  workerCount: number
  totalRecoveredPesewas: MoneyPesewas
  breakdown: EmployerSummaryBreakdownItem[]
  ref?: string
}

// Sends one summary to the employer over WhatsApp after a period close is
// settled. Best-effort by design — failure never blocks or reverses the
// recovery. Numbers come from the database; the LLM only writes the closing
// line. See docs/specs/feature-notifications.md.
export async function sendEmployerAdvanceSummary(
  input: EmployerAdvanceSummaryInput,
): Promise<void> {
  const closingLine = await generateEmployerClosingLine({
    employerDisplayName: input.employerDisplayName,
    payPeriodLabel: input.payPeriodLabel,
    workerCount: input.workerCount,
  })

  const breakdownText = input.breakdown
    .map((item) => `- ${item.workerFirstName}: ${formatGhs(item.totalAdvancesPesewas)}`)
    .join('\n')

  const placeholders = [
    input.employerDisplayName,
    input.payPeriodLabel,
    String(input.workerCount),
    formatGhs(input.totalRecoveredPesewas),
    breakdownText,
    closingLine,
  ]

  try {
    await sendWhatsAppTemplate({
      to: input.phone,
      templateName: EMPLOYER_SUMMARY_TEMPLATE,
      language: WHATSAPP_LANGUAGE,
      placeholders,
      ...(input.ref ? { ref: input.ref } : {}),
    })
    await audit({
      action: 'whatsapp_summary_sent',
      actor: 'system',
      employerId: input.employerId,
      metadata: { template: EMPLOYER_SUMMARY_TEMPLATE, ref: input.ref ?? null },
    })
  } catch (err) {
    logger.error({ err, employerId: input.employerId }, 'whatsapp employer summary delivery failed')
    await audit({
      action: 'whatsapp_summary_failed',
      actor: 'system',
      employerId: input.employerId,
      metadata: {
        template: EMPLOYER_SUMMARY_TEMPLATE,
        ref: input.ref ?? null,
        error: err instanceof Error ? err.message.slice(0, 200) : 'unknown',
      },
    })
  }
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
