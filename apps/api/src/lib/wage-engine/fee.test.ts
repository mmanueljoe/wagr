import { describe, expect, it } from 'vitest'
import { calculateFee } from './fee'

// All values in pesewas. GHS 100 = 10000 pesewas.

describe('calculateFee', () => {
  it('whole-cedi case: GHS 100 -> 3 fee, 97 net', () => {
    expect(calculateFee(10_000)).toEqual({ fee: 300, net: 9_700 })
  })

  it('rounds the fee up to nearest cedi: GHS 50 -> 2 fee (1.5 rounded up), 48 net', () => {
    expect(calculateFee(5_000)).toEqual({ fee: 200, net: 4_800 })
  })

  it('tiny amount still rounds up: GHS 1 -> 1 fee, 0 net', () => {
    // 3% of 100 pesewas = 3 pesewas raw, ceil to nearest cedi = 100 pesewas.
    // Worker gets nothing — in the real flow we refuse requests this small
    // before they ever reach here.
    expect(calculateFee(100)).toEqual({ fee: 100, net: 0 })
  })

  it('zero in, zero out', () => {
    expect(calculateFee(0)).toEqual({ fee: 0, net: 0 })
  })

  it('larger amount: GHS 1000 -> 30 fee, 970 net', () => {
    expect(calculateFee(100_000)).toEqual({ fee: 3_000, net: 97_000 })
  })

  it('odd amount rounds up: GHS 333 -> 10 fee (9.99 rounded up), 323 net', () => {
    expect(calculateFee(33_300)).toEqual({ fee: 1_000, net: 32_300 })
  })
})
