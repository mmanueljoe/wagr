import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      const path = firstIssue?.path.join('.')
      const message = firstIssue
        ? path
          ? `${path}: ${firstIssue.message}`
          : firstIssue.message
        : 'Invalid request body'

      logger.warn(
        {
          path: req.path,
          contentType: req.headers['content-type'],
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : null,
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        'request body validation failed',
      )

      throw new AppError('INVALID_BODY', 400, message)
    }
    req.body = parsed.data
    next()
  }
}
