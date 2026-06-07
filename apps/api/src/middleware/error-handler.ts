import type { ErrorRequestHandler } from 'express'
import { logger } from '../lib/logger'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof err?.status === 'number' ? err.status : 500
  const code = typeof err?.code === 'string' ? err.code : 'INTERNAL_ERROR'
  const message = err instanceof Error ? err.message : 'Unexpected error'

  logger.error(
    {
      err,
      req: { method: req.method, url: req.url },
      status,
      code,
    },
    'request failed',
  )

  res.status(status).json({ error: { code, message } })
}
