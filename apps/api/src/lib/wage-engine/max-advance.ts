// Why half: this is the cushion that keeps Wagr safe at payday. If we let
// a worker take everything they've earned, any timesheet correction, sick-day
// adjustment, or unpaid leave that lands after the advance is gone could
// leave the employer short when we try to recover. 50% is the standard EWA
// ceiling for that reason.
const MAX_ADVANCE_RATE = 0.5

export function calculateMaxAdvance(earnedWage: number, outstandingAdvances: number): number {
  return Math.max(0, Math.floor(earnedWage * MAX_ADVANCE_RATE - outstandingAdvances))
}
