import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      res.status(400).json({
        error: {
          code: 'INVALID_BODY',
          message: firstIssue
            ? `${firstIssue.path.join('.')}: ${firstIssue.message}`
            : 'Invalid request body',
        },
      })
      return
    }
    req.body = parsed.data
    next()
  }
}
