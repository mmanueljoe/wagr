import type { Json } from '@wagr/types/supabase'
import { logger } from './logger'
import { supabase } from './supabase'

// Append-only event log. See ADR 010. Every state change that affects money
// or identity writes one row here. Audit writes never throw — if Postgres
// is unhappy we log loud and let the user's request continue, because losing
// the audit row is bad but breaking the user's flow is worse. We catch and
// alert.

export const AUDIT_ACTIONS = [
  'employer_register',
  'employer_login',
  'employer_logout',
  'employee_added',
  'employee_deactivated',
  'employee_reactivated',
  'employee_pin_set',
  'advance_requested',
  'advance_disbursed',
  'advance_failed',
  'float_funding_initiated',
  'float_funded',
  'float_funding_failed',
  'advance_pattern_flagged',
  'advance_pattern_cleared',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]
export type AuditActor = 'employer' | 'worker' | 'system'

interface AuditInput {
  action: AuditAction
  actor: AuditActor
  employerId?: string
  employeeId?: string
  // PII (phone, email, salary, MoMo number, PIN) must NOT go in here — the
  // audit table is structured incident-response evidence, not a debug dump.
  // Action-specific scalars only.
  metadata?: Record<string, Json>
}

export async function audit(input: AuditInput): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({
    action: input.action,
    actor: input.actor,
    employer_id: input.employerId ?? null,
    employee_id: input.employeeId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  })

  if (error) {
    logger.error({ err: error, action: input.action, actor: input.actor }, 'audit log write failed')
  }
}
