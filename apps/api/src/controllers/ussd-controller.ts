import { type MoneyPesewas, type UssdSession, msisdnToLocal } from '@wagr/types'
import bcrypt from 'bcrypt'
import type { Request, Response } from 'express'
import { logger } from '../lib/logger'
import { initiateTransfer } from '../lib/moolre'
import { pollUntilTerminal } from '../lib/transfer-polling'
import { type FlowResult, type NewSessionContext, handleCallback } from '../lib/ussd-flow'
import { deleteSession, getSession, setSession } from '../lib/ussd-session'
import { calculateEarnedWage } from '../lib/wage-engine/earned-wage'
import { calculateMaxAdvance } from '../lib/wage-engine/max-advance'
import {
  type CreatedAdvance,
  createAdvanceRequest,
  getCurrentPeriodDisbursedPesewas,
  markAdvanceFailed,
} from '../services/advance-service'
import {
  type EmployeeForUssd,
  findEmployeeByMomoNumber,
  findEmployeeForDisbursement,
  setEmployeePinHash,
} from '../services/employee-service'

const BCRYPT_ROUNDS = 12
const PIN_REGEX = /^\d{4}$/

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

  // bcrypt.compare runs at the controller layer so the flow module stays
  // sync + pure. Null for anything that isn't a 4-digit PIN landing on
  // pin_entry.
  const pinVerified = await maybeVerifyPin(callback.message, currentSession)

  const result = handleCallback(callback, currentSession, context, pinVerified, now)

  // Bcrypt the new PIN BEFORE writing the session so that same-session
  // chains (pin_setup → balance → … → pin_entry) carry the hash for the
  // verify step. The DB save still happens via runSideEffect.
  const savedPinHash =
    result.sideEffect?.type === 'save_pin'
      ? await bcrypt.hash(result.sideEffect.pin, BCRYPT_ROUNDS)
      : null
  if (savedPinHash && result.nextSession) {
    result.nextSession.ussd_pin_hash = savedPinHash
  }

  if (result.nextSession === null) {
    await deleteSession(callback.sessionId)
  } else {
    await setSession(callback.sessionId, result.nextSession)
  }

  await runSideEffect(result, savedPinHash)

  res.json(result.response)
}

async function maybeVerifyPin(
  message: string,
  session: UssdSession | null,
): Promise<boolean | null> {
  if (!session || session?.step !== 'pin_entry') return null
  if (!session.ussd_pin_hash) return null
  if (!PIN_REGEX.test(message)) return null
  return bcrypt.compare(message, session.ussd_pin_hash)
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

async function runSideEffect(result: FlowResult, savedPinHash: string | null): Promise<void> {
  if (!result.sideEffect) return
  if (result.sideEffect.type === 'save_pin') {
    // Hash was already computed before the session write so pin_entry can
    // verify within the same session — reuse it for the DB save.
    if (savedPinHash === null) return
    await setEmployeePinHash(result.sideEffect.employeeId, savedPinHash)
    return
  }
  if (result.sideEffect.type === 'disburse') {
    // Fire-and-forget: the USSD response has already gone back to Moolre.
    // Errors in here can't be surfaced to the worker — they're logged for
    // ops follow-up. Worst case the worker sees no disbursement and has
    // to contact their employer.
    const sideEffect = result.sideEffect
    void runDisbursement(sideEffect).catch((err) => {
      logger.error(
        {
          err,
          employeeId: sideEffect.employeeId,
          requestedPesewas: sideEffect.requestedAmountPesewas,
        },
        'disbursement orchestration failed',
      )
    })
    return
  }
}

async function runDisbursement(
  sideEffect: Extract<FlowResult['sideEffect'], { type: 'disburse' }>,
): Promise<void> {
  const employee = await findEmployeeForDisbursement(sideEffect.employeeId)
  if (!employee) {
    logger.error({ employeeId: sideEffect.employeeId }, 'disbursement: employee lookup miss')
    return
  }

  let advance: CreatedAdvance
  try {
    advance = await createAdvanceRequest({
      employeeId: sideEffect.employeeId,
      employerId: sideEffect.employerId,
      momoNumber: sideEffect.momoNumber,
      requestedPesewas: sideEffect.requestedAmountPesewas,
      feePesewas: sideEffect.feePesewas,
      netPesewas: sideEffect.netDisbursementPesewas,
    })
  } catch (err) {
    logger.error({ err, employeeId: sideEffect.employeeId }, 'failed to create advance request')
    return
  }

  try {
    await initiateTransfer({
      amount: advance.netCedis,
      receiver: employee.momo_number,
      network: employee.network,
      externalRef: advance.externalRef,
    })
  } catch (err) {
    logger.error(
      { err, advanceRequestId: advance.id },
      'moolre initiate transfer failed — marking advance failed and refunding float',
    )
    await markAdvanceFailed(advance.id, 'Moolre initiate transfer call failed').catch((markErr) =>
      logger.error({ err: markErr, advanceRequestId: advance.id }, 'mark-failed also failed'),
    )
    return
  }

  // Poll in the background. Returns when terminal (or budget exhausted) —
  // we don't await this from the caller's perspective.
  pollUntilTerminal(advance.id, advance.externalRef).catch((err) =>
    logger.error({ err, advanceRequestId: advance.id }, 'unexpected polling error'),
  )
}
