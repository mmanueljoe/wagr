import { AppError } from '../errors/app-error'
import { env } from './env'
import { logger } from './logger'

// All Moolre HTTP calls live here. Other modules import named functions —
// no other file constructs a Moolre URL. Cross-check shapes against
// docs/architecture/moolre-api-reference.md whenever this file changes.
//
// Different Moolre APIs require different auth headers (see the docs).
// Transfers uses X-API-KEY; Payments uses X-API-PUBKEY; SMS/WhatsApp use
// X-API-VASKEY. This file gates that mapping so callers never get it wrong.

// Canonical internal network value. The DB stores this string; we translate
// to Moolre's integer codes here and never let them leak elsewhere.
export type Network = 'mtn' | 'telecel' | 'at'

// Moolre uses different integer codes for the same network depending on the
// endpoint — easy to get wrong. See docs/architecture/moolre-api-reference.md.
const TRANSFER_CHANNEL: Record<Network, number> = { mtn: 1, telecel: 6, at: 7 }
const PAYMENT_CHANNEL: Record<Network, number> = { mtn: 13, telecel: 6, at: 7 }

const REQUEST_TIMEOUT_MS = 10_000

export interface InitiateTransferInput {
  amount: number // Cedis (not pesewas) — Moolre takes decimal cedis.
  receiver: string // Worker's MoMo number, local format (e.g. 0241235993).
  network: Network
  externalRef: string // Idempotency key — same ref never charges twice.
}

export interface InitiateTransferResult {
  txStatus: TransferStatusCode
  transactionId: string | null // Moolre's internal id, when available.
  externalRef: string
  rawCode: string // Moolre's response code (e.g. TRA01) — used for debugging only.
}

export interface TransferStatusResult {
  txStatus: TransferStatusCode
  transactionId: string | null
  externalRef: string
  failureReason: string | null
}

// Moolre's terminal flags. 1 = success, 2 = failure. 0 (pending) and 3
// (unknown) are NON-terminal — keep polling. The polling loop trusts this
// mapping; never coerce 0/3 to "failed" anywhere.
export type TransferStatusCode = 0 | 1 | 2 | 3

// ── Initiate Transfer ────────────────────────────────────────────────────

// POST /open/transact/transfer with X-API-KEY.
// Returns Moolre's initial acknowledgement — usually pending (0) at this
// stage. Poll Transfer Status for the terminal state.
//
// We pass `accountnumber` = MOOLRE_ACCOUNT_NUMBER (Wagr's wallet, debited).
export async function initiateTransfer(
  input: InitiateTransferInput,
): Promise<InitiateTransferResult> {
  const body = {
    type: 1,
    channel: TRANSFER_CHANNEL[input.network],
    currency: 'GHS',
    amount: input.amount.toFixed(2),
    receiver: input.receiver,
    externalref: input.externalRef,
    accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
  }

  const response = await postJson('/open/transact/transfer', body, {
    'X-API-KEY': env.MOOLRE_API_KEY,
  })

  // Moolre's standard envelope: { status, code, message, data, go }.
  // We rely on `data.txstatus` for the workflow; `code` is just for logs.
  const txStatus = parseTxStatus(response.data?.txstatus)
  return {
    txStatus,
    transactionId: parseTransactionId(response.data?.transactionid),
    externalRef: input.externalRef,
    rawCode: typeof response.code === 'string' ? response.code : 'UNKNOWN',
  }
}

// ── Transfer Status (polling) ────────────────────────────────────────────

// POST /open/transact/status with X-API-KEY. Looks up by externalref.
// Returns the current Moolre-side status — keep polling until 1 or 2.
//
// Per Moolre's docs, txstatus 3 (Unknown) is NOT a failure. The polling
// loop must never coerce it to failed.
export async function getTransferStatus(externalRef: string): Promise<TransferStatusResult> {
  const body = {
    type: 1,
    externalref: externalRef,
    accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
  }

  const response = await postJson('/open/transact/status', body, {
    'X-API-KEY': env.MOOLRE_API_KEY,
  })

  return {
    txStatus: parseTxStatus(response.data?.txstatus),
    transactionId: parseTransactionId(response.data?.transactionid),
    externalRef,
    failureReason: typeof response.message === 'string' ? response.message : null,
  }
}

