import { describe, expect, it } from 'vitest'
import { calculateEarnedWage, getCurrentPayPeriod } from './earned-wage'

// All dates use Date.UTC(year, monthIndex, day) — monthIndex is 0-based,
// so June is 5. I keep forgetting that, hence this note.
const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m - 1, day))

describe('getCurrentPayPeriod', () => {
  it('mid-period: payday 25th, today June 20 -> period is May 26 to June 25', () => {
    const { start, end } = getCurrentPayPeriod(25, d(2026, 6, 20))
    expect(start).toEqual(d(2026, 5, 26))
    expect(end).toEqual(d(2026, 6, 25))
  })

  it('rolls over the day AFTER payday: today June 26 -> new period is June 26 to July 25', () => {
    const { start, end } = getCurrentPayPeriod(25, d(2026, 6, 26))
    expect(start).toEqual(d(2026, 6, 26))
    expect(end).toEqual(d(2026, 7, 25))
  })

  it('handles payday 31 in February: clamps to 28 in non-leap year', () => {
    const { start, end } = getCurrentPayPeriod(31, d(2026, 2, 15))
    // 2026 is not a leap year, Feb has 28 days
    expect(end).toEqual(d(2026, 2, 28))
    // previous payday is Jan 31
    expect(start).toEqual(d(2026, 2, 1))
  })
})

describe('calculateEarnedWage', () => {
  // Worker established long ago, payday 25th, salary GHS 3000.
  const baseEmployee = {
    monthlySalary: 3000,
    payDate: 25,
    startDate: d(2024, 1, 1),
  }

  it('first day of the period earns one day of salary', () => {
    // Period is May 26 -> June 25 (31 days). Today is the first day of work.
    // Expected: 1/31 * 3000 = 96.77 -> floor = 96.
    const earned = calculateEarnedWage({ ...baseEmployee, today: d(2026, 5, 26) })
    expect(earned).toBe(96)
  })

  it('last day of the period earns the full month', () => {
    // Today is payday. All 31 days of the period have been worked.
    const earned = calculateEarnedWage({ ...baseEmployee, today: d(2026, 6, 25) })
    expect(earned).toBe(3000)
  })

  it('mid-period returns roughly proportional pay', () => {
    // June 20 -> 26 days worked of 31 -> 26/31 * 3000 = 2516.13 -> floor = 2516.
    const earned = calculateEarnedWage({ ...baseEmployee, today: d(2026, 6, 20) })
    expect(earned).toBe(2516)
  })

  it('new employee who started mid-period gets prorated from their start_date', () => {
    // Abena started June 15. Today is June 20. Period is May 26 -> June 25.
    // She didn't earn for May 26-June 14 because she wasn't there.
    // She worked June 15-20 = 6 days of a 31-day period.
    // 6/31 * 3000 = 580.64 -> floor = 580.
    const earned = calculateEarnedWage({
      ...baseEmployee,
      startDate: d(2026, 6, 15),
      today: d(2026, 6, 20),
    })
    expect(earned).toBe(580)
  })

  it('worker whose start_date is after today (or after the period) earns nothing', () => {
    // Defensive: employer enters a future start_date by mistake.
    const earned = calculateEarnedWage({
      ...baseEmployee,
      startDate: d(2026, 7, 1),
      today: d(2026, 6, 20),
    })
    expect(earned).toBe(0)
  })

  it('rounds DOWN, never up: a value like 96.77 becomes 96', () => {
    // Same as the first-day case — explicit assertion about rounding direction
    // because over-paying by 1 cedi means the employer is short on payday.
    const earned = calculateEarnedWage({ ...baseEmployee, today: d(2026, 5, 26) })
    expect(earned).toBe(96)
    expect(earned).not.toBe(97)
  })
})
