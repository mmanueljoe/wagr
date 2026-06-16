import { describe, expect, it } from 'vitest'
import { calculateFee } from './fee'

// All values in pesewas. GHS 100 = 10000 pesewas. Fee is a flat GHS 10 =
// 1000 pesewas regardless of advance amount. The USSD amount step refuses
// requests below GHS 50, so anything reaching this function is safely above
// the 20%-of-amount fee ceiling.

describe('calculateFee', () => {
  it('minimum allowed advance: GHS 50 -> 10 fee, 40 net', () => {
    expect(calculateFee(5_000)).toEqual({ fee: 1_000, net: 4_000 })
  })

  it('whole-cedi case: GHS 100 -> 10 fee, 90 net', () => {
    expect(calculateFee(10_000)).toEqual({ fee: 1_000, net: 9_000 })
  })

  it('larger amount: GHS 1000 -> 10 fee, 990 net', () => {
    expect(calculateFee(100_000)).toEqual({ fee: 1_000, net: 99_000 })
  })

  it('odd amount: GHS 333 -> 10 fee, 323 net', () => {
    expect(calculateFee(33_300)).toEqual({ fee: 1_000, net: 32_300 })
  })
})
