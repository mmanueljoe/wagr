import { Router } from 'express'
import { summaryHandler } from '../controllers/dashboard-controller'
import { requireAuth } from '../middleware/require-auth'

export const dashboardRouter: Router = Router()

dashboardRouter.get('/dashboard/summary', requireAuth, summaryHandler)
