import type { MoneyPesewas, UssdCallback, UssdSession } from '@wagr/types'
import { describe, expect, it } from 'vitest'
import type { EmployeeForUssd } from '../services/employee-service'
import { type NewSessionContext, handleCallback } from './ussd-flow'

const NOW = new Date('2026-06-15T10:00:00.000Z')
const EMPLOYEE_ID = 'emp-1'
const EMPLOYER_ID = 'emr-1'
const STORED_HASH = 'hash-already-set'

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
    momo_number: '0241235993',
    is_active: true,
    ussd_pin_hash: STORED_HASH,
    monthly_salary_pesewas: 300_000 as MoneyPesewas,
    start_date: '2026-01-01',
    employer_pay_date: 25,
    ...overrides,
  }
}

function context(overrides: Partial<NewSessionContext> = {}): NewSessionContext {
  return {
    employee: employee(),
    earned_wage_pesewas: 150_000 as MoneyPesewas,
    max_advance_pesewas: 75_000 as MoneyPesewas,
    float_available_pesewas: 500_000 as MoneyPesewas,
    ...overrides,
  }
}

const BALANCE_SESSION: UssdSession = {
  step: 'balance',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  employer_id: EMPLOYER_ID,
  full_name: 'Ama Boateng',
  momo_number: '0241235993',
  ussd_pin_hash: STORED_HASH,
  is_first_use: false,
  earned_wage_pesewas: 150_000 as MoneyPesewas,
  max_advance_pesewas: 75_000 as MoneyPesewas,
  float_available_pesewas: 500_000 as MoneyPesewas,
}

const AMOUNT_SESSION: UssdSession = {
  step: 'amount',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  employer_id: EMPLOYER_ID,
  full_name: 'Ama Boateng',
  momo_number: '0241235993',
  ussd_pin_hash: STORED_HASH,
  is_first_use: false,
  earned_wage_pesewas: 150_000 as MoneyPesewas,
  max_advance_pesewas: 75_000 as MoneyPesewas,
  float_available_pesewas: 500_000 as MoneyPesewas,
}

const PIN_NEW_SESSION: UssdSession = {
  step: 'pin_setup_new',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  employer_id: EMPLOYER_ID,
  full_name: 'Ama Boateng',
  momo_number: '0241235993',
  ussd_pin_hash: null,
  is_first_use: true,
  earned_wage_pesewas: 150_000 as MoneyPesewas,
  max_advance_pesewas: 75_000 as MoneyPesewas,
  float_available_pesewas: 500_000 as MoneyPesewas,
}

describe('handleCallback — session init', () => {
  it('ends the session when no employee owns this msisdn', () => {
    const result = handleCallback(callback({ new: true }), null, null, null, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('Number not registered')
    expect(result.nextSession).toBeNull()
  })

  it('ends the session when the employee is deactivated', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      context({ employee: employee({ is_active: false }) }),
      null,
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
      context({ employee: employee({ ussd_pin_hash: null }) }),
      null,
      NOW,
    )
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('set a 4-digit PIN')
    expect(result.nextSession).toMatchObject({
      step: 'pin_setup_new',
      employee_id: EMPLOYEE_ID,
      employer_id: EMPLOYER_ID,
      ussd_pin_hash: null,
      is_first_use: true,
      earned_wage_pesewas: 150_000,
      max_advance_pesewas: 75_000,
    })
  })

  it('shows the balance screen when the employee already has a PIN', () => {
    const result = handleCallback(callback({ new: true }), null, context(), null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Hi Ama Boateng.')
    expect(result.response.message).toContain('Earned: GHS 1,500.00')
    expect(result.response.message).toContain('Max advance: GHS 750.00')
    expect(result.response.message).toContain('Press 1 to continue.')
    expect(result.nextSession).toMatchObject({
      step: 'balance',
      is_first_use: false,
      ussd_pin_hash: STORED_HASH,
    })
  })

  it('ENDs with no-balance message when max_advance is zero', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      context({ max_advance_pesewas: 0 as MoneyPesewas }),
      null,
      NOW,
    )
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('no advance available')
    expect(result.nextSession).toBeNull()
  })

  it("ENDs with float-empty message when the employer's float can't cover the minimum advance", () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      context({ float_available_pesewas: 4_999 as MoneyPesewas }),
      null,
      NOW,
    )
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain("employer's Wagr float is empty")
    expect(result.nextSession).toBeNull()
  })

  it('worker-side cap exhausted takes precedence over float-empty when both apply', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      context({
        max_advance_pesewas: 0 as MoneyPesewas,
        float_available_pesewas: 0 as MoneyPesewas,
      }),
      null,
      NOW,
    )
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('no advance available')
  })

  it('clamps max_advance to the smaller of personal cap and float available', () => {
    const result = handleCallback(
      callback({ new: true }),
      null,
      context({
        max_advance_pesewas: 75_000 as MoneyPesewas,
        float_available_pesewas: 30_000 as MoneyPesewas,
      }),
      null,
      NOW,
    )
    expect(result.response.message).toContain('Max advance: GHS 300.00')
    expect(result.nextSession?.max_advance_pesewas).toBe(30_000)
  })

  it('treats a missing redis session the same as new', () => {
    const result = handleCallback(callback({ new: false }), null, context(), null, NOW)
    expect(result.nextSession?.step).toBe('balance')
  })
})

