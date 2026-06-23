import {
  type MoneyPesewas,
  type UssdCallback,
  type UssdResponse,
  type UssdSession,
  formatGhs,
  parseGhs,
} from '@wagr/types'
import type { EmployeeForUssd } from '../services/employee-service'
import { calculateFee } from './wage-engine/fee'

// Pure step handler. The controller does the I/O — Redis read/write,
// employee lookup, wage pre-computation, bcrypt hash + verify, DB writes.
// This file just runs the state machine.
//
// On a new session the controller must hand us a NewSessionContext with the
// resolved employee + pre-computed wage values. Null context means no
// employee owns this msisdn — we END "not registered".
//
// `pinVerified` is the result of bcrypt.compare on the pin_entry step. The
// controller computes it before calling handleCallback so this module stays
// sync + pure. Null for any other step.
//
// `sideEffect` lets the controller know when to do post-response work:
// `save_pin` after first-use PIN setup, `disburse` after a successful
// advance confirmation. The controller decides how each runs.

export interface NewSessionContext {
  employee: EmployeeForUssd
  earned_wage_pesewas: MoneyPesewas
  // Personal-side cap from the wage engine (earned * 50% - outstanding).
  max_advance_pesewas: MoneyPesewas
  // Employer-side cap — current float balance in pesewas. Combined with the
  // personal cap inside enterBalance.
  float_available_pesewas: MoneyPesewas
}

export type SideEffect =
  | { type: 'save_pin'; employeeId: string; pin: string }
  | {
      type: 'disburse'
      employeeId: string
      employerId: string
      requestedAmountPesewas: MoneyPesewas
      feePesewas: MoneyPesewas
      netDisbursementPesewas: MoneyPesewas
      momoNumber: string
    }

export interface FlowResult {
  response: UssdResponse
  nextSession: UssdSession | null
  sideEffect?: SideEffect
}

const PIN_REGEX = /^\d{4}$/

// GHS 50 floor — keeps the worker's experience clean (no GHS 5 advances)
// and means our 3% fee always leaves something after Moolre's per-transaction
// minimum (GHS 0.50). See fee.ts.
const MIN_ADVANCE_PESEWAS: MoneyPesewas = 5_000

// Three strikes per session. After the third wrong PIN we END and the
// worker has to dial again. Longer-term lockouts (e.g. 30 minutes after
// repeated failures across sessions) live at the rate-limit layer — not
// here. See CLAUDE.md "Worker PINs".
const MAX_PIN_ATTEMPTS = 3

const NOT_REGISTERED = 'Number not registered on Wagr. Contact your employer.'
const DEACTIVATED = 'Your access has been deactivated. Contact your employer.'
const PIN_SETUP_PROMPT = 'Welcome to Wagr.\nPlease set a 4-digit PIN:'
const PIN_CONFIRM_PROMPT = 'Re-enter your PIN to confirm:'
const PIN_INVALID = 'PIN must be 4 digits. Try again:'
const PIN_MISMATCH = `PINs did not match.\n${PIN_SETUP_PROMPT}`
const PIN_ENTRY_PROMPT = 'Enter your 4-digit PIN:'
const TOO_MANY_ATTEMPTS = 'Too many wrong PIN attempts. Try again later.'
const NO_BALANCE_AVAILABLE = 'You have no advance available right now. Come back after payday.'
const EMPLOYER_FLOAT_EMPTY =
  "Your employer's Wagr float is empty. Please ask them to top up, then try again."
const AMOUNT_INVALID = 'Enter a whole cedi amount, e.g. 100.'
const AMOUNT_TOO_LOW = `Minimum advance is ${formatGhs(MIN_ADVANCE_PESEWAS)}.`
const CANCELLED = 'Cancelled. No advance created.'
const SESSION_ERROR = 'Session error. Please dial again.'

export function handleCallback(
  callback: UssdCallback,
  currentSession: UssdSession | null,
  context: NewSessionContext | null,
  pinVerified: boolean | null,
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
    case 'amount':
      return handleAmount(callback.message, currentSession)
    case 'confirm':
      return handleConfirm(callback.message, currentSession)
    case 'pin_entry':
      return handlePinEntry(callback.message, currentSession, pinVerified)
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
    employer_id: context.employee.employer_id,
    full_name: context.employee.full_name,
    momo_number: context.employee.momo_number,
    ussd_pin_hash: context.employee.ussd_pin_hash,
    earned_wage_pesewas: context.earned_wage_pesewas,
    max_advance_pesewas: context.max_advance_pesewas,
    float_available_pesewas: context.float_available_pesewas,
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
    return {
      response: reply(amountPrompt(session.max_advance_pesewas)),
      nextSession: { ...session, step: 'amount' },
    }
  }
  // Anything else — show the balance again with the prompt. Keeps the
  // session open so a fat-fingered keypress doesn't kill the flow.
  return { response: reply(balanceScreen(session)), nextSession: session }
}

function handleAmount(message: string, session: UssdSession): FlowResult {
  const requested = parseGhs(message)
  if (requested === null || requested <= 0) {
    return { response: reply(amountError(AMOUNT_INVALID, session)), nextSession: session }
  }
  if (requested < MIN_ADVANCE_PESEWAS) {
    return { response: reply(amountError(AMOUNT_TOO_LOW, session)), nextSession: session }
  }
  if (requested > session.max_advance_pesewas) {
    const aboveCap = `Max advance is ${formatGhs(session.max_advance_pesewas)}.`
    return { response: reply(amountError(aboveCap, session)), nextSession: session }
  }

  const { fee, net } = calculateFee(requested as MoneyPesewas)
  const nextSession: UssdSession = {
    ...session,
    step: 'confirm',
    requested_amount_pesewas: requested as MoneyPesewas,
    fee_pesewas: fee,
    net_disbursement_pesewas: net,
  }
  return { response: reply(confirmScreen(nextSession)), nextSession }
}

