'use client'

import { AdvanceTable } from '@/components/dashboard/advance-table'
import { FundFloatCard } from '@/components/dashboard/fund-float-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useDashboardSummary, useRecentAdvances } from '@/hooks/use-advances'
import { CreditCard } from 'lucide-react'

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: advances, isLoading: advancesLoading } = useRecentAdvances()

  const advancesThisPeriod = summaryLoading ? '—' : String(summary?.advances_this_period ?? 0)
  const pendingRequests = summaryLoading ? '—' : String(summary?.pending_requests ?? 0)
  const repaymentRate = summaryLoading ? '—' : `${summary?.repayment_rate_percent ?? 100}%`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-wagr-navy">Dashboard</h1>
        <p className="text-sm text-wagr-gray mt-1">Your float and advance activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FundFloatCard />

        <StatCard
          label="Advances This Period"
          value={advancesThisPeriod}
          subtext="Requests this pay cycle"
        />

        <StatCard
          label="Pending Requests"
          value={pendingRequests}
          subtext="Awaiting disbursement"
        />

        <StatCard label="Repayment Rate" value={repaymentRate} subtext="Repaid vs disbursed" />
      </div>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-medium text-wagr-navy">Recent Advance Requests</h2>

        {advancesLoading && <p className="text-sm text-wagr-gray">Loading…</p>}

        {!advancesLoading && advances && advances.length === 0 && (
          <EmptyState
            icon={CreditCard}
            title="No advances yet"
            description="Advances will appear here once workers start requesting them via USSD."
          />
        )}

        {!advancesLoading && advances && advances.length > 0 && (
          <AdvanceTable advances={advances} />
        )}
      </div>
    </div>
  )
}
