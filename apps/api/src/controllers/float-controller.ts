import type {
  FloatStatusResponse,
  FundFloatInput,
  FundFloatResponse,
  SubmitFloatTopUpOtpInput,
  SubmitFloatTopUpOtpResponse,
} from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import {
  getFloatStatus,
  initiateFloatTopUp,
  submitFloatTopUpOtp,
} from '../services/float-funding-service'

export async function getFloatStatusHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const status = await getFloatStatus(req.user.employer_id)
  const response: FloatStatusResponse = {
    balance_pesewas: status.balancePesewas,
    momo_number: status.momoNumber,
    network: status.network,
    has_pending_top_up: status.hasPendingTopUp,
    awaiting_otp_top_up: status.awaitingOtpTopUp
      ? {
          top_up_id: status.awaitingOtpTopUp.topUpId,
          amount_pesewas: status.awaitingOtpTopUp.amountPesewas,
        }
      : null,
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
    state: topUp.state,
  }
  res.status(202).json(response)
}

export async function submitFloatOtpHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const body = req.body as SubmitFloatTopUpOtpInput

  const result = await submitFloatTopUpOtp({
    employerId: req.user.employer_id,
    topUpId: body.top_up_id,
    otpcode: body.otpcode,
  })

  const response: SubmitFloatTopUpOtpResponse = {
    top_up_id: result.topUpId,
    state: result.state,
  }
  res.status(202).json(response)
}
