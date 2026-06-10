import type { MoneyPesewas } from '@wagr/types'

// What this does: answers "how much of this month's salary has this worker
// already earned today?" That's the number we let them take an advance against.
//
// Formula: (days worked so far in this period / total days in the period) * monthly salary.
// All monetary values are integer pesewas (GHS 1.00 = 100 pesewas). See ADR 008.
// Result is floored at the cedi level — we'd rather under-pay by 1 cedi than
// over-pay by 1 cedi (over-paying means the employer is short on payday).

export interface EarnedWageInput {
  monthlySalaryPesewas: MoneyPesewas
  payDate: number
  startDate: Date
  today: Date
}

const PESEWAS_PER_CEDI = 100

export function calculateEarnedWage(input: EarnedWageInput): MoneyPesewas {
  const period = getCurrentPayPeriod(input.payDate, input.today)

  if (input.startDate > period.end) return 0

  const countingStart = new Date(Math.max(input.startDate.getTime(), period.start.getTime()))
  if (input.today < countingStart) return 0

  const daysWorked = daysBetweenInclusive(countingStart, input.today)
  const periodDays = daysBetweenInclusive(period.start, period.end)

  // Floor to the nearest cedi to match the business rule. We compute in
  // pesewas, divide-floor to cedis, multiply back to pesewas for storage.
  const earnedPesewasRaw = (daysWorked / periodDays) * input.monthlySalaryPesewas
  return Math.floor(earnedPesewasRaw / PESEWAS_PER_CEDI) * PESEWAS_PER_CEDI
}

interface PayPeriod {
  start: Date
  end: Date
}

// A pay period runs from the day after the previous payday up to and including
// this month's payday. So if payday is the 25th and today is June 20, the
// period is May 26 -> June 25. If today is June 26, we've rolled over and
// the new period is June 26 -> July 25.
export function getCurrentPayPeriod(payDate: number, today: Date): PayPeriod {
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth()
  const day = today.getUTCDate()

  const periodEndMonth = day <= payDate ? month : month + 1
  const end = new Date(Date.UTC(year, periodEndMonth, clampPayDate(year, periodEndMonth, payDate)))

  const prevPaydayYear = end.getUTCFullYear()
  const prevPaydayMonth = end.getUTCMonth() - 1
  const prevPayday = new Date(
    Date.UTC(
      prevPaydayYear,
      prevPaydayMonth,
      clampPayDate(prevPaydayYear, prevPaydayMonth, payDate),
    ),
  )

  const start = new Date(prevPayday)
  start.setUTCDate(start.getUTCDate() + 1)

  return { start, end }
}

// If payday is the 31st and the month only has 28 or 30 days, "the 31st"
// doesn't exist — clamp to the last real day so the period doesn't silently
// spill into the next month.
function clampPayDate(year: number, month: number, payDate: number): number {
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return Math.min(payDate, lastDayOfMonth)
}

// Using UTC math everywhere so timezones and daylight savings can't swing a
// 30-day period to 29 or 31. Both ends are inclusive — the day the worker
// started AND today both count as worked days.
function daysBetweenInclusive(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  return Math.floor((endUtc - startUtc) / msPerDay) + 1
}
