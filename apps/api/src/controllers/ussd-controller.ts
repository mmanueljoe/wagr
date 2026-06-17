import { type MoneyPesewas, msisdnToLocal } from '@wagr/types'
import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { type FlowResult, type NewSessionContext, handleCallback } from '../lib/ussd-flow'
import { deleteSession, getSession, setSession } from '../lib/ussd-session'
import { calculateEarnedWage } from '../lib/wage-engine/earned-wage'
import { calculateMaxAdvance } from '../lib/wage-engine/max-advance'
import { getCurrentPeriodDisbursedPesewas } from '../services/advance-service'
import {
  type EmployeeForUssd,
  findEmployeeByMomoNumber,
  setEmployeePinHash,
} from '../services/employee-service'

const BCRYPT_ROUNDS = 12

export async function ussdCallbackHandler(req: Request, res: Response) {
  const callback = req.body
  const now = new Date()
  logger.info(
    { sessionId: callback.sessionId, isNew: callback.new, network: callback.network },
    'ussd callback',
  )

  const currentSession = await getSession(callback.sessionId)
  const isNewSession = callback.new || !currentSession

  // Only hit the DB on session init — continuing sessions already carry the
  // wage values in state. Saves a query on every keystroke and keeps the
  // 5-second Moolre budget comfortable.
  const context = isNewSession ? await buildNewSessionContext(callback.msisdn, now) : null

  const result = handleCallback(callback, currentSession, context, now)

  if (result.nextSession === null) {
    await deleteSession(callback.sessionId)
  } else {
    await setSession(callback.sessionId, result.nextSession)
  }

  await runSideEffect(result)

  res.json(result.response)
}

async function buildNewSessionContext(
  msisdn: string,
  now: Date,
): Promise<NewSessionContext | null> {
  const employee = await findEmployeeByMomoNumber(msisdnToLocal(msisdn))
  if (!employee) return null

  // Even when an employee is found, only compute wage values when they're
  // active — flow short-circuits to DEACTIVATED before reading wages, and
  // we'd rather skip the DB hit than waste it.
  if (!employee.is_active) {
    return zeroContext(employee)
  }

  const earnedWagePesewas = calculateEarnedWage({
    monthlySalaryPesewas: employee.monthly_salary_pesewas,
    payDate: employee.employer_pay_date,
    startDate: new Date(employee.start_date),
    today: now,
  })

  const outstandingPesewas = await getCurrentPeriodDisbursedPesewas(
    employee.id,
    employee.employer_pay_date,
    now,
  )

  const maxAdvancePesewas = calculateMaxAdvance(earnedWagePesewas, outstandingPesewas)

  return {
    employee,
    earned_wage_pesewas: earnedWagePesewas,
    max_advance_pesewas: maxAdvancePesewas,
  }
}

function zeroContext(employee: EmployeeForUssd): NewSessionContext {
  return {
    employee,
    earned_wage_pesewas: 0 as MoneyPesewas,
    max_advance_pesewas: 0 as MoneyPesewas,
  }
}

async function runSideEffect(result: FlowResult): Promise<void> {
  if (!result.sideEffect) return
  if (result.sideEffect.type === 'save_pin') {
    const hash = await bcrypt.hash(result.sideEffect.pin, BCRYPT_ROUNDS)
    await setEmployeePinHash(result.sideEffect.employeeId, hash)
  }
}
