import type { UssdCallback, UssdResponse, UssdSession } from '@wagr/types'
import type { EmployeeForUssd } from '../services/employee-service'

// Pure step handler. The controller does the I/O (Redis read/write, employee
// lookup, bcrypt + DB save for the PIN). This file just runs the state
// machine.
//
// On a new session the controller must hand us the resolved employee (or
// null if no employee owns this msisdn). On a continuing session `employee`
// is unused — the session already carries `employee_id`.
//
// `sideEffect` lets the controller know when we need work done after the
// session write: today that's only "save this PIN", but the pattern leaves
// room for the disbursement trigger that lands in [ussd-pin-step].

export type SideEffect = { type: 'save_pin'; employeeId: string; pin: string }

export interface FlowResult {
  response: UssdResponse
  nextSession: UssdSession | null
  sideEffect?: SideEffect
}

const PIN_REGEX = /^\d{4}$/

const WELCOME_MENU = 'Welcome to Wagr\n1) Check balance\n2) Request advance'
const INVALID_MENU = `Invalid choice.\n${WELCOME_MENU}`
const BALANCE_STUB = 'Balance check coming soon.'
const ADVANCE_STUB = 'Advance request coming soon.'

const NOT_REGISTERED = 'Number not registered on Wagr. Contact your employer.'
const DEACTIVATED = 'Your access has been deactivated. Contact your employer.'
const PIN_SETUP_PROMPT = 'Welcome to Wagr.\nPlease set a 4-digit PIN:'
const PIN_CONFIRM_PROMPT = 'Re-enter your PIN to confirm:'
const PIN_INVALID = 'PIN must be 4 digits. Try again:'
const PIN_MISMATCH = `PINs did not match.\n${PIN_SETUP_PROMPT}`
const PIN_SET_DONE = 'PIN set. Dial again to check your balance.'
const SESSION_ERROR = 'Session error. Please dial again.'

export function handleCallback(
  callback: UssdCallback,
  currentSession: UssdSession | null,
  employee: EmployeeForUssd | null,
  now: Date,
): FlowResult {
  if (callback.new || !currentSession) {
    return initSession(employee, now)
  }

  switch (currentSession.step) {
    case 'welcome':
      return handleWelcome(callback.message, currentSession)
    case 'pin_setup_new':
      return handlePinSetupNew(callback.message, currentSession)
    case 'pin_setup_confirm':
      return handlePinSetupConfirm(callback.message, currentSession)
    default:
      return { response: end(SESSION_ERROR), nextSession: null }
  }
}

function initSession(employee: EmployeeForUssd | null, now: Date): FlowResult {
  if (!employee) {
    return { response: end(NOT_REGISTERED), nextSession: null }
  }
  if (!employee.is_active) {
    return { response: end(DEACTIVATED), nextSession: null }
  }

  const base = {
    started_at: now.toISOString(),
    employee_id: employee.id,
  }

  if (employee.ussd_pin_hash === null) {
    return {
      response: reply(PIN_SETUP_PROMPT),
      nextSession: { ...base, step: 'pin_setup_new', is_first_use: true },
    }
  }

  return {
    response: reply(WELCOME_MENU),
    nextSession: { ...base, step: 'welcome', is_first_use: false },
  }
}

function handleWelcome(message: string, session: UssdSession): FlowResult {
  if (message === '1') {
    return { response: end(BALANCE_STUB), nextSession: null }
  }
  if (message === '2') {
    return { response: end(ADVANCE_STUB), nextSession: null }
  }
  return { response: reply(INVALID_MENU), nextSession: session }
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
  return {
    response: end(PIN_SET_DONE),
    nextSession: null,
    sideEffect: { type: 'save_pin', employeeId: session.employee_id, pin: message },
  }
}

function reply(message: string): UssdResponse {
  return { message, reply: true }
}

function end(message: string): UssdResponse {
  return { message, reply: false }
}
