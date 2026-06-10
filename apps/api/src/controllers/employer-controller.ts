import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { setFundingModel } from '../services/employer-service'

export async function setFundingModelHandler(req: Request, res: Response) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  await setFundingModel(req.user.employer_id, req.body.funding_model)
  res.status(204).end()
}
