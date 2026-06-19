import type { MoneyPesewas } from './money'

export type AdvanceStatus = 'pending' | 'disbursed' | 'repaid' | 'failed'

// Public shape returned from /advances. All money in pesewas.
export interface AdvanceRequest {
  id: string
  employee_id: string
  employee_name: string
  requested_amount_pesewas: MoneyPesewas
  fee_amount_pesewas: MoneyPesewas
  net_disbursed_pesewas: MoneyPesewas
  status: AdvanceStatus
  requested_at: string
  disbursed_at: string | null
}

export interface AdvanceFilters {
  status?: AdvanceStatus | 'all'
  from?: string
  to?: string
  page?: number
}

export interface PaginatedAdvances {
  advances: AdvanceRequest[]
  total: number
  page: number
  pageSize: number
}

// Summary returned from GET /dashboard/summary.
export interface DashboardSummary {
  advances_this_period: number
  pending_requests: number
  repayment_rate_percent: number
}
