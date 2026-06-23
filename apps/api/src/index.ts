import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { startReconciler } from './lib/advance-reconciler'
import { env } from './lib/env'
import { logger } from './lib/logger'
import { errorHandler } from './middleware/error-handler'
import { advancesRouter } from './routes/advances'
import { authRouter } from './routes/auth'
import { dashboardRouter } from './routes/dashboard'
import { employeesRouter } from './routes/employees'
import { floatRouter } from './routes/float'
import { healthRouter } from './routes/health'
import { periodCloseRouter } from './routes/period-close'
import { ussdRouter } from './routes/ussd'
import { webhooksRouter } from './routes/webhooks'

const app = express()

app.disable('x-powered-by')
// CORS must include credentials so the browser sends our session cookie.
app.use(cors({ origin: env.WEB_URL, credentials: true }))
// Moolre's USSD service POSTs a JSON body but advertises it as
// `application/x-www-form-urlencoded` in the Content-Type header — their bug.
// We force JSON parsing on /ussd regardless of the header so the body parses
// correctly. This route-scoped parser MUST run before the global body
// parsers; once one of them consumes the body stream the next can't read it.
app.use('/ussd', express.json({ type: '*/*', limit: '1mb' }))

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))
app.use(cookieParser())

app.use(healthRouter)
app.use(authRouter)
app.use(employeesRouter)
app.use(advancesRouter)
app.use(floatRouter)
app.use(dashboardRouter)
app.use(periodCloseRouter)
app.use(ussdRouter)
app.use(webhooksRouter)

app.use(errorHandler)

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'wagr api listening')

  // Periodically resolve advances stuck at 'pending' because Moolre never
  // returned a terminal status during the initial polling window. See
  // lib/advance-reconciler.ts for the lifecycle this owns. Skipped in test
  // env so unit tests don't fire it.
  if (env.NODE_ENV !== 'test') {
    startReconciler()
  }
})
