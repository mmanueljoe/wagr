import { describe, expect, it } from 'vitest'
import { calculateMaxAdvance } from './max-advance'

describe('calculateMaxAdvance', () => {
  it('returns half of earned wage when nothing has been advanced yet', () => {
    expect(calculateMaxAdvance(1000, 0)).toBe(500)
  })

  it('subtracts outstanding advances from the cap', () => {
    // Cap is 500, already taken 200, so 300 left.
    expect(calculateMaxAdvance(1000, 200)).toBe(300)
  })

  it('returns zero when outstanding already equals the cap', () => {
    expect(calculateMaxAdvance(1000, 500)).toBe(0)
  })

  it('returns zero when outstanding exceeds the cap (never goes negative)', () => {
    // Shouldn't happen in real data, but defensive — never return a negative cap.
    expect(calculateMaxAdvance(1000, 700)).toBe(0)
  })

  it('rounds down', () => {
    // 0.5 * 1001 = 500.5 -> floor = 500
    expect(calculateMaxAdvance(1001, 0)).toBe(500)
  })

  it('returns zero when earned wage is zero', () => {
    expect(calculateMaxAdvance(0, 0)).toBe(0)
  })
})
