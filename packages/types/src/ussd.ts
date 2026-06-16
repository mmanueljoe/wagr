import { z } from 'zod'

// Shape Moolre POSTs to our /ussd callback. See
// docs/architecture/moolre-api-reference.md (USSD API → Callback).
// `network` is Moolre's USSD integer (3=MTN, 6=Telecel, 5=AT) — translated
// to our canonical 'mtn' | 'telecel' | 'at' only when we need it.
export const ussdCallbackSchema = z.object({
  sessionId: z.string().min(1),
  new: z.boolean(),
  msisdn: z.string().min(1),
  network: z.number().int(),
  message: z.string(),
  extension: z.string(),
  data: z.string(),
})

export type UssdCallback = z.infer<typeof ussdCallbackSchema>

export interface UssdResponse {
  message: string
  reply: boolean
}

// Redis-backed session state. Grows with each USSD slice — see
// docs/specs/feature-ussd-flow.md (Session State Structure). employer_id,
// earned_wage, max_advance, requested_amount, pin_attempts arrive with
// later step stories.
export interface UssdSession {
  step: UssdStep
  started_at: string
  employee_id: string
  is_first_use: boolean
  // Transient — only set between pin_setup_new and pin_setup_confirm steps
  // while the worker enters and re-enters their new PIN. Cleared once the
  // PIN is hashed and persisted to the employee row.
  new_pin?: string
}

export type UssdStep = 'welcome' | 'balance' | 'advance' | 'pin_setup_new' | 'pin_setup_confirm'
