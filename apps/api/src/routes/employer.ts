import { setFundingModelSchema } from '@wagr/types'
import { Router } from 'express'
import { setFundingModelHandler } from '../controllers/employer-controller'
import { requireAuth } from '../middleware/require-auth'
import { validateBody } from '../middleware/validate'

export const employerRouter: Router = Router()

employerRouter.patch(
  '/employer/funding-model',
  requireAuth,
  validateBody(setFundingModelSchema),
  setFundingModelHandler,
)
