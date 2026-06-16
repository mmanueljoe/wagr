import { isGhanaianMsisdn, msisdnToLocal } from '@wagr/types'
import { describe, expect, it } from 'vitest'

describe('msisdnToLocal', () => {
  it('converts a 12-digit Ghana MSISDN to the 10-digit local shape', () => {
    expect(msisdnToLocal('233244123456')).toBe('0244123456')
  })

  it('throws on a number without the 233 country code', () => {
    expect(() => msisdnToLocal('0244123456')).toThrow()
  })

  it('throws on a non-Ghana country code', () => {
    expect(() => msisdnToLocal('234244123456')).toThrow()
  })

  it('throws on the wrong length', () => {
    expect(() => msisdnToLocal('23324412345')).toThrow()
  })
})

describe('isGhanaianMsisdn', () => {
  it('accepts 233 + 9 digits', () => {
    expect(isGhanaianMsisdn('233244123456')).toBe(true)
  })

  it('rejects local shape', () => {
    expect(isGhanaianMsisdn('0244123456')).toBe(false)
  })
})
