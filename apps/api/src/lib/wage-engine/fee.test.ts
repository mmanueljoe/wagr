import { describe, expect, it } from 'vitest'
import { calculateFee } from './fee'

// All values in pesewas. GHS 100 = 10000 pesewas. Fee is 3% of the
// requested advance, rounded to the nearest pesewa. The USSD amount step
// refuses requests below GHS 50, so the smallest fee in practice is GHS 1.50.

describe('calculateFee', () => {
  it('minimum allowed advance: GHS 50 -> 1.50 fee, 48.50 net', () => {
    expect(calculateFee(5_000)).toEqual({ fee: 150, net: 4_850 })
  })

  it('whole-cedi case: GHS 100 -> 3 fee, 97 net', () => {
    expect(calculateFee(10_000)).toEqual({ fee: 300, net: 9_700 })
  })

  it('common request: GHS 200 -> 6 fee, 194 net', () => {
    expect(calculateFee(20_000)).toEqual({ fee: 600, net: 19_400 })
  })

  it('larger amount: GHS 1000 -> 30 fee, 970 net', () => {
    expect(calculateFee(100_000)).toEqual({ fee: 3_000, net: 97_000 })
  })

  it('odd amount: GHS 333 -> 9.99 fee, 323.01 net', () => {
    expect(calculateFee(33_300)).toEqual({ fee: 999, net: 32_301 })
  })

  it('rounds to the nearest pesewa: GHS 17 -> 0.51 fee', () => {
    // 1700 * 0.03 = 51 exactly — no rounding needed but confirms the path.
    expect(calculateFee(1_700)).toEqual({ fee: 51, net: 1_649 })
  })

  it('rounds half-up on a fractional pesewa: GHS 16.50 -> 0.50 fee', () => {
    // 1650 * 0.03 = 49.5, rounds to 50.
    expect(calculateFee(1_650)).toEqual({ fee: 50, net: 1_600 })
  })
})
