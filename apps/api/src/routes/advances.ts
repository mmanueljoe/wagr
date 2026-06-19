import { Router } from 'express'
import {
  getDashboardSummaryHandler,
  listAdvancesHandler,
  listRecentAdvancesHandler,
  retryAdvanceHandler,
} from '../controllers/advances-controller'
import { requireAuth } from '../middleware/require-auth'

export const advancesRouter: Router = Router()

advancesRouter.get('/advances', requireAuth, listRecentAdvancesHandler)
advancesRouter.get('/advances/all', requireAuth, listAdvancesHandler)
advancesRouter.post('/advances/:id/retry', requireAuth, retryAdvanceHandler)
advancesRouter.get('/dashboard/summary', requireAuth, getDashboardSummaryHandler)
