import { ussdCallbackSchema } from '@wagr/types'
import { Router } from 'express'
import { ussdCallbackHandler } from '../controllers/ussd-controller'
import { validateBody } from '../middleware/validate'

export const ussdRouter: Router = Router()

ussdRouter.post('/ussd', validateBody(ussdCallbackSchema), ussdCallbackHandler)
