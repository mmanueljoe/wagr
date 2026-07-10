import { fundFloatSchema } from '@wagr/types'
import { Router } from 'express'
import { fundFloatHandler, getFloatStatusHandler } from '../controllers/float-controller'
import { requireAuth } from '../middleware/require-auth'
import { validateBody } from '../middleware/validate'

export const floatRouter: Router = Router()

floatRouter.get('/float', requireAuth, getFloatStatusHandler)
floatRouter.post('/float/fund', requireAuth, validateBody(fundFloatSchema), fundFloatHandler)
