import { Router } from 'express'
import { listAdvancesHandler, retryAdvanceHandler } from '../controllers/advance-controller'
import { requireAuth } from '../middleware/require-auth'

export const advancesRouter: Router = Router()

advancesRouter.get('/advances', requireAuth, listAdvancesHandler)
advancesRouter.post('/advances/:id/retry', requireAuth, retryAdvanceHandler)
