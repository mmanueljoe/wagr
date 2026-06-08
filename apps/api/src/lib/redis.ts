import { Redis } from '@upstash/redis'
import { env } from './env'

// Single shared Upstash client. Used for USSD session state (per
// [ussd-session-handler]) and any other short-lived key/value needs.
export const redis = new Redis({
  url: env.UPSTASH_REDIS_URL,
  token: env.UPSTASH_REDIS_TOKEN,
})

export async function pingRedis(): Promise<boolean> {
  const reply = await redis.ping()
  return reply === 'PONG'
}
