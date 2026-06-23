import { z } from 'zod'
import type { MoneyPesewas } from './money'

// Shape Moolre POSTs to our /ussd callback. See
// docs/architecture/moolre-api-reference.md (USSD API → Callback).
// `network` is Moolre's USSD integer (3=MTN, 6=Telecel, 5=AT) — translated
// to our canonical 'mtn' | 'telecel' | 'at' only when we need it.
//
// Moolre sends this as application/x-www-form-urlencoded, so every value
// arrives at the server as a string. We coerce `new` (string '0'/'1' →
// boolean) and `network` (string → int) on parse so the rest of the code
// can work with the proper types.
export const ussdCallbackSchema = z.object({
  sessionId: z.string().min(1),
  new: z
    .union([z.boolean(), z.string(), z.number()])
    .transform((v) => v === true || v === 1 || v === '1' || v === 'true'),
  msisdn: z.string().min(1),
  network: z.coerce.number().int(),
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
// docs/specs/feature-ussd-flow.md (Session State Structure). requested_amount,
// pin_attempts arrive with later step stories.
//
// earned_wage and max_advance are pre-computed at session start so each step
// stays inside the 5-second Moolre response budget. full_name is carried so
// the balance screen and confirmation step don't need another DB round trip.
export interface UssdSession {
  step: UssdStep
  started_at: string
  employee_id: string
  employer_id: string
  full_name: string
  momo_number: string
  is_first_use: boolean
  earned_wage_pesewas: MoneyPesewas
  // Personal-side cap (50% of earned wage minus advances already taken this
  // period). Set at session init and stays put as the worker progresses.
  max_advance_pesewas: MoneyPesewas
  // Employer-side cap — how much of the employer's float is currently
  // available to disburse. Pre-flight check in enterBalance compares this
  // against MIN_ADVANCE_PESEWAS and, if positive, clamps max_advance to
  // min(personal_cap, float_available) so the worker never requests more
  // than can actually be funded.
  float_available_pesewas: MoneyPesewas
  // Bcrypt hash carried in session so the pin_entry step can verify without
  // a DB round trip. Null only for first-use sessions before pin setup
  // completes — once the worker sets their PIN, the controller patches the
  // freshly-computed hash into the session.
  ussd_pin_hash: string | null
  // Set once the worker enters a valid amount at the amount step. Carried
  // through to the confirm screen and the PIN step that triggers disbursement.
  requested_amount_pesewas?: MoneyPesewas
  fee_pesewas?: MoneyPesewas
  net_disbursement_pesewas?: MoneyPesewas
  // Number of wrong PIN entries in this session. Cleared on each fresh session.
  pin_attempts?: number
  // Transient — only set between pin_setup_new and pin_setup_confirm steps
  // while the worker enters and re-enters their new PIN. Cleared once the
  // PIN is hashed and persisted to the employee row.
  new_pin?: string
}

export type UssdStep =
  | 'balance'
  | 'pin_setup_new'
  | 'pin_setup_confirm'
  | 'amount'
  | 'confirm'
  | 'pin_entry'
