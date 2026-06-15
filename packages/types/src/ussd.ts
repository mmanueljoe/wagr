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

// Redis-backed session state. Slice 2 carries the bare minimum (step +
// started_at). Later USSD slices grow this with employee_id, employer_id,
// earned_wage, max_advance, requested_amount, pin_attempts, etc. — see
// docs/specs/feature-ussd-flow.md (Session State Structure).
export interface UssdSession {
  step: UssdStep
  started_at: string
}

export type UssdStep = 'welcome' | 'balance' | 'advance'
