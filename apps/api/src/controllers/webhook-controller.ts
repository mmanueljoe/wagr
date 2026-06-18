import type { Request, Response } from 'express'
import { env } from '../lib/env'
import { logger } from '../lib/logger'
import { completeFloatTopUp } from '../services/float-funding-service'

// Moolre POSTs here for Payments status changes (float funding, payday
// recovery — both use the Payments API). Transfers use polling instead;
// see docs/architecture/moolre-api-reference.md.
//
// Authentication is a shared bearer secret inside the payload's `secret`
// field, set when we registered our callback URL via POST /open/account/update.
// We compare to env.MOOLRE_WEBHOOK_SECRET — wrong / missing secret → 401.
//
// Always return 200 on the success branch even when our downstream
// processing fails (logged internally) — Moolre treats non-2xx as "retry"
// and will hammer us if we 500 on a transient DB blip.

interface MoolreWebhookBody {
  data?: {
    secret?: string
    externalref?: string
    txstatus?: number | string
    transactionid?: string
    message?: string
  }
}

export async function moolreWebhookHandler(req: Request, res: Response): Promise<void> {
  const body = req.body as MoolreWebhookBody
  const data = body.data ?? {}

  if (data.secret !== env.MOOLRE_WEBHOOK_SECRET) {
    logger.warn({ externalref: data.externalref }, 'moolre webhook rejected: secret mismatch')
    res.status(401).json({ error: { code: 'INVALID_SECRET', message: 'Invalid webhook secret' } })
    return
  }

  const externalRef = data.externalref
  const txStatus = parseTxStatus(data.txstatus)

  if (!externalRef || (txStatus !== 1 && txStatus !== 2)) {
    // Non-terminal status — Moolre sometimes sends interim updates. Ack and
    // wait for the next call.
    logger.info(
      { externalref: externalRef, txStatus },
      'moolre webhook: non-terminal or unrecognised payload, acking without action',
    )
    res.status(200).json({ received: true })
    return
  }

  // Dispatch by externalref prefix. Float top-ups today; payday recovery
  // will register `wagr-repay-` here when [payday-recovery] lands.
  try {
    if (externalRef.startsWith('wagr-float-')) {
      await completeFloatTopUp({
        externalRef,
        txStatus,
        ...(data.transactionid ? { moolreTransactionId: data.transactionid } : {}),
        ...(typeof data.message === 'string' ? { failureReason: data.message } : {}),
      })
    } else {
      logger.warn(
        { externalref: externalRef },
        'moolre webhook: unrecognised externalref prefix — no handler matched',
      )
    }
  } catch (err) {
    // Log loud but still 200 — Moolre's retry would just re-fire the same
    // body and we'd hit the same problem. Manual reconciliation via the
    // pending row is the recovery path.
    logger.error({ err, externalref: externalRef }, 'moolre webhook handler threw — ignored')
  }

  res.status(200).json({ received: true })
}

function parseTxStatus(raw: unknown): 1 | 2 | null {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (n === 1 || n === 2) return n
  return null
}
