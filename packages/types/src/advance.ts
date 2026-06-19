import type { MoneyPesewas } from './money'

export const ADVANCE_STATUSES = ['pending', 'disbursed', 'failed', 'repaid'] as const
export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number]

// Row shape returned from GET /advances. One row per advance request, joined
// with the worker's name + MoMo for display. The employer owns this data —
// they see it on their own dashboard only (BFF-gated by session auth).
export interface AdvanceListItem {
  id: string
  worker_name: string
  worker_momo: string
  requested_pesewas: MoneyPesewas
  fee_pesewas: MoneyPesewas
  net_pesewas: MoneyPesewas
  status: AdvanceStatus
  requested_at: string
  disbursed_at: string | null
  failure_reason: string | null
}

export interface AdvanceListResponse {
  advances: AdvanceListItem[]
}
