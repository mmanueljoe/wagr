import { redis } from './redis'

// Stub. The real session shape and flow lands with [ussd-session-handler].
// Kept here so the Redis wiring has at least one named caller and the
// key-naming convention is set early.

const SESSION_TTL_SECONDS = 120
const keyFor = (sessionId: string) => `ussd:session:${sessionId}`

export async function getSession<T>(sessionId: string): Promise<T | null> {
  return (await redis.get<T>(keyFor(sessionId))) ?? null
}

export async function setSession<T>(sessionId: string, value: T): Promise<void> {
  await redis.set(keyFor(sessionId), value, { ex: SESSION_TTL_SECONDS })
}

export async function deleteSession(sessionId: string): Promise<void> {
  await redis.del(keyFor(sessionId))
}
