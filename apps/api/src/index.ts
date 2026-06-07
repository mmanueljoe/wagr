import express from 'express'
import { env } from './lib/env'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { healthRouter } from './routes/health'

const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.use(healthRouter)

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'wagr api listening')
})
