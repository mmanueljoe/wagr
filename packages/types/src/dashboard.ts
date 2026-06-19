import type { AdvanceListItem } from './advance'

// Shape returned from GET /dashboard/summary. Feeds the four stat cards on
// the dashboard home plus the "recent advances" table beneath them.
//
// `repayment_rate_percent` is null until payday-recovery ships and the first
// `repaid` rows start landing — the dashboard renders "—" in that case rather
// than a misleading 0%.
export interface DashboardSummary {
  advances_this_period_count: number
  pending_requests_count: number
  repayment_rate_percent: number | null
  recent_advances: AdvanceListItem[]
}
