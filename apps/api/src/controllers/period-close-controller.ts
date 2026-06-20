import type { PeriodCloseRunResponse } from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import {
  getPeriodClosePreview,
  getRepaymentStatus,
  initiatePeriodClose,
} from '../services/repayment-service'

export async function previewHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const preview = await getPeriodClosePreview(req.user.employer_id, new Date())
  res.json(preview)
}

export async function runHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const { id } = await initiatePeriodClose(req.user.employer_id, new Date())
  const body: PeriodCloseRunResponse = { repayment_id: id }
  res.status(202).json(body)
}

export async function statusHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const id = req.params.id
  if (typeof id !== 'string' || !id) {
    throw new AppError('REPAYMENT_NOT_FOUND', 404, 'Repayment not found')
  }
  const status = await getRepaymentStatus(req.user.employer_id, id)
  res.json(status)
}
