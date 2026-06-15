import type { UssdSession } from '@wagr/types'
import { redis } from './redis'

// TTL matches the spec — Moolre USSD sessions die after 120s of inactivity,
// so the Redis key gracefully expires alongside the carrier's session.
const SESSION_TTL_SECONDS = 120
const keyFor = (sessionId: string) => `ussd:session:${sessionId}`

export async function getSession(sessionId: string): Promise<UssdSession | null> {
  return (await redis.get<UssdSession>(keyFor(sessionId))) ?? null
}

export async function setSession(sessionId: string, value: UssdSession): Promise<void> {
  await redis.set(keyFor(sessionId), value, { ex: SESSION_TTL_SECONDS })
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(keyFor(sessionId))
}
