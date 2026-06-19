import { Router } from 'express'
import { listAdvancesHandler } from '../controllers/advance-controller'
import { requireAuth } from '../middleware/require-auth'

export const advancesRouter: Router = Router()

advancesRouter.get('/advances', requireAuth, listAdvancesHandler)
