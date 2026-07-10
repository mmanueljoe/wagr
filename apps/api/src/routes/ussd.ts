import { ussdCallbackSchema } from '@wagr/types'
import { Router } from 'express'
import { ussdCallbackHandler } from '../controllers/ussd-controller'
import { ussdErrorHandler } from '../middleware/ussd-error-handler'
import { validateBody } from '../middleware/validate'

export const ussdRouter: Router = Router()

ussdRouter.post('/ussd', validateBody(ussdCallbackSchema), ussdCallbackHandler)
// Router-scoped error handler — catches everything /ussd throws (including
// validation failures) before the global JSON error handler can reply with
// a shape Moolre doesn't understand.
ussdRouter.use(ussdErrorHandler)
