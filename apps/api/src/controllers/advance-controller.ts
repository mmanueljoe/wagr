import { ADVANCE_STATUSES, type AdvanceListResponse, type AdvanceStatus } from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { listAdvancesForEmployer } from '../services/advance-service'

export async function listAdvancesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const status = parseStatusQuery(req.query.status)
  const advances = await listAdvancesForEmployer(req.user.employer_id, status ? { status } : {})

  const response: AdvanceListResponse = { advances }
  res.json(response)
}

// Permissive parse — unknown / unset / "all" all skip the filter.
function parseStatusQuery(raw: unknown): AdvanceStatus | undefined {
  if (typeof raw !== 'string') return undefined
  return (ADVANCE_STATUSES as readonly string[]).includes(raw) ? (raw as AdvanceStatus) : undefined
}
