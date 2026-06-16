import { msisdnToLocal } from '@wagr/types'
import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { type FlowResult, handleCallback } from '../lib/ussd-flow'
import { deleteSession, getSession, setSession } from '../lib/ussd-session'
import { findEmployeeByMomoNumber, setEmployeePinHash } from '../services/employee-service'

const BCRYPT_ROUNDS = 12

export async function ussdCallbackHandler(req: Request, res: Response) {
  const callback = req.body
  logger.info(
    { sessionId: callback.sessionId, isNew: callback.new, network: callback.network },
    'ussd callback',
  )

  const currentSession = await getSession(callback.sessionId)
  const isNewSession = callback.new || !currentSession

  // Only hit the DB on session init — continuing sessions already carry the
  // employee_id in their state. Saves a query on every keystroke.
  const employee = isNewSession
    ? await findEmployeeByMomoNumber(msisdnToLocal(callback.msisdn))
    : null

  const result = handleCallback(callback, currentSession, employee, new Date())

  if (result.nextSession === null) {
    await deleteSession(callback.sessionId)
  } else {
    await setSession(callback.sessionId, result.nextSession)
  }

  await runSideEffect(result)

  res.json(result.response)
}

async function runSideEffect(result: FlowResult): Promise<void> {
  if (!result.sideEffect) return
  if (result.sideEffect.type === 'save_pin') {
    const hash = await bcrypt.hash(result.sideEffect.pin, BCRYPT_ROUNDS)
    await setEmployeePinHash(result.sideEffect.employeeId, hash)
  }
}
