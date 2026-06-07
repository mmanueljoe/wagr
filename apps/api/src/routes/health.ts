import { Router } from 'express'

export const healthRouter: Router = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// /ready performs no real dependency checks yet. Supabase and Redis checks land with
// [db-schema] and [redis-setup]. Until then this only confirms the process is alive
// and the env loaded successfully (the env module throws at boot if anything is missing).
healthRouter.get('/ready', (_req, res) => {
  res.json({ status: 'ready', checks: { env: 'ok' } })
})
