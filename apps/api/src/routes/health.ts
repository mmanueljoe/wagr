import { Router } from 'express'
import { logger } from '../lib/logger'
import { pingRedis } from '../lib/redis'

export const healthRouter: Router = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// /ready checks live dependencies. Supabase check lands when the first route
// needs it; for now only Redis is pinged.
healthRouter.get('/ready', async (_req, res) => {
  let redisOk = false
  try {
    redisOk = await pingRedis()
  } catch (err) {
    logger.warn({ err }, 'redis ping failed')
  }

  const status = redisOk ? 'ready' : 'degraded'
  res.status(redisOk ? 200 : 503).json({
    status,
    checks: { env: 'ok', redis: redisOk ? 'ok' : 'fail' },
  })
})
