const FEE_RATE = 0.03

export interface FeeBreakdown {
  fee: number
  net: number
}

// Round UP on the fee so partial cedis go to Wagr, not the worker.
// Net is what actually gets disbursed to the MoMo wallet.
export function calculateFee(requestedAmount: number): FeeBreakdown {
  const fee = Math.ceil(requestedAmount * FEE_RATE)
  return { fee, net: requestedAmount - fee }
}