function handleConfirm(message: string, session: UssdSession): FlowResult {
  if (message === '1') {
    return {
      response: reply(PIN_ENTRY_PROMPT),
      nextSession: { ...session, step: 'pin_entry', pin_attempts: 0 },
    }
  }
  if (message === '2') {
    return { response: end(CANCELLED), nextSession: null }
  }
  // Anything else — re-show the confirm screen rather than killing the
  // session on a typo.
  return { response: reply(confirmScreen(session)), nextSession: session }
}

function handlePinEntry(
  message: string,
  session: UssdSession,
  pinVerified: boolean | null,
): FlowResult {
  // Format check first — typos don't burn an attempt. Lets the worker
  // recover from a slipped keystroke without losing their three tries.
  if (!PIN_REGEX.test(message)) {
    return { response: reply(PIN_INVALID), nextSession: session }
  }
  if (pinVerified) {
    // Disbursement is async — see header. We've already returned the
    // success message; the controller fires the disbursement after the
    // session write completes.
    return {
      response: end(advanceSubmittedMessage(session)),
      nextSession: null,
      sideEffect: disburseSideEffect(session),
    }
  }

  const attempts = (session.pin_attempts ?? 0) + 1
  if (attempts >= MAX_PIN_ATTEMPTS) {
    return { response: end(TOO_MANY_ATTEMPTS), nextSession: null }
  }
  const remaining = MAX_PIN_ATTEMPTS - attempts
  const noun = remaining === 1 ? 'attempt' : 'attempts'
  return {
    response: reply(`Wrong PIN. ${remaining} ${noun} remaining.\n${PIN_ENTRY_PROMPT}`),
    nextSession: { ...session, pin_attempts: attempts },
  }
}

function disburseSideEffect(session: UssdSession): SideEffect {
  // The state machine guarantees these fields are set before pin_entry —
  // amount step writes them, confirm step preserves them. Guard with
  // zeros if a stale session somehow bypasses that.
  return {
    type: 'disburse',
    employeeId: session.employee_id,
    employerId: session.employer_id,
    requestedAmountPesewas: (session.requested_amount_pesewas ?? 0) as MoneyPesewas,
    feePesewas: (session.fee_pesewas ?? 0) as MoneyPesewas,
    netDisbursementPesewas: (session.net_disbursement_pesewas ?? 0) as MoneyPesewas,
    momoNumber: session.momo_number,
  }
}

function advanceSubmittedMessage(session: UssdSession): string {
  const net = session.net_disbursement_pesewas ?? 0
  return `Request submitted. ${formatGhs(net)} will arrive on ${session.momo_number} shortly.`
}

// Entry into the balance step — handles the "no cap available" END case
// up front so we don't show "max GHS 0" and prompt for a keypress that
// will only fail at the amount step. Used by both fresh-PIN-already-set
// sessions and the pin-setup-completes-then-balance chain.
//
// Two distinct "no advance" reasons surface here with different messages:
//   - worker-side cap exhausted (no earned wage yet, or already at the 50%
//     ceiling) → NO_BALANCE_AVAILABLE — they need to wait until payday
//   - employer's float can't fund the minimum advance → EMPLOYER_FLOAT_EMPTY
//     — the worker should tell their employer to top up
//
// When both caps are positive, the worker can only request up to the smaller
// of the two. We clamp max_advance_pesewas on the session here so downstream
// steps (amount, confirm) automatically respect the cap.
function enterBalance(session: UssdSession): FlowResult {
  if (session.max_advance_pesewas <= 0) {
    return { response: end(NO_BALANCE_AVAILABLE), nextSession: null }
  }
  if (session.float_available_pesewas < MIN_ADVANCE_PESEWAS) {
    return { response: end(EMPLOYER_FLOAT_EMPTY), nextSession: null }
  }

  const effectiveMax = Math.min(
    session.max_advance_pesewas,
    session.float_available_pesewas,
  ) as MoneyPesewas
  const clamped: UssdSession = { ...session, max_advance_pesewas: effectiveMax }
  return { response: reply(balanceScreen(clamped)), nextSession: clamped }
}

function balanceScreen(session: UssdSession): string {
  return [
    `Hi ${session.full_name}.`,
    `Earned: ${formatGhs(session.earned_wage_pesewas)}.`,
    `Max advance: ${formatGhs(session.max_advance_pesewas)}.`,
    'Press 1 to continue.',
  ].join('\n')
}

function amountPrompt(maxAdvancePesewas: MoneyPesewas): string {
  return `Enter amount (max ${formatGhs(maxAdvancePesewas)}):`
}

function amountError(reason: string, session: UssdSession): string {
  return `${reason}\n${amountPrompt(session.max_advance_pesewas)}`
}

function confirmScreen(session: UssdSession): string {
  // Guarded by the state machine — the confirm step is only entered after
  // handleAmount sets these three fields. If a stale Redis blob ever
  // bypasses that, we'd rather render zeros than crash on the worker.
  const requested = session.requested_amount_pesewas ?? 0
  const fee = session.fee_pesewas ?? 0
  const net = session.net_disbursement_pesewas ?? 0
  return [
    `Confirm: ${formatGhs(requested)}`,
    `Fee: ${formatGhs(fee)}`,
    `You receive: ${formatGhs(net)} to ${session.momo_number}`,
    '1=Confirm 2=Cancel',
  ].join('\n')
}

function reply(message: string): UssdResponse {
  return { message, reply: true }
}

function end(message: string): UssdResponse {
  return { message, reply: false }
}
