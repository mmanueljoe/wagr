import { markAdvanceDisbursed, markAdvanceFailed } from '../services/advance-service'
import { env } from './env'
import { reconcileStuckTopUps } from './float-topup-reconciler'
import { logger } from './logger'
import { getTransferStatus } from './moolre'
import { supabase } from './supabase'

// Background reconciler for advances that the initial polling budget couldn't
// resolve. The initial polling loop (lib/transfer-polling.ts) only tries for
// ~30 seconds — anything still pending after that is stuck. Without this
// reconciler the float would be debited without ever being refunded on
// failure, and the worker would never get an SMS telling them what happened.
//
// Lifecycle this owns:
//   pending → disbursed      when Moolre eventually says terminal-success
//   pending → failed         when Moolre eventually says terminal-failure (refunds float, SMS)
//   pending → failed         after RECONCILER_FORCE_FAIL_AFTER_MS regardless
//                            of Moolre's answer (refunds float, SMS)
//
// Idempotency: markAdvanceDisbursed / markAdvanceFailed both use a
// .eq('status', 'pending') filter on their UPDATE, so re-running on a row
// that's already terminal is a no-op. Safe to call repeatedly.

const STATUS_TERMINAL_SUCCESS = 1
const STATUS_TERMINAL_FAILURE = 2
const FORCE_FAIL_REASON =
  'Reconciler timeout — Moolre did not return a terminal status within the budget window'

interface StuckAdvance {
  id: string
  moolre_external_ref: string
  requested_at: string
}

// One pass. Exported for tests + to allow a manual trigger from an admin
// route later if we want one.
export async function reconcileStuckAdvances(now: Date = new Date()): Promise<void> {
  const stuckBefore = new Date(now.getTime() - env.RECONCILER_STUCK_AFTER_MS).toISOString()
  const forceFailBefore = new Date(now.getTime() - env.RECONCILER_FORCE_FAIL_AFTER_MS).toISOString()

  const { data, error } = await supabase
    .from('advance_requests')
    .select('id, moolre_external_ref, requested_at')
    .eq('status', 'pending')
    .lt('requested_at', stuckBefore)
    .limit(50)

  if (error) {
    logger.error({ err: error }, 'reconciler: failed to list stuck advances')
    return
  }

  const stuck = (data ?? []) as StuckAdvance[]
  if (stuck.length === 0) return

  logger.info({ count: stuck.length }, 'reconciler: processing stuck advances')

  for (const row of stuck) {
    try {
      await resolveOne(row, forceFailBefore)
    } catch (err) {
      // Don't let one bad row break the rest of the batch.
      logger.error({ err, advanceId: row.id }, 'reconciler: error processing advance')
    }
  }
}

async function resolveOne(row: StuckAdvance, forceFailBefore: string): Promise<void> {
  const status = await getTransferStatus(row.moolre_external_ref)

  if (status.txStatus === STATUS_TERMINAL_SUCCESS) {
    await markAdvanceDisbursed(row.id, status.transactionId)
    logger.info({ advanceId: row.id }, 'reconciler: marked disbursed')
    return
  }

  if (status.txStatus === STATUS_TERMINAL_FAILURE) {
    await markAdvanceFailed(row.id, status.failureReason ?? 'Moolre returned terminal failure')
    logger.info({ advanceId: row.id }, 'reconciler: marked failed (moolre terminal)')
    return
  }

  // Non-terminal (0 = pending, 3 = unknown). If the advance has been stuck
  // longer than the force-fail window, give up on Moolre and assume the
  // transfer didn't land. Refund + SMS. Otherwise leave it for the next pass.
  if (row.requested_at < forceFailBefore) {
    await markAdvanceFailed(row.id, FORCE_FAIL_REASON)
    logger.warn({ advanceId: row.id }, 'reconciler: force-failed after timeout window')
  }
}

// Module-level timer so startReconciler is idempotent and stoppable in tests.
let timer: NodeJS.Timeout | null = null

export function startReconciler(): void {
  if (timer) return

  // Run both reconcilers on the same interval. They share the timer and
  // run sequentially each tick — sequential is fine because each is
  // single-table and short. If they ever get heavy we can parallelise.
  const runAll = async () => {
    await reconcileStuckAdvances().catch((err) =>
      logger.error({ err }, 'reconciler: advance pass failed'),
    )
    await reconcileStuckTopUps().catch((err) =>
      logger.error({ err }, 'reconciler: topup pass failed'),
    )
  }

  // Run once on startup to clear anything left over from a prior process,
  // then on the interval. setInterval doesn't catch promise rejections
  // so each invocation is wrapped.
  void runAll()

  timer = setInterval(() => {
    void runAll()
  }, env.RECONCILER_INTERVAL_MS)

  // setInterval's timer keeps the event loop alive — we don't want it
  // blocking process shutdown on Ctrl+C.
  timer.unref()

  logger.info(
    {
      intervalMs: env.RECONCILER_INTERVAL_MS,
      advanceStuckAfterMs: env.RECONCILER_STUCK_AFTER_MS,
      advanceForceFailAfterMs: env.RECONCILER_FORCE_FAIL_AFTER_MS,
      topupStuckAfterMs: env.FLOAT_TOPUP_RECONCILER_STUCK_AFTER_MS,
      topupForceFailAfterMs: env.FLOAT_TOPUP_RECONCILER_FORCE_FAIL_AFTER_MS,
    },
    'reconciler started',
  )
}

export function stopReconciler(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
