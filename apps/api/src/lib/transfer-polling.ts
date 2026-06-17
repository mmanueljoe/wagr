import { markAdvanceDisbursed, markAdvanceFailed } from '../services/advance-service'
import { logger } from './logger'
import { getTransferStatus } from './moolre'

// Moolre's Transfers API doesn't webhook — we poll Transfer Status until
// terminal. See docs/architecture/moolre-api-reference.md and the
// disbursement spec.
//
// txstatus codes:
//   0 = Pending  (non-terminal, keep polling)
//   1 = Successful (terminal)
//   2 = Failed   (terminal)
//   3 = Unknown  (non-terminal, keep polling — Moolre explicitly warns
//                 never to treat this as failure)

const DEFAULT_INTERVAL_MS = 5_000
const DEFAULT_MAX_ATTEMPTS = 24 // 24 × 5s = 2 minutes

export interface PollOptions {
  intervalMs?: number
  maxAttempts?: number
  // Injected for tests — production passes neither.
  sleep?: (ms: number) => Promise<void>
}

// Fire-and-forget from the USSD disburse sideEffect. Resolves when the
// transfer reaches a terminal state, or when the polling budget runs out.
// Never throws — terminal failures and timeouts are logged + DB-updated;
// unexpected errors are caught and logged so an unhandled rejection can't
// crash the process.
export async function pollUntilTerminal(
  advanceRequestId: string,
  externalRef: string,
  options: PollOptions = {},
): Promise<void> {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS
  const sleep = options.sleep ?? defaultSleep

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const status = await getTransferStatus(externalRef)

      if (status.txStatus === 1) {
        await markAdvanceDisbursed(advanceRequestId, status.transactionId)
        logger.info({ advanceRequestId, attempt }, 'advance disbursed')
        return
      }
      if (status.txStatus === 2) {
        await markAdvanceFailed(
          advanceRequestId,
          status.failureReason ?? 'Moolre reported the transfer as failed',
        )
        logger.warn({ advanceRequestId, attempt }, 'advance failed at moolre')
        return
      }
      // txStatus 0 (Pending) or 3 (Unknown) — keep polling.
    } catch (err) {
      // Don't kill the poll loop on a transient Moolre/DB hiccup. The next
      // attempt will retry — we have 2 minutes of budget.
      logger.warn({ err, advanceRequestId, attempt }, 'transfer status poll attempt failed')
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs)
    }
  }

  // Out of budget without a terminal state. Per the spec, do NOT mark the
  // advance failed — we don't know that it failed. Alert the team instead
  // and leave the row in pending for manual reconciliation.
  logger.error(
    { advanceRequestId, externalRef, maxAttempts },
    'advance polling exhausted budget without terminal state — manual reconciliation needed',
  )
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
