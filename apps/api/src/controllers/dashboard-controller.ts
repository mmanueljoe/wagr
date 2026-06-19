import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { getDashboardSummary } from '../services/dashboard-service'

export async function summaryHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const summary = await getDashboardSummary(req.user.employer_id, new Date())
  res.json(summary)
}
