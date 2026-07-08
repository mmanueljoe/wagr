import { z } from 'zod'
import type { MoneyPesewas } from './money'

// Body for POST /float/fund. Amount only — the employer's MoMo number and
// network are captured by Moolre on the hosted checkout page, not by Wagr.
export const fundFloatSchema = z.object({
  amount_pesewas: z.number().int().positive('Amount must be greater than zero'),
})

export type FundFloatInput = z.infer<typeof fundFloatSchema>

export interface FundFloatResponse {
  top_up_id: string
  external_ref: string
  amount_pesewas: MoneyPesewas
  // Moolre-hosted checkout URL. Client redirects (same tab) here. Employer
  // pays on Moolre's page; Moolre POSTs our webhook + redirects them back
  // to Wagr when done.
  authorization_url: string
}

export interface FloatStatusResponse {
  balance_pesewas: MoneyPesewas
  // True if there's a top-up at status='pending' (Moolre checkout link
  // generated, awaiting webhook). UI shows "awaiting approval on Moolre"
  // while this is true.
  has_pending_top_up: boolean
}
