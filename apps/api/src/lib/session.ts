import { randomUUID } from 'node:crypto'
import { env } from './env'
import { redis } from './redis'

// Session lives in Redis. The browser only ever sees the opaque session ID
// in an HttpOnly cookie — never a Supabase token. See ADR 007 (BFF).
//
// We deliberately do NOT store the Supabase access_token / refresh_token.
// The api talks to Postgres with the service-role key and does its own
// authorization checks (resource.employer_id === session.employer_id).
// Supabase Auth's only job is to verify the password at login.

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days, sliding
const keyFor = (sessionId: string) => `session:${sessionId}`

export interface SessionData {
  user_id: string
  employer_id: string
  email: string
  created_at: number
}

export async function createSession(data: Omit<SessionData, 'created_at'>): Promise<string> {
  const sessionId = randomUUID()
  const value: SessionData = { ...data, created_at: Date.now() }
  await redis.set(keyFor(sessionId), value, { ex: SESSION_TTL_SECONDS })
  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get<SessionData>(keyFor(sessionId))
  if (!data) return null
  // Sliding expiry — every request extends the session by another full TTL.
  // Long-idle sessions still expire; active users don't get logged out.
  await redis.expire(keyFor(sessionId), SESSION_TTL_SECONDS)
  return data
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(keyFor(sessionId))
}

// Cookie config. __Host- prefix means the cookie is only sent to the host
// that set it (no parent-domain leaks). HttpOnly so JS can't read it.
// Secure required by the __Host- prefix; we relax it to plain `wagr-session`
// in dev because http://localhost can't set Secure cookies.
const isProd = env.NODE_ENV === 'production'

export const SESSION_COOKIE_NAME = isProd ? '__Host-wagr-session' : 'wagr-session'

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS * 1000,
}
