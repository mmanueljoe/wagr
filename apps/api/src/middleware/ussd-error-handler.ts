import type { UssdResponse } from '@wagr/types'
import type { ErrorRequestHandler } from 'express'
import { logger } from '../lib/logger'

// The global error handler returns { error: { code, message } } with a 4xx/5xx
// status — the right shape for the dashboard, a dead-end for USSD. Moolre
// expects { message, reply } with a 200 on every callback response; anything
// else leaves the worker staring at a hung phone screen. So any error on the
// /ussd route (Redis blip, DB error, malformed callback body) ends the
// session with a clean "dial again" message instead.
export const ussdErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // err.message can carry the caller's raw MSISDN (msisdnToLocal throws with
  // the full number in the message), so scrub digit runs before logging.
  const safeErr =
    err instanceof Error
      ? { name: err.name, message: redactMsisdn(err.message), stack: redactMsisdn(err.stack ?? '') }
      : { name: 'unknown', message: redactMsisdn(String(err)) }
  logger.error(
    { err: safeErr, req: { url: req.url } },
    'ussd callback failed — ending session cleanly',
  )
  const response: UssdResponse = { message: 'Session error. Please dial again.', reply: false }
  res.status(200).json(response)
}

function redactMsisdn(text: string): string {
  return text.replace(/\+?\d{9,}/g, '⟨redacted⟩')
}