// ── Initiate Payment (Collections / float funding + payday recovery) ─────

export interface InitiatePaymentInput {
  amount: number // Cedis.
  payer: string // Employer's MoMo number (local format, e.g. 0241235993).
  network: Network
  externalRef: string // Idempotency key — same ref never charges twice.
}

// Moolre Payments has a 3-step OTP flow before the actual MoMo PIN prompt:
//   1. Initial call (no otpcode)            → code TP14 / 200_OTP_REQ
//        Moolre SMSes an OTP to the payer.
//   2. Resubmit with the otpcode field      → code 200_OTP_SUCCESS
//   3. Final call (no otpcode again)        → code 200_PAYMENT_REQ
//        Moolre actually sends the MoMo PIN prompt.
//
// `acknowledged` (HTTP-level success) is true for all three — the `code`
// field is what tells us which stage we're at. Some merchants get the OTP
// step removed by Moolre (see docs); when that happens the initial call
// returns 200_PAYMENT_REQ directly and the two extra steps don't fire.
// See docs/architecture/moolre-api-reference.md (Payment API → OTP flow).
export type PaymentState =
  | 'otp_required' // TP14 / 200_OTP_REQ — Moolre SMS'd an OTP, awaiting payer
  | 'otp_verified' // 200_OTP_SUCCESS — OTP matched, ready to trigger prompt
  | 'prompt_sent' // 200_PAYMENT_REQ — MoMo PIN prompt is on the way
  | 'rejected' // anything else with status !== 1

export interface InitiatePaymentResult {
  state: PaymentState
  // Convenience: true when Moolre HTTP-200'd. Existing callers (period-close)
  // still use this; new OTP flow looks at `state` instead.
  acknowledged: boolean
  rawCode: string
}

export interface InitiatePaymentInputWithOtp extends InitiatePaymentInput {
  // Set only on the second of the three OTP-flow calls. Moolre returns
  // 200_OTP_SUCCESS when this matches the code they SMSed the payer.
  otpcode?: string
}

// POST /open/transact/payment with X-API-PUBKEY. See PaymentState above
// for the three-stage flow.
export async function initiatePayment(
  input: InitiatePaymentInputWithOtp,
): Promise<InitiatePaymentResult> {
  const body = {
    type: 1,
    channel: PAYMENT_CHANNEL[input.network],
    currency: 'GHS',
    payer: input.payer,
    amount: input.amount.toFixed(2),
    externalref: input.externalRef,
    accountnumber: env.MOOLRE_ACCOUNT_NUMBER,
    ...(input.otpcode ? { otpcode: input.otpcode } : {}),
  }

  const response = await postJson('/open/transact/payment', body, {
    'X-API-PUBKEY': env.MOOLRE_API_PUBKEY,
  })

  const rawCode = typeof response.code === 'string' ? response.code : 'UNKNOWN'
  return {
    state: derivePaymentState(response.status === 1, rawCode),
    acknowledged: response.status === 1,
    rawCode,
  }
}

function derivePaymentState(httpOk: boolean, code: string): PaymentState {
  if (!httpOk) return 'rejected'
  // Code formats Moolre uses (per docs at docs.moolre.com/#/initiate-payment):
  //   TP14, 200_OTP_REQ  — OTP needed
  //   200_OTP_SUCCESS    — OTP verified
  //   200_PAYMENT_REQ    — prompt sent
  if (code === 'TP14' || code === '200_OTP_REQ' || code.includes('OTP_REQ')) {
    return 'otp_required'
  }
  if (code === '200_OTP_SUCCESS' || code.includes('OTP_SUCCESS')) {
    return 'otp_verified'
  }
  if (code === '200_PAYMENT_REQ' || code.includes('PAYMENT_REQ')) {
    return 'prompt_sent'
  }
  // Unknown success codes — treat as rejected so we don't silently progress
  // a flow we don't understand. Better to fail loud than swallow money.
  return 'rejected'
}

// ── SMS ──────────────────────────────────────────────────────────────────

export interface SendSmsInput {
  to: string // Recipient phone, local format (e.g. 0241235993).
  message: string
  ref?: string // Optional caller-side reference for delivery tracking.
}

// Approved sender ID, max 11 chars. The sandbox substitutes Moolre's own
// sender ID until ours is approved — see
// docs/architecture/moolre-api-reference.md (SMS API → Sandbox behaviour).
const SMS_SENDER_ID = 'Wagr'

