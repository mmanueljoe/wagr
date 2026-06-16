import type { MoneyPesewas } from '@wagr/types'

// Flat GHS 10 fee per advance (1000 pesewas, see ADR 008). The per-advance
// fee is the same regardless of amount; the worker receives requested - 10.
// The 20%-of-request ceiling that protects small advances is enforced as a
// minimum-advance check in the USSD amount step (GHS 50), not here.
const FLAT_FEE_PESEWAS: MoneyPesewas = 1_000

export interface FeeBreakdown {
  fee: MoneyPesewas
  net: MoneyPesewas
}

export function calculateFee(requestedAmountPesewas: MoneyPesewas): FeeBreakdown {
  return {
    fee: FLAT_FEE_PESEWAS,
    net: requestedAmountPesewas - FLAT_FEE_PESEWAS,
  }
}
