import type { AdvanceRequest, DashboardSummary } from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { logger } from '../lib/logger'
import { supabase } from '../lib/supabase'
import { getDashboardSummary, listRecentAdvances } from '../services/advance-service'

export async function listRecentAdvancesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const advances: AdvanceRequest[] = await listRecentAdvances(req.user.employer_id)
  res.json(advances)
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
