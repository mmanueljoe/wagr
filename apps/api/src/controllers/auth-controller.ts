import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, destroySession } from '../lib/session'
import { getMe, loginEmployer, registerEmployer } from '../services/auth-service'

// Thin handlers: read req, call service, set cookie if needed, send res.
// Never format error responses inline — throw and let error-handler do it.
// Success responses across all auth endpoints share the same shape: the
// AuthUser object (id, employer_id, email). Logout returns 204 No Content
// because there's no resource to send back.

export async function registerHandler(req: Request, res: Response) {
  const { user, sessionId } = await registerEmployer(req.body)
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS)
  res.status(201).json(user)
}

export async function loginHandler(req: Request, res: Response) {
  const { user, sessionId } = await loginEmployer(req.body)
  res.cookie(SESSION_COOKIE_NAME, sessionId, SESSION_COOKIE_OPTIONS)
  res.status(200).json(user)
}

export async function logoutHandler(req: Request, res: Response) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined
  if (sessionId) await destroySession(sessionId)
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  res.status(204).end()
}

export async function meHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  res.json(await getMe(req.user))
}