// POST /open/sms/send with X-API-VASKEY (the SMS service's per-instance key).
// Throws AppError on transport/HTTP failures so callers can decide whether
// to swallow (notification flows) or surface (admin tooling).
export async function sendSms(input: SendSmsInput): Promise<void> {
  const body = {
    type: 1,
    senderid: SMS_SENDER_ID,
    messages: [
      {
        recipient: input.to,
        message: input.message,
        ...(input.ref ? { ref: input.ref } : {}),
      },
    ],
  }

  await postJson('/open/sms/send', body, {
    'X-API-VASKEY': env.MOOLRE_SMS_VASKEY,
  })
}

// ── WhatsApp ─────────────────────────────────────────────────────────────

export interface SendWhatsAppTemplateInput {
  to: string // Recipient phone, local format (e.g. 0241235993).
  templateName: string // Meta-approved template name, e.g. 'wagr_advance_summary_v1'.
  language: string // Language code Meta has approved for the template, e.g. 'en'.
  placeholders: string[] // Ordered values for {{1}}..{{N}} in the template body.
  ref?: string // Optional caller-side reference for delivery tracking.
}

// POST /open/whatsapp/send with X-API-VASKEY (the WhatsApp service's per-
// instance key — NOT the SMS one). WhatsApp Business disallows freeform
// outbound messages, so every send goes through a Meta-approved template.
// Throws AppError on transport/HTTP failures — callers in notification flows
// swallow + audit-log so delivery never blocks settlement.
export async function sendWhatsAppTemplate(input: SendWhatsAppTemplateInput): Promise<void> {
  const body = {
    template_name: input.templateName,
    language: input.language,
    messages: [
      {
        recipient: input.to,
        placeholders: input.placeholders,
        ...(input.ref ? { ref: input.ref } : {}),
      },
    ],
  }

  await postJson('/open/whatsapp/send', body, {
    'X-API-VASKEY': env.MOOLRE_WHATSAPP_VASKEY,
  })
}

// ── HTTP layer ───────────────────────────────────────────────────────────

interface MoolreEnvelope {
  status?: number
  code?: string
  message?: string | string[]
  data?: Record<string, unknown> & { txstatus?: unknown; transactionid?: unknown }
  go?: unknown
}

async function postJson(
  path: string,
  body: unknown,
  extraHeaders: Record<string, string>,
): Promise<MoolreEnvelope> {
  const url = `${env.MOOLRE_BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-USER': env.MOOLRE_API_USER,
    ...extraHeaders,
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const json = (await res.json().catch(() => null)) as MoolreEnvelope | null

    if (!res.ok || !json) {
      // Don't log the full body — Moolre responses may include account info.
      // Log the HTTP status + Moolre's code, nothing more.
      logger.error({ path, httpStatus: res.status, moolreCode: json?.code }, 'moolre call failed')
      throw new AppError('MOOLRE_HTTP_FAILED', 502, 'Payment provider request failed')
    }

    if (json.status !== 1) {
      logger.warn({ path, moolreCode: json.code }, 'moolre call returned non-success status')
      // Bubble the envelope so callers can inspect txstatus / code — Moolre
      // sometimes returns status=0 with a 200 OK, particularly for async
      // workflows where the result will arrive later via polling.
    }

    return json
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      logger.error({ path }, 'moolre call timed out')
      throw new AppError('MOOLRE_TIMEOUT', 504, 'Payment provider timed out')
    }
    logger.error({ path, err }, 'moolre call threw unexpectedly')
    throw new AppError('MOOLRE_HTTP_FAILED', 502, 'Payment provider request failed')
  } finally {
    clearTimeout(timeout)
  }
}

function parseTransactionId(raw: unknown): string | null {
  if (typeof raw === 'string') return raw
  if (typeof raw === 'number') return String(raw)
  return null
}

function parseTxStatus(raw: unknown): TransferStatusCode {
  // Moolre sometimes returns this as a number, sometimes as a string. Normalise.
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (n === 0 || n === 1 || n === 2 || n === 3) return n
  // Anything we don't recognise is treated as "unknown" (3) so the polling
  // loop keeps going rather than incorrectly marking it failed.
  return 3
}
