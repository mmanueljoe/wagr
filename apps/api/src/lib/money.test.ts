import { formatGhs, parseGhs } from '@wagr/types'
import { describe, expect, it } from 'vitest'

// Quick coverage on the money helpers so we lock in the contract: pesewas
// integers in, cedi strings out, and round-tripping preserves value.

describe('formatGhs', () => {
  it('formats whole cedis', () => {
    expect(formatGhs(1_100)).toBe('GHS 11.00')
  })

  it('formats sub-cedi amounts', () => {
    expect(formatGhs(50)).toBe('GHS 0.50')
    expect(formatGhs(5)).toBe('GHS 0.05')
  })

  it('thousand-separators larger amounts', () => {
    expect(formatGhs(125_075)).toBe('GHS 1,250.75')
  })

  it('handles zero', () => {
    expect(formatGhs(0)).toBe('GHS 0.00')
  })

  it('keeps the negative sign on the outside', () => {
    expect(formatGhs(-1_100)).toBe('-GHS 11.00')
  })
})

describe('parseGhs', () => {
  it('parses whole-cedi strings', () => {
    expect(parseGhs('11')).toBe(1_100)
    expect(parseGhs('11.00')).toBe(1_100)
  })

  it('parses fractional amounts', () => {
    expect(parseGhs('11.5')).toBe(1_150)
    expect(parseGhs('0.50')).toBe(50)
  })

  it('strips commas and stray whitespace', () => {
    expect(parseGhs('1,250.75')).toBe(125_075)
    expect(parseGhs(' 11.00 ')).toBe(1_100)
  })

  it('strips a leading GHS prefix', () => {
    expect(parseGhs('GHS 11.00')).toBe(1_100)
  })

  it('rejects garbage', () => {
    expect(parseGhs('abc')).toBeNull()
    expect(parseGhs('')).toBeNull()
    expect(parseGhs('11.123')).toBeNull()
  })

  it('round-trips with formatGhs', () => {
    for (const pesewas of [0, 1, 50, 100, 1_100, 125_075]) {
      const parsed = parseGhs(formatGhs(pesewas).replace('GHS ', ''))
      expect(parsed).toBe(pesewas)
    }
  })
})
