import type { MoneyPesewas } from '@wagr/types'

const FEE_RATE = 0.03
const PESEWAS_PER_CEDI = 100

export interface FeeBreakdown {
  fee: MoneyPesewas
  net: MoneyPesewas
}

// Round the fee UP to the nearest cedi so partial cedis go to Wagr, not the
// worker. Net is what actually gets disbursed to the MoMo wallet.
// All values in integer pesewas (GHS 1.00 = 100). See ADR 008.
export function calculateFee(requestedAmountPesewas: MoneyPesewas): FeeBreakdown {
  const feeCedis = Math.ceil((requestedAmountPesewas * FEE_RATE) / PESEWAS_PER_CEDI)
  const fee = feeCedis * PESEWAS_PER_CEDI
  return { fee, net: requestedAmountPesewas - fee }
}
