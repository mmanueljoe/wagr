import type { MoneyPesewas } from '@wagr/types'

// Why half: this is the cushion that keeps Wagr safe at payday. If we let
// a worker take everything they've earned, any timesheet correction, sick-day
// adjustment, or unpaid leave that lands after the advance is gone could
// leave the employer short when we try to recover. 50% is the standard EWA
// ceiling for that reason.
//
// All values in integer pesewas (GHS 1.00 = 100). See ADR 008.

const MAX_ADVANCE_RATE = 0.5
const PESEWAS_PER_CEDI = 100

export function calculateMaxAdvance(
  earnedWagePesewas: MoneyPesewas,
  outstandingAdvancesPesewas: MoneyPesewas,
): MoneyPesewas {
  // Floor to the nearest cedi to preserve the existing business rule —
  // worker sees a whole-cedi cap in the USSD menu, no awkward fractions.
  const capPesewasRaw = earnedWagePesewas * MAX_ADVANCE_RATE - outstandingAdvancesPesewas
  if (capPesewasRaw <= 0) return 0
  return Math.floor(capPesewasRaw / PESEWAS_PER_CEDI) * PESEWAS_PER_CEDI
}
