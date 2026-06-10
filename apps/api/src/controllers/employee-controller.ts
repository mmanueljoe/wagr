import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { createEmployee, listEmployees } from '../services/employee-service'

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
