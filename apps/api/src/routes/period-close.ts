import { Router } from 'express'
import { previewHandler, runHandler, statusHandler } from '../controllers/period-close-controller'
import { requireAuth } from '../middleware/require-auth'

export const periodCloseRouter: Router = Router()

periodCloseRouter.get('/period-close/preview', requireAuth, previewHandler)
periodCloseRouter.post('/period-close/run', requireAuth, runHandler)
periodCloseRouter.get('/period-close/status/:id', requireAuth, statusHandler)
