import {
  bulkCreateEmployeesSchema,
  createEmployeeSchema,
  setEmployeeActiveSchema,
} from '@wagr/types'
import { Router } from 'express'
import {
  bulkCreateEmployeesHandler,
  createEmployeeHandler,
  listEmployeesHandler,
  setEmployeeActiveHandler,
} from '../controllers/employee-controller'
import { requireAuth } from '../middleware/require-auth'
import { validateBody } from '../middleware/validate'

export const employeesRouter: Router = Router()

employeesRouter.post(
  '/employees',
  requireAuth,
  validateBody(createEmployeeSchema),
  createEmployeeHandler,
)
employeesRouter.post(
  '/employees/bulk',
  requireAuth,
  validateBody(bulkCreateEmployeesSchema),
  bulkCreateEmployeesHandler,
)
employeesRouter.get('/employees', requireAuth, listEmployeesHandler)
employeesRouter.patch(
  '/employees/:id',
  requireAuth,
  validateBody(setEmployeeActiveSchema),
  setEmployeeActiveHandler,
)
