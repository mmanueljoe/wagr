import type { UssdCallback, UssdSession } from '@wagr/types'
import { describe, expect, it } from 'vitest'
import { handleCallback } from './ussd-flow'

const NOW = new Date('2026-06-15T10:00:00.000Z')

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

const WELCOME: UssdSession = { step: 'welcome', started_at: NOW.toISOString() }

describe('handleCallback', () => {
  it('shows the welcome menu when Moolre flags the session as new', () => {
    const result = handleCallback(callback({ new: true }), null, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('1) Check balance')
    expect(result.nextSession).toEqual(WELCOME)
  })

  it('treats a missing redis session as new even when Moolre says new=false', () => {
    const result = handleCallback(callback({ new: false }), null, NOW)
    expect(result.nextSession).toEqual(WELCOME)
  })

  it('returns the balance stub and clears the session when worker presses 1', () => {
    const result = handleCallback(callback({ message: '1' }), WELCOME, NOW)
    expect(result.response).toEqual({ message: 'Balance check coming soon.', reply: false })
    expect(result.nextSession).toBeNull()
  })

  it('returns the advance stub and clears the session when worker presses 2', () => {
    const result = handleCallback(callback({ message: '2' }), WELCOME, NOW)
    expect(result.response).toEqual({ message: 'Advance request coming soon.', reply: false })
    expect(result.nextSession).toBeNull()
  })

  it('re-prompts and keeps the session open on invalid input', () => {
    const result = handleCallback(callback({ message: '9' }), WELCOME, NOW)
    expect(result.response.reply).toBe(true)
    expect(result.response.message).toContain('Invalid choice.')
    expect(result.nextSession).toEqual(WELCOME)
  })
})
