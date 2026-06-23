import { z } from 'zod'
import { EMPLOYEE_NETWORKS, GH_MOMO_REGEX } from './employee'
import type { MoneyPesewas } from './money'

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

// Body for POST /float/fund/otp — second leg of Moolre's three-step Payments
// flow. See docs/architecture/moolre-api-reference.md (Payment API → OTP flow).
export const submitFloatTopUpOtpSchema = z.object({
  top_up_id: z.string().uuid('Invalid top-up id'),
  otpcode: z.string().min(1, 'OTP is required').max(20),
})

export type SubmitFloatTopUpOtpInput = z.infer<typeof submitFloatTopUpOtpSchema>

export interface FundFloatResponse {
  top_up_id: string
  external_ref: string
  amount_pesewas: MoneyPesewas
  // Where Moolre is in its 3-step Payments flow:
  //   'otp_required' — Moolre SMS'd an OTP to the payer; UI shows OTP input
  //                    and POSTs to /float/fund/otp once they enter it
  //   'prompt_sent'  — MoMo PIN prompt is on its way; UI polls float balance
  //                    until the webhook arrives
  state: 'otp_required' | 'prompt_sent'
}

export interface SubmitFloatTopUpOtpResponse {
  top_up_id: string
  // After OTP submission Moolre fires the prompt immediately. UI flips
  // straight to the "awaiting webhook" polling state.
  state: 'prompt_sent'
}

export interface FloatStatusResponse {
  balance_pesewas: MoneyPesewas
  // null if the employer hasn't set their payment details yet — the Fund
  // Float dialog asks for them on first use.
  momo_number: string | null
  network: 'mtn' | 'telecel' | 'at' | null
  // True if there's a top-up at status='pending' (Moolre prompt sent, awaiting
  // webhook). UI shows "awaiting approval on your phone" while this is true.
  has_pending_top_up: boolean
  // Set when a top-up is mid-OTP (status='awaiting_otp'). Survives reload —
  // the UI shows the OTP input pre-filled with this id so the user can finish
  // the flow even if they navigated away. Null when no such row exists.
  awaiting_otp_top_up: {
    top_up_id: string
    amount_pesewas: MoneyPesewas
  } | null
}
