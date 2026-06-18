import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { env } from './lib/env'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { authRouter } from './routes/auth'
import { employeesRouter } from './routes/employees'
import { floatRouter } from './routes/float'
import { healthRouter } from './routes/health'
import { ussdRouter } from './routes/ussd'
import { webhooksRouter } from './routes/webhooks'

const app = express()

app.disable('x-powered-by')
// CORS must include credentials so the browser sends our session cookie.
app.use(cors({ origin: env.WEB_URL, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use(healthRouter)
app.use(authRouter)
app.use(employeesRouter)
app.use(floatRouter)
app.use(ussdRouter)
app.use(webhooksRouter)

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'wagr api listening')
})