describe('handleCallback — balance step', () => {
  it('transitions to the amount step on 1', () => {
    const result = handleCallback(callback({ message: '1' }), BALANCE_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Enter amount')
    expect(result.response.message).toContain('GHS 750.00')
    expect(result.nextSession?.step).toBe('amount')
  })

  it('re-prompts on any other input and keeps the session', () => {
    const result = handleCallback(callback({ message: '9' }), BALANCE_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Press 1 to continue.')
    expect(result.nextSession).toEqual(BALANCE_SESSION)
  })
})

describe('handleCallback — amount step', () => {
  it('re-prompts with the floor message when amount is below GHS 50', () => {
    const result = handleCallback(callback({ message: '40' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Minimum advance is GHS 50.00')
    expect(result.response.message).toContain('Enter amount')
    expect(result.nextSession).toEqual(AMOUNT_SESSION)
  })

  it('re-prompts with the cap message when amount is above max', () => {
    const result = handleCallback(callback({ message: '800' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Max advance is GHS 750.00')
    expect(result.nextSession).toEqual(AMOUNT_SESSION)
  })

  it('re-prompts when input is not a number', () => {
    const result = handleCallback(callback({ message: 'abc' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('whole cedi amount')
    expect(result.nextSession).toEqual(AMOUNT_SESSION)
  })

  it('re-prompts when amount is zero or negative', () => {
    const result = handleCallback(callback({ message: '0' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.nextSession).toEqual(AMOUNT_SESSION)
  })

  it('accepts the GHS 50 floor exactly and transitions to confirm', () => {
    const result = handleCallback(callback({ message: '50' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Confirm: GHS 50.00')
    expect(result.nextSession).toMatchObject({
      step: 'confirm',
      requested_amount_pesewas: 5_000,
      fee_pesewas: 150,
      net_disbursement_pesewas: 4_850,
    })
  })

  it('accepts the max cap exactly', () => {
    const result = handleCallback(callback({ message: '750' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.nextSession?.step).toBe('confirm')
    expect(result.nextSession?.requested_amount_pesewas).toBe(75_000)
  })

  it('shows the full breakdown on a valid mid-range amount', () => {
    const result = handleCallback(callback({ message: '200' }), AMOUNT_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Confirm: GHS 200.00')
    expect(result.response.message).toContain('Fee: GHS 6.00')
    expect(result.response.message).toContain('You receive: GHS 194.00 to 0241235993')
    expect(result.response.message).toContain('1=Confirm 2=Cancel')
    expect(result.nextSession).toMatchObject({
      step: 'confirm',
      requested_amount_pesewas: 20_000,
      fee_pesewas: 600,
      net_disbursement_pesewas: 19_400,
    })
  })
})

const CONFIRM_SESSION: UssdSession = {
  step: 'confirm',
  started_at: NOW.toISOString(),
  employee_id: EMPLOYEE_ID,
  employer_id: EMPLOYER_ID,
  full_name: 'Ama Boateng',
  momo_number: '0241235993',
  ussd_pin_hash: STORED_HASH,
  is_first_use: false,
  earned_wage_pesewas: 150_000 as MoneyPesewas,
  max_advance_pesewas: 75_000 as MoneyPesewas,
  float_available_pesewas: 500_000 as MoneyPesewas,
  requested_amount_pesewas: 20_000 as MoneyPesewas,
  fee_pesewas: 600 as MoneyPesewas,
  net_disbursement_pesewas: 19_400 as MoneyPesewas,
}

describe('handleCallback — confirm step', () => {
  it('transitions to pin_entry with attempt counter at zero on 1', () => {
    const result = handleCallback(callback({ message: '1' }), CONFIRM_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Enter your 4-digit PIN')
    expect(result.nextSession?.step).toBe('pin_entry')
    expect(result.nextSession?.pin_attempts).toBe(0)
  })

  it('ends with the cancellation message on 2', () => {
    const result = handleCallback(callback({ message: '2' }), CONFIRM_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('Cancelled')
    expect(result.nextSession).toBeNull()
  })

  it('re-shows the confirm screen on any other input', () => {
    const result = handleCallback(callback({ message: '7' }), CONFIRM_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Confirm: GHS 200.00')
    expect(result.response.message).toContain('1=Confirm 2=Cancel')
    expect(result.nextSession).toEqual(CONFIRM_SESSION)
  })
})

const PIN_ENTRY_SESSION: UssdSession = {
  ...CONFIRM_SESSION,
  step: 'pin_entry',
  pin_attempts: 0,
}

describe('handleCallback — pin entry step', () => {
  it('re-prompts on non-4-digit input without burning an attempt', () => {
    const result = handleCallback(callback({ message: '12' }), PIN_ENTRY_SESSION, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('4 digits')
    expect(result.nextSession).toEqual(PIN_ENTRY_SESSION)
  })

  it('ends with success + emits disburse sideEffect on correct PIN', () => {
    const result = handleCallback(callback({ message: '1234' }), PIN_ENTRY_SESSION, null, true, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('Request submitted')
    expect(result.response.message).toContain('GHS 194.00')
    expect(result.response.message).toContain('0241235993')
    expect(result.nextSession).toBeNull()
    expect(result.sideEffect).toEqual({
      type: 'disburse',
      employeeId: EMPLOYEE_ID,
      employerId: EMPLOYER_ID,
      requestedAmountPesewas: 20_000,
      feePesewas: 600,
      netDisbursementPesewas: 19_400,
      momoNumber: '0241235993',
    })
  })

  it('re-prompts with attempts remaining on first wrong PIN', () => {
    const result = handleCallback(
      callback({ message: '9999' }),
      PIN_ENTRY_SESSION,
      null,
      false,
      NOW,
    )
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('2 attempts remaining')
    expect(result.nextSession?.pin_attempts).toBe(1)
    expect(result.sideEffect).toBeUndefined()
  })

  it('uses singular "attempt" on second wrong PIN', () => {
    const afterFirst: UssdSession = { ...PIN_ENTRY_SESSION, pin_attempts: 1 }
    const result = handleCallback(callback({ message: '9999' }), afterFirst, null, false, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('1 attempt remaining')
    expect(result.nextSession?.pin_attempts).toBe(2)
  })

  it('ends the session on the third wrong PIN', () => {
    const afterSecond: UssdSession = { ...PIN_ENTRY_SESSION, pin_attempts: 2 }
    const result = handleCallback(callback({ message: '9999' }), afterSecond, null, false, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('Too many wrong PIN attempts')
    expect(result.nextSession).toBeNull()
    expect(result.sideEffect).toBeUndefined()
  })
})

describe('handleCallback — pin setup', () => {
  it('moves from pin_setup_new to pin_setup_confirm on a valid 4-digit pin', () => {
    const result = handleCallback(callback({ message: '1234' }), PIN_NEW_SESSION, null, null, NOW)
    expect(result.response.message).toContain('Re-enter')
    expect(result.nextSession).toMatchObject({ step: 'pin_setup_confirm', new_pin: '1234' })
  })

  it('re-prompts on non-4-digit input at the new step', () => {
    const result = handleCallback(callback({ message: '12' }), PIN_NEW_SESSION, null, null, NOW)
    expect(result.response.message).toContain('4 digits')
    expect(result.nextSession).toEqual(PIN_NEW_SESSION)
  })

  it('resets to pin_setup_new when the confirm PIN does not match', () => {
    const confirmSession: UssdSession = {
      ...PIN_NEW_SESSION,
      step: 'pin_setup_confirm',
      new_pin: '1234',
    }
    const result = handleCallback(callback({ message: '5678' }), confirmSession, null, null, NOW)
    expect(result.response.message).toContain('did not match')
    expect(result.nextSession?.step).toBe('pin_setup_new')
    expect(result.nextSession?.new_pin).toBeUndefined()
  })

  it('chains to the balance screen and emits save_pin when PINs match', () => {
    const confirmSession: UssdSession = {
      ...PIN_NEW_SESSION,
      step: 'pin_setup_confirm',
      new_pin: '1234',
    }
    const result = handleCallback(callback({ message: '1234' }), confirmSession, null, null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Hi Ama Boateng.')
    expect(result.response.message).toContain('Press 1 to continue.')
    expect(result.nextSession?.step).toBe('balance')
    expect(result.nextSession?.new_pin).toBeUndefined()
    expect(result.sideEffect).toEqual({
      type: 'save_pin',
      employeeId: EMPLOYEE_ID,
      pin: '1234',
    })
  })

  it('chains to no-balance END when PINs match but max_advance is zero', () => {
    const confirmSession: UssdSession = {
      ...PIN_NEW_SESSION,
      step: 'pin_setup_confirm',
      new_pin: '1234',
      max_advance_pesewas: 0 as MoneyPesewas,
    }
    const result = handleCallback(callback({ message: '1234' }), confirmSession, null, null, NOW)
    expect(result.response.reply).toBe(false)
    expect(result.response.message).toContain('no advance available')
    expect(result.nextSession).toBeNull()
    expect(result.sideEffect).toEqual({
      type: 'save_pin',
      employeeId: EMPLOYEE_ID,
      pin: '1234',
    })
  })
})
