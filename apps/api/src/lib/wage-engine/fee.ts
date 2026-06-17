import type { MoneyPesewas } from '@wagr/types'

// 3% of the requested advance. Tuned against Moolre's 1% Transfers cut
// (cap GHS 10) so Wagr's net margin stays positive at every advance size
// permitted by the GHS 50 floor and the 50%-of-earned cap. See the pricing
// snapshot in docs/architecture/moolre-api-reference.md — if Moolre's
// Transfers pricing shifts, this number needs re-tuning.
const FEE_RATE = 0.03

export interface FeeBreakdown {
  fee: MoneyPesewas
  net: MoneyPesewas
}

export function calculateFee(requestedAmountPesewas: MoneyPesewas): FeeBreakdown {
  const fee = Math.round(requestedAmountPesewas * FEE_RATE) as MoneyPesewas
  return {
    fee,
    net: (requestedAmountPesewas - fee) as MoneyPesewas,
  }
}
