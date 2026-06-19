'use client'

import { AdvancesTable } from '@/components/dashboard/advances-table'
import { FundFloatCard } from '@/components/dashboard/fund-float-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useDashboardSummary } from '@/hooks/use-dashboard-summary'
import { Clock, CreditCard, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardSummary()

  const recent = data?.recent_advances ?? []
  const showEmptyRecent = !isLoading && !error && recent.length === 0

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-heading text-wagr-navy">Dashboard</h1>
          <p className="text-sm text-wagr-gray">
            How your float and advances are tracking right now.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FundFloatCard />
          <StatCard
            icon={CreditCard}
            label="Advances this period"
            value={isLoading ? '…' : (data?.advances_this_period_count ?? 0)}
            hint="Requests since your last payday"
          />
          <StatCard
            icon={Clock}
            label="Pending requests"
            value={isLoading ? '…' : (data?.pending_requests_count ?? 0)}
            hint="In-flight with Moolre"
          />
          <StatCard
            icon={TrendingUp}
            label="Repayment rate"
            value={
              isLoading
                ? '…'
                : data?.repayment_rate_percent === null ||
                    data?.repayment_rate_percent === undefined
                  ? '—'
                  : `${data.repayment_rate_percent}%`
            }
            hint={
              data?.repayment_rate_percent === null
                ? 'Lights up after your first pay-period close'
                : 'Share of advances repaid on payday'
            }
          />
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-heading text-wagr-navy">Recent activity</h2>
            <span className="text-xs text-wagr-gray">Last 10 advances</span>
          </div>

          {isLoading && <p className="text-sm text-wagr-gray">Loading recent activity…</p>}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error.message}
            </p>
          )}

          {showEmptyRecent && (
            <EmptyState
              icon={CreditCard}
              title="No advances yet"
              description="When workers dial the Wagr USSD code, their requests will show up here."
            />
          )}
          {recent.length > 0 && <AdvancesTable advances={recent} />}
        </section>
      </div>
    </main>
  )
}
