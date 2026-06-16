import type { UssdCallback, UssdSession } from '@wagr/types'
import { describe, expect, it } from 'vitest'
import type { EmployeeForUssd } from '../services/employee-service'
import { handleCallback } from './ussd-flow'

const NOW = new Date('2026-06-15T10:00:00.000Z')
const EMPLOYEE_ID = 'emp-1'
const EMPLOYER_ID = 'emr-1'

function callback(overrides: Partial<UssdCallback> = {}): UssdCallback {
  return {
    sessionId: '3-1707',
    new: false,
    msisdn: '233241235993',
    network: 3,
    message: '',
    extension: '109',
    data: '',
    ...overrides,
  }
}

function employee(overrides: Partial<EmployeeForUssd> = {}): EmployeeForUssd {
  return {
    id: EMPLOYEE_ID,
    employer_id: EMPLOYER_ID,
    full_name: 'Ama Boateng',
    is_active: true,
    ussd_pin_hash: 'hash-already-set',
    ...overrides,
  }
}

const WELCOME_SESSION: UssdSession = {
  step: 'welcome',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  is_first_use: false,
}

const PIN_NEW_SESSION: UssdSession = {
  step: 'pin_setup_new',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  is_first_use: true,
}

describe('handleCallback — session init', () => {
  it('ends the session when no employee owns this msisdn', () => {
    const result = handleCallback(callback({ new: true }), null, null, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('Number not registered')
    expect(result.nextSession).toBeNull()
  })

  it('ends the session when the employee is deactivated', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      employee({ is_active: false }),
      NOW,
    )
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('deactivated')
    expect(result.nextSession).toBeNull()
  })

  it('routes to PIN setup when the employee has no PIN', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      employee({ ussd_pin_hash: null }),
      NOW,
    )
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('set a 4-digit PIN')
    expect(result.nextSession).toMatchObject({
      step: 'pin_setup_new',
      employee_id: EMPLOYEE_ID,
      is_first_use: true,
    })
  })

  it('shows the welcome menu when the employee already has a PIN', () => {
    const result = handleCallback(callback({ new: true }), null, employee(), NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('1) Check balance')
    expect(result.nextSession).toMatchObject({ step: 'welcome', is_first_use: false })
  })

  it('treats a missing redis session the same as new', () => {
    const result = handleCallback(callback({ new: false }), null, employee(), NOW)
    expect(result.nextSession?.step).toBe('welcome')
  })
})

describe('handleCallback — welcome menu', () => {
  it('ends with the balance stub on 1', () => {
    const result = handleCallback(callback({ message: '1' }), WELCOME_SESSION, null, NOW)
    expect(result.response).toEqual({ message: 'Balance check coming soon.', reply: false })
    expect(result.nextSession).toBeNull()
  })

  it('ends with the advance stub on 2', () => {
    const result = handleCallback(callback({ message: '2' }), WELCOME_SESSION, null, NOW)
    expect(result.response.message).toContain('Advance request')
    expect(result.nextSession).toBeNull()
  })

  it('re-prompts and keeps the session on invalid input', () => {
    const result = handleCallback(callback({ message: '9' }), WELCOME_SESSION, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Invalid choice.')
    expect(result.nextSession).toEqual(WELCOME_SESSION)
  })
})

describe('handleCallback — pin setup', () => {
  it('moves from pin_setup_new to pin_setup_confirm on a valid 4-digit pin', () => {
    const result = handleCallback(callback({ message: '1234' }), PIN_NEW_SESSION, null, NOW)
    expect(result.response.message).toContain('Re-enter')
    expect(result.nextSession).toMatchObject({ step: 'pin_setup_confirm', new_pin: '1234' })
  })

  it('re-prompts on non-4-digit input at the new step', () => {
    const result = handleCallback(callback({ message: '12' }), PIN_NEW_SESSION, null, NOW)
    expect(result.response.message).toContain('4 digits')
    expect(result.nextSession).toEqual(PIN_NEW_SESSION)
  })

  it('resets to pin_setup_new when the confirm PIN does not match', () => {
    const confirmSession: UssdSession = {
      ...PIN_NEW_SESSION,
      step: 'pin_setup_confirm',
      new_pin: '1234',
    }
    const result = handleCallback(callback({ message: '5678' }), confirmSession, null, NOW)
    expect(result.response.message).toContain('did not match')
    expect(result.nextSession?.step).toBe('pin_setup_new')
    expect(result.nextSession?.new_pin).toBeUndefined()
  })

  it('emits a save_pin side effect and clears the session when PINs match', () => {
    const confirmSession: UssdSession = {
      ...PIN_NEW_SESSION,
      step: 'pin_setup_confirm',
      new_pin: '1234',
    }
    const result = handleCallback(callback({ message: '1234' }), confirmSession, null, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('PIN set')
    expect(result.nextSession).toBeNull()
    expect(result.sideEffect).toEqual({
      type: 'save_pin',
      employeeId: EMPLOYEE_ID,
      pin: '1234',
    })
  })
})
