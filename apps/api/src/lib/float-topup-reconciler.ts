import { audit } from './audit'
import { env } from './env'
import { logger } from './logger'
import { supabase } from './supabase'

// Mirrors advance-reconciler but for the money-IN side: employer float
// top-ups via Moolre Payments. The Payments API uses webhooks instead of
// polling, so unlike the advance reconciler we can't proactively ask
// Moolre "what's the status?" — we can only force-fail rows whose webhook
// never arrived within the budget window.
//
// Lifecycle this owns:
//   pending → failed   after FLOAT_TOPUP_RECONCILER_FORCE_FAIL_AFTER_MS
//
// IMPORTANT — money-correctness caveat: if Moolre's webhook arrives AFTER
// we force-fail (rare but possible), the webhook handler in
// controllers/webhook-controller.ts sees the row is already terminal and
// ignores it. If the employer's MoMo was actually charged, the float won't
// reflect it and ops will need to reconcile manually against the Moolre
// dashboard. The failure_reason makes this explicit so support can see it.

const FORCE_FAIL_REASON =
  "Moolre webhook didn't arrive in time. If your MoMo was charged, please contact support — the float wasn't credited automatically."

// float_top_ups not yet in generated supabase types — same workaround the
// service uses. Drop the cast once `pnpm db:types` runs against a fresh DB.
// biome-ignore lint/suspicious/noExplicitAny: pending supabase types regen
const looseDb: any = supabase

interface StuckTopUp {
  id: string
  employer_id: string
  amount: number
  initiated_at: string
  status: 'pending' | 'awaiting_otp'
}

export async function reconcileStuckTopUps(now: Date = new Date()): Promise<void> {
  const stuckBefore = new Date(
    now.getTime() - env.FLOAT_TOPUP_RECONCILER_STUCK_AFTER_MS,
  ).toISOString()
  const forceFailBefore = new Date(
    now.getTime() - env.FLOAT_TOPUP_RECONCILER_FORCE_FAIL_AFTER_MS,
  ).toISOString()

  // Picks up both states that can get stuck:
  //   'pending'      — Moolre's webhook never arrived
  //   'awaiting_otp' — user never entered the OTP we SMSed them
  // Same outcome either way: force-fail past the window.
  const { data, error } = await looseDb
    .from('float_top_ups')
    .select('id, employer_id, amount, initiated_at, status')
    .in('status', ['pending', 'awaiting_otp'])
    .lt('initiated_at', stuckBefore)
    .limit(50)

  if (error) {
    logger.error({ err: error }, 'topup-reconciler: failed to list stuck top-ups')
    return
  }

  const stuck = (data ?? []) as StuckTopUp[]
  if (stuck.length === 0) return

  logger.info({ count: stuck.length }, 'topup-reconciler: processing stuck top-ups')

  for (const row of stuck) {
    try {
      await resolveOne(row, forceFailBefore)
    } catch (err) {
      logger.error({ err, topUpId: row.id }, 'topup-reconciler: error processing row')
    }
  }
}

async function resolveOne(row: StuckTopUp, forceFailBefore: string): Promise<void> {
  // Only act on rows past the force-fail window. Rows that are merely
  // stuck (60s+) but within the window stay alone — the webhook (or the
  // user entering their OTP) might still happen.
  if (row.initiated_at >= forceFailBefore) return

  // The status-guard on the UPDATE prevents racing with the webhook handler
  // or the OTP submit. Either case, if our row already moved, this no-ops.
  const { error } = await looseDb
    .from('float_top_ups')
    .update({ status: 'failed', failure_reason: FORCE_FAIL_REASON })
    .eq('id', row.id)
    .eq('status', row.status)

  if (error) {
    logger.error({ err: error, topUpId: row.id }, 'topup-reconciler: failed to mark top-up failed')
    return
  }

  await audit({
    action: 'float_funding_failed',
    actor: 'system',
    employerId: row.employer_id,
    metadata: {
      float_top_up_id: row.id,
      amount: row.amount,
      failure_reason: FORCE_FAIL_REASON,
    },
  })

  logger.warn(
    { topUpId: row.id, employerId: row.employer_id, amount: row.amount },
    'topup-reconciler: force-failed after timeout window',
  )
}
