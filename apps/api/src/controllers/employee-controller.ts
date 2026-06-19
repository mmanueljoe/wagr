import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import {
  bulkCreateEmployees,
  createEmployee,
  listEmployees,
  setEmployeeActive,
} from '../services/employee-service'

export async function createEmployeeHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const employee = await createEmployee(req.user.employer_id, req.body)
  res.status(201).json(employee)
}

export async function listEmployeesHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const employees = await listEmployees(req.user.employer_id)
  res.json(employees)
}

export async function bulkCreateEmployeesHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const result = await bulkCreateEmployees(req.user.employer_id, req.body.employees)
  res.status(result.inserted > 0 ? 200 : 422).json(result)
}

export async function setEmployeeActiveHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const id = req.params.id
  if (typeof id !== 'string') throw new AppError('INVALID_ID', 400, 'Invalid worker id')
  const employee = await setEmployeeActive(req.user.employer_id, id, req.body.is_active)
  res.json(employee)
}
