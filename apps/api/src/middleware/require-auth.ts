import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { SESSION_COOKIE_NAME, type SessionData, getSession } from '../lib/session'

declare global {
  namespace Express {
    interface Request {
      user?: SessionData
    }
  }
}

// Reads the opaque session cookie, looks up the session in Redis, attaches
// req.user. Throws AppError on failure — the global error handler decides
// what the client sees.
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
  if (!sessionId) {
    throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  }

  const session = await getSession(sessionId)
  if (!session) {
    throw new AppError('UNAUTHENTICATED', 401, 'Session expired')
  }

  req.user = session
  next()
}
