import { Router } from 'express'
import {
  getDashboardSummaryHandler,
  listRecentAdvancesHandler,
} from '../controllers/advances-controller'
import { requireAuth } from '../middleware/require-auth'

export const advancesRouter: Router = Router()

advancesRouter.get('/advances', requireAuth, listRecentAdvancesHandler)
advancesRouter.get('/dashboard/summary', requireAuth, getDashboardSummaryHandler)
