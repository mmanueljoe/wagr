import type {
  AdvanceFilters,
  AdvanceRequest,
  AdvanceStatus,
  DashboardSummary,
  PaginatedAdvances,
} from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'
import { initiateTransfer } from '../lib/moolre'
import { supabase } from '../lib/supabase'
import { pollUntilTerminal } from '../lib/transfer-polling'
import {
  type RetryAdvanceInfo,
  getDashboardSummary,
  listAdvances,
  listRecentAdvances,
  markAdvanceFailed,
  retryAdvance,
} from '../services/advance-service'

export async function listRecentAdvancesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const advances: AdvanceRequest[] = await listRecentAdvances(req.user.employer_id)
  res.json(advances)
}

export async function listAdvancesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const { status, from, to, page } = req.query
  const filters: AdvanceFilters = {}
  if (typeof status === 'string' && status) filters.status = status as AdvanceStatus | 'all'
  if (typeof from === 'string' && from) filters.from = from
  if (typeof to === 'string' && to) filters.to = to
  if (typeof page === 'string' && page) filters.page = Math.max(1, Number.parseInt(page, 10) || 1)

  const result: PaginatedAdvances = await listAdvances(req.user.employer_id, filters)
  res.json(result)
}

export async function retryAdvanceHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const { id } = req.params as { id: string }
  const info = await retryAdvance(id, req.user.employer_id)

  res.status(202).json({ id: info.advanceId, status: 'pending' })

  void runRetryDisbursement(info).catch((err) => {
    logger.error({ err, advanceId: id }, 'retry disbursement orchestration failed')
  })
}

async function runRetryDisbursement(info: RetryAdvanceInfo): Promise<void> {
  try {
    await initiateTransfer({
      amount: info.netCedis,
      receiver: info.momoNumber,
      network: info.network as Parameters<typeof initiateTransfer>[0]['network'],
      externalRef: info.externalRef,
    })
  } catch (err) {
    logger.error({ err, advanceId: info.advanceId }, 'retry: moolre initiate transfer failed')
    await markAdvanceFailed(info.advanceId, 'Moolre initiate transfer failed on retry').catch(
      (markErr) =>
        logger.error({ err: markErr, advanceId: info.advanceId }, 'retry: mark-failed also failed'),
    )
    return
  }

  pollUntilTerminal(info.advanceId, info.externalRef).catch((err) => {
    logger.error({ err, advanceId: info.advanceId }, 'retry: poll failed')
  })
}

export async function getDashboardSummaryHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const { data: employer, error } = await supabase
    .from('employers')
    .select('pay_date')
    .eq('id', req.user.employer_id)
    .single()

  if (error || !employer) {
    logger.error(
      { err: error, employerId: req.user.employer_id },
      'failed to read employer pay_date',
    )
    throw new AppError('EMPLOYER_NOT_FOUND', 500, 'Could not load employer data')
  }

  const summary: DashboardSummary = await getDashboardSummary(
    req.user.employer_id,
    employer.pay_date,
    new Date(),
  )
  res.json(summary)
}
