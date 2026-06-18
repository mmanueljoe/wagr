import type { FloatStatusResponse, FundFloatInput, FundFloatResponse } from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { getFloatStatus, initiateFloatTopUp } from '../services/float-funding-service'

export async function getFloatStatusHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const status = await getFloatStatus(req.user.employer_id)
  const response: FloatStatusResponse = {
    balance_pesewas: status.balancePesewas,
    momo_number: status.momoNumber,
    network: status.network,
    has_pending_top_up: status.hasPendingTopUp,
  }
  res.json(response)
}

export async function fundFloatHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const body = req.body as FundFloatInput

  const topUp = await initiateFloatTopUp({
    employerId: req.user.employer_id,
    amountPesewas: body.amount_pesewas as never,
    ...(body.momo_number ? { momoNumber: body.momo_number } : {}),
    ...(body.network ? { network: body.network } : {}),
  })

  const response: FundFloatResponse = {
    top_up_id: topUp.id,
    external_ref: topUp.externalRef,
    amount_pesewas: body.amount_pesewas,
    prompt_sent: true,
  }
  res.status(202).json(response)
}
