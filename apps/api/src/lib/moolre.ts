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
