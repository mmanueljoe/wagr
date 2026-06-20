import type { MoneyPesewas } from './money'

// One row per worker who took at least one advance this pay period.
// Drives the preview table on the Close Period page.
export interface PeriodClosePreviewItem {
  employee_id: string
  worker_name: string
  advances_taken_count: number
  last_advance_at: string
  gross_pesewas: MoneyPesewas
}

export interface PeriodClosePreview {
  items: PeriodClosePreviewItem[]
  total_to_recover_pesewas: MoneyPesewas
  worker_count: number
  period_start: string
  period_end: string
  // The employer's MoMo wallet that Moolre will pull from. Surfaced so the
  // confirmation modal can show "Wagr will pull GHS X from your MoMo
  // (0241235993)" rather than a generic phrasing.
  employer_momo_number: string | null
  // True when a pending repayment already exists for this employer — the
  // dashboard should disable the Close button and surface the in-flight id.
  has_pending_close: boolean
  pending_repayment_id: string | null
}

export interface PeriodCloseRunResponse {
  repayment_id: string
}

export type RepaymentStatus = 'pending' | 'collected' | 'failed'

export interface PeriodCloseStatus {
  id: string
  status: RepaymentStatus
  total_pesewas: MoneyPesewas
  failure_reason: string | null
  initiated_at: string
  collected_at: string | null
}
