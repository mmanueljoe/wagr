import { z } from 'zod'
import { EMPLOYEE_NETWORKS, GH_MOMO_REGEX } from './employee'

// Body for POST /float/fund. `momo_number` + `network` are only required the
// first time an employer tops up (when their employer row hasn't captured
// these yet). Subsequent tops-up only need amount_pesewas.
export const fundFloatSchema = z.object({
  amount_pesewas: z.number().int().positive('Amount must be greater than zero'),
  momo_number: z
    .string()
    .regex(GH_MOMO_REGEX, 'Enter a valid 10-digit Ghana MoMo number')
    .optional(),
  network: z.enum(EMPLOYEE_NETWORKS).optional(),
})

export type FundFloatInput = z.infer<typeof fundFloatSchema>

export interface FundFloatResponse {
  top_up_id: string
  external_ref: string
  amount_pesewas: number
  // Hint for the UI — true means the worker's phone should show a MoMo PIN
  // prompt shortly. Final outcome arrives via webhook; the UI polls the
  // float balance to detect terminal state.
  prompt_sent: boolean
}
