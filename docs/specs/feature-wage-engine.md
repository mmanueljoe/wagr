# Spec: Wage Calculation Engine

**Epic:** WAGR-E3 Wage Calculation Engine
**Stories:** [earned-wage-calc], [max-advance-calc], [fee-calc]
**Sprint:** Week 2
**Status:** Not started

---

## Overview

The wage calculation engine is the core business logic of Wagr. It determines how much an employee has earned in the current pay period, how much they can access as an advance, and what service fee applies. This logic runs on every USSD session start and must be fast, accurate, and thoroughly tested.

---

## User Stories

**[earned-wage-calc]** — As the system, I want to calculate an employee's earned wages for the current pay period.

**[max-advance-calc]** — As the system, I want to calculate the maximum advance available to an employee.

**[fee-calc]** — As the system, I want to calculate the service fee for an advance.

---

## Acceptance Criteria

### Earned Wage Calculation ([earned-wage-calc])
- [ ] Formula: Math.floor((days_elapsed / pay_period_days) x monthly_salary)
- [ ] days_elapsed: number of days from pay period start to today inclusive
- [ ] pay_period_days: total days in the current pay period
- [ ] Result rounded down to nearest whole GHS
- [ ] Returns 0 if today is before the employee's start_date
- [ ] Handles month boundaries correctly (February, months with 30 vs 31 days)
- [ ] Unit tested with minimum 8 cases (see test cases below)

### Maximum Advance Calculation ([max-advance-calc])
- [ ] Max advance = Math.floor(earned_wage x 0.5)
- [ ] Any advances already disbursed in the current period are subtracted
- [ ] Result is never negative — returns 0 if already at maximum
- [ ] Returns 0 if employee is_active is false

### Service Fee Calculation ([fee-calc])
- [ ] Fee = flat GHS 10 per advance, regardless of requested amount
- [ ] Net disbursement = requested_amount - GHS 10
- [ ] Fee and net disbursement returned as separate values

### Minimum advance amount
- [ ] Workers cannot request less than **GHS 50**
- [ ] Rationale: the flat fee is GHS 10, so the effective fee rate must never
      exceed 20% of what the worker requested. GHS 10 / GHS 50 = 20% — that's
      the ceiling, so GHS 50 is the floor. Below GHS 50 the fee would eat too
      much of a small advance and the deal stops being fair to the worker.
- [ ] The minimum is enforced in [ussd-amount-step], not in `calculateFee` —
      the fee function is pure arithmetic and trusts its input

---

## Technical Notes

### Module Location

The wage engine is a pure TypeScript module with no database calls. Database reads happen before calling the engine. This keeps the logic testable without a database connection.

```
apps/api/src/lib/wage-engine.ts
apps/api/src/lib/wage-engine.test.ts
```

### Function Signatures

```typescript
interface WageCalculationInput {
  monthly_salary: number      // GHS
  start_date: Date
  pay_date: number            // Day of month e.g. 30
  calculation_date?: Date     // Defaults to today. Override for testing.
}

interface WageCalculationResult {
  earned_wage: number
  pay_period_start: Date
  pay_period_end: Date
  days_elapsed: number
  pay_period_days: number
}

interface AdvanceInput {
  earned_wage: number
  existing_advances_total: number  // Sum of net_disbursed for current period
}

interface AdvanceResult {
  max_advance: number
  already_advanced: number
  remaining: number
}

interface FeeCalculationInput {
  requested_amount: number
}

interface FeeCalculationResult {
  requested_amount: number
  fee_amount: number
  net_disbursement: number
}

export function calculateEarnedWage(input: WageCalculationInput): WageCalculationResult
export function calculateMaxAdvance(input: AdvanceInput): AdvanceResult
export function calculateFee(input: FeeCalculationInput): FeeCalculationResult
```

### Pay Period Logic

The pay period runs from the 1st of the month to the pay_date. If today is after the pay_date, the period has ended and a new one has not yet started — in this edge case, earned_wage returns the full monthly salary (the worker is owed everything and it should have been paid).

```typescript
function getPayPeriod(pay_date: number, reference_date: Date) {
  const year = reference_date.getFullYear()
  const month = reference_date.getMonth()
  const day = reference_date.getDate()

  if (day <= pay_date) {
    // Current period: 1st of this month to pay_date of this month
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, pay_date)
    }
  } else {
    // After pay_date: period ended, next period starts 1st of next month
    // Return current month's full period — worker is owed full salary
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month, pay_date)
    }
  }
}
```

### Unit Test Cases

These eight cases must pass before the engine is integrated into any other feature.

```typescript
describe('calculateEarnedWage', () => {
  test('first day of period', () => {
    // Day 1 of a 30-day period, salary GHS 1500
    // Expected: Math.floor((1/30) x 1500) = GHS 50
  })

  test('last day of period', () => {
    // Day 30 of a 30-day period, salary GHS 1500
    // Expected: GHS 1500
  })

  test('mid period', () => {
    // Day 15 of a 30-day period, salary GHS 1400
    // Expected: Math.floor((15/30) x 1400) = GHS 700
  })

  test('employee start date is today', () => {
    // Employee started today. days_elapsed counts from start_date.
    // Expected: Math.floor((1/30) x salary)
  })

  test('employee start date is after today', () => {
    // Employee has not started yet
    // Expected: 0
  })

  test('february edge case', () => {
    // Day 14 of February (28 days), salary GHS 1200
    // Expected: Math.floor((14/28) x 1200) = GHS 600
  })

  test('pay_date is 31 in a 30-day month', () => {
    // Pay date is 31 but month only has 30 days
    // Should handle gracefully — use last day of month
  })

  test('salary with decimal', () => {
    // Monthly salary GHS 1333.33
    // Result must be a whole number rounded down
  })
})
```

---

## Dependencies

None. This module is pure logic with no external dependencies. It must be completed before [ussd-session-handler] (USSD flow) and [ussd-balance-step] (balance display).

---

## Files to Create

```
apps/api/src/lib/
├── wage-engine.ts
└── wage-engine.test.ts
```
