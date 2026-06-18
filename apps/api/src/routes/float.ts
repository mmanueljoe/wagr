import { fundFloatSchema } from '@wagr/types'
import { Router } from 'express'
import { fundFloatHandler } from '../controllers/float-controller'
import { requireAuth } from '../middleware/require-auth'
import { validateBody } from '../middleware/validate'

export const floatRouter: Router = Router()

floatRouter.post('/float/fund', requireAuth, validateBody(fundFloatSchema), fundFloatHandler)
