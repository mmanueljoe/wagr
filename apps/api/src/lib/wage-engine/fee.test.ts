import { describe, expect, it } from 'vitest'
import { calculateFee } from './fee'

describe('calculateFee', () => {
  it('whole-cedi case: GHS 100 -> 3 fee, 97 net', () => {
    expect(calculateFee(100)).toEqual({ fee: 3, net: 97 })
  })

  it('rounds the fee up: GHS 50 -> 2 fee (1.5 rounded up), 48 net', () => {
    expect(calculateFee(50)).toEqual({ fee: 2, net: 48 })
  })

  it('tiny amount still rounds up: GHS 1 -> 1 fee, 0 net', () => {
    // 0.03 rounded up = 1. The worker gets nothing but the fee is still there.
    // In real flow we should refuse requests this small before we ever get here.
    expect(calculateFee(1)).toEqual({ fee: 1, net: 0 })
  })

  it('zero in, zero out', () => {
    expect(calculateFee(0)).toEqual({ fee: 0, net: 0 })
  })

  it('larger amount: GHS 1000 -> 30 fee, 970 net', () => {
    expect(calculateFee(1000)).toEqual({ fee: 30, net: 970 })
  })

  it('odd amount rounds up: GHS 333 -> 10 fee (9.99 rounded up), 323 net', () => {
    expect(calculateFee(333)).toEqual({ fee: 10, net: 323 })
  })
})
