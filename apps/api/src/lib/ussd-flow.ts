import type { UssdCallback, UssdResponse, UssdSession } from '@wagr/types'

// Pure step handler. Takes the raw Moolre callback and the current session
// state (or null if Redis has nothing), returns the next response and the
// session to persist. `nextSession: null` means END — the caller should
// clear Redis.
//
// Pure so it can be unit-tested without Express or Redis. The controller
// owns the I/O; this owns the state machine.

export interface FlowResult {
  response: UssdResponse
  nextSession: UssdSession | null
}

const WELCOME_MENU = 'Welcome to Wagr\n1) Check balance\n2) Request advance'
const INVALID_INPUT = `Invalid choice.\n${WELCOME_MENU}`
const BALANCE_STUB = 'Balance check coming soon.'
const ADVANCE_STUB = 'Advance request coming soon.'
const SESSION_ERROR = 'Session error. Please dial again.'

export function handleCallback(
  callback: UssdCallback,
  currentSession: UssdSession | null,
  now: Date,
): FlowResult {
  // Fresh session — either Moolre flagged it new or our Redis TTL expired.
  // Re-init either way so we never trust a stale state machine.
  if (callback.new || !currentSession) {
    return {
      response: reply(WELCOME_MENU),
      nextSession: { step: 'welcome', started_at: now.toISOString() },
    }
  }

  if (currentSession.step === 'welcome') {
    if (callback.message === '1') {
      return { response: end(BALANCE_STUB), nextSession: null }
    }
    if (callback.message === '2') {
      return { response: end(ADVANCE_STUB), nextSession: null }
    }
    return { response: reply(INVALID_INPUT), nextSession: currentSession }
  }

  // Defensive — every known step should be handled above. If we hit this
  // the session is in a shape this slice doesn't understand; bail cleanly.
  return { response: end(SESSION_ERROR), nextSession: null }
}

function reply(message: string): UssdResponse {
  return { message, reply: true }
}

function end(message: string): UssdResponse {
  return { message, reply: false }
}
