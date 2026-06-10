import { describe, expect, it } from 'vitest'
import { calculateMaxAdvance } from './max-advance'

// All values in pesewas. GHS 1,000 = 100000 pesewas.

describe('calculateMaxAdvance', () => {
  it('returns half of earned wage when nothing has been advanced yet', () => {
    expect(calculateMaxAdvance(100_000, 0)).toBe(50_000)
  })

  it('subtracts outstanding advances from the cap', () => {
    // Cap is 50000, already taken 20000, so 30000 left.
    expect(calculateMaxAdvance(100_000, 20_000)).toBe(30_000)
  })

  it('returns zero when outstanding already equals the cap', () => {
    expect(calculateMaxAdvance(100_000, 50_000)).toBe(0)
  })

  it('returns zero when outstanding exceeds the cap (never goes negative)', () => {
    // Shouldn't happen in real data, but defensive — never return a negative cap.
    expect(calculateMaxAdvance(100_000, 70_000)).toBe(0)
  })

  it('floors at the cedi boundary', () => {
    // 0.5 * 100100 = 50050 pesewas -> floor to whole cedi = 50000 pesewas
    expect(calculateMaxAdvance(100_100, 0)).toBe(50_000)
  })

  it('returns zero when earned wage is zero', () => {
    expect(calculateMaxAdvance(0, 0)).toBe(0)
  })
})
