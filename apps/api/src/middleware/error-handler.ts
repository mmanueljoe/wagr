import type { ErrorRequestHandler } from 'express'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'

// Single place that turns thrown errors into HTTP responses. AppError
// surfaces its code + statusCode; anything else becomes a 500 INTERNAL so
// we don't leak implementation details to the client.

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isAppError = err instanceof AppError
  const statusCode = isAppError ? err.statusCode : 500
  const code = isAppError ? err.code : 'INTERNAL'
  const message = isAppError ? err.message : 'Unexpected error'

  logger.error(
    {
      err,
      req: { method: req.method, url: req.url },
      statusCode,
      code,
    },
    'request failed',
  )

  res.status(statusCode).json({ error: { code, message } })
}
