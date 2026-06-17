import {
  type MoneyPesewas,
  type UssdCallback,
  type UssdResponse,
  type UssdSession,
  formatGhs,
} from '@wagr/types'
import type { EmployeeForUssd } from '../services/employee-service'

// Pure step handler. The controller does the I/O — Redis read/write,
// employee lookup, wage pre-computation, bcrypt + DB save for the PIN.
// This file just runs the state machine.
//
// On a new session the controller must hand us a NewSessionContext with the
// resolved employee + pre-computed wage values. Null context means no
// employee owns this msisdn — we END "not registered".
//
// `sideEffect` lets the controller know when we need work done after the
// session write: today that's only "save this PIN". Disbursement will use
// the same pattern when [ussd-pin-step] lands.

export interface NewSessionContext {
  employee: EmployeeForUssd
  earned_wage_pesewas: MoneyPesewas
  max_advance_pesewas: MoneyPesewas
}

export type SideEffect = { type: 'save_pin'; employeeId: string; pin: string }

export interface FlowResult {
  response: UssdResponse
  nextSession: UssdSession | null
  sideEffect?: SideEffect
}

const PIN_REGEX = /^\d{4}$/

const NOT_REGISTERED = 'Number not registered on Wagr. Contact your employer.'
const DEACTIVATED = 'Your access has been deactivated. Contact your employer.'
const PIN_SETUP_PROMPT = 'Welcome to Wagr.\nPlease set a 4-digit PIN:'
const PIN_CONFIRM_PROMPT = 'Re-enter your PIN to confirm:'
const PIN_INVALID = 'PIN must be 4 digits. Try again:'
const PIN_MISMATCH = `PINs did not match.\n${PIN_SETUP_PROMPT}`
const NO_BALANCE_AVAILABLE = 'You have no advance available right now. Come back after payday.'
const AMOUNT_STEP_STUB = 'Amount step coming soon.'
const SESSION_ERROR = 'Session error. Please dial again.'

export function handleCallback(
  callback: UssdCallback,
  currentSession: UssdSession | null,
  context: NewSessionContext | null,
  now: Date,
): FlowResult {
  if (callback.new || !currentSession) {
    return initSession(context, now)
  }

  switch (currentSession.step) {
    case 'pin_setup_new':
      return handlePinSetupNew(callback.message, currentSession)
    case 'pin_setup_confirm':
      return handlePinSetupConfirm(callback.message, currentSession)
    case 'balance':
      return handleBalance(callback.message, currentSession)
    default:
      return { response: end(SESSION_ERROR), nextSession: null }
  }
}

function initSession(context: NewSessionContext | null, now: Date): FlowResult {
  if (!context) {
    return { response: end(NOT_REGISTERED), nextSession: null }
  }
  if (!context.employee.is_active) {
    return { response: end(DEACTIVATED), nextSession: null }
  }

  const base = {
    started_at: now.toISOString(),
    employee_id: context.employee.id,
    full_name: context.employee.full_name,
    earned_wage_pesewas: context.earned_wage_pesewas,
    max_advance_pesewas: context.max_advance_pesewas,
  }

  if (context.employee.ussd_pin_hash === null) {
    return {
      response: reply(PIN_SETUP_PROMPT),
      nextSession: { ...base, step: 'pin_setup_new', is_first_use: true },
    }
  }

  return enterBalance({ ...base, step: 'balance', is_first_use: false })
}

function handlePinSetupNew(message: string, session: UssdSession): FlowResult {
  if (!PIN_REGEX.test(message)) {
    return { response: reply(PIN_INVALID), nextSession: session }
  }
  return {
    response: reply(PIN_CONFIRM_PROMPT),
    nextSession: { ...session, step: 'pin_setup_confirm', new_pin: message },
  }
}

function handlePinSetupConfirm(message: string, session: UssdSession): FlowResult {
  if (!PIN_REGEX.test(message)) {
    return { response: reply(PIN_INVALID), nextSession: session }
  }
  if (message !== session.new_pin) {
    const { new_pin: _drop, ...rest } = session
    return {
      response: reply(PIN_MISMATCH),
      nextSession: { ...rest, step: 'pin_setup_new' },
    }
  }

  // PIN matched — chain straight into the balance screen so the worker
  // doesn't have to dial again. bcrypt + DB save runs as a side effect
  // while the controller writes the session and sends the response.
  const { new_pin: _drop, ...rest } = session
  const balanceResult = enterBalance({ ...rest, step: 'balance' })
  return {
    ...balanceResult,
    sideEffect: { type: 'save_pin', employeeId: session.employee_id, pin: message },
  }
}

function handleBalance(message: string, session: UssdSession): FlowResult {
  if (message === '1') {
    return { response: end(AMOUNT_STEP_STUB), nextSession: null }
  }
  // Anything else — show the balance again with the prompt. Keeps the
  // session open so a fat-fingered keypress doesn't kill the flow.
  return { response: reply(balanceScreen(session)), nextSession: session }
}

// Entry into the balance step — handles the "no cap available" END case
// up front so we don't show "max GHS 0" and prompt for a keypress that
// will only fail at the amount step. Used by both fresh-PIN-already-set
// sessions and the pin-setup-completes-then-balance chain.
function enterBalance(session: UssdSession): FlowResult {
  if (session.max_advance_pesewas <= 0) {
    return { response: end(NO_BALANCE_AVAILABLE), nextSession: null }
  }
  return { response: reply(balanceScreen(session)), nextSession: session }
}

function balanceScreen(session: UssdSession): string {
  return [
    `Hi ${session.full_name}.`,
    `Earned: ${formatGhs(session.earned_wage_pesewas)}.`,
    `Max advance: ${formatGhs(session.max_advance_pesewas)}.`,
    'Press 1 to continue.',
  ].join('\n')
}

function reply(message: string): UssdResponse {
  return { message, reply: true }
}

function end(message: string): UssdResponse {
  return { message, reply: false }
}
