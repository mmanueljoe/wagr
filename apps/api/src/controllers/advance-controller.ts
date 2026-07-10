import { ADVANCE_STATUSES, type AdvanceListResponse, type AdvanceStatus } from '@wagr/types'
import type { Request, Response } from 'express'
import { AppError } from '../errors/app-error'
import { listAdvancesForEmployer, retryFailedAdvance } from '../services/advance-service'

export async function listAdvancesHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')

  const status = parseStatusQuery(req.query.status)
  const employeeId = parseEmployeeIdQuery(req.query.employee_id)
  const advances = await listAdvancesForEmployer(req.user.employer_id, {
    ...(status ? { status } : {}),
    ...(employeeId ? { employeeId } : {}),
  })

  const response: AdvanceListResponse = { advances }
  res.json(response)
}

// Permissive parse — unknown / unset / "all" all skip the filter.
function parseStatusQuery(raw: unknown): AdvanceStatus | undefined {
  if (typeof raw !== 'string') return undefined
  return (ADVANCE_STATUSES as readonly string[]).includes(raw) ? (raw as AdvanceStatus) : undefined
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseEmployeeIdQuery(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  return UUID_REGEX.test(raw) ? raw : undefined
}

export async function retryAdvanceHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 401, 'Not logged in')
  const id = req.params.id as string | undefined
  if (!id || !UUID_REGEX.test(id)) {
    throw new AppError('INVALID_INPUT', 400, 'Invalid advance request ID')
  }

  await retryFailedAdvance(req.user.employer_id, id)
  res.status(200).json({ success: true })
}
