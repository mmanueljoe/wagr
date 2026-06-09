import { loginEmployerSchema, registerEmployerSchema } from '@wagr/types'
import { Router } from 'express'
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
} from '../controllers/auth-controller'
import { requireAuth } from '../middleware/require-auth'
import { validateBody } from '../middleware/validate'

export const authRouter: Router = Router()

authRouter.post('/auth/register', validateBody(registerEmployerSchema), registerHandler)
authRouter.post('/auth/login', validateBody(loginEmployerSchema), loginHandler)
authRouter.post('/auth/logout', logoutHandler)
authRouter.get('/auth/me', requireAuth, meHandler)
