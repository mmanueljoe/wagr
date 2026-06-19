'use client'

import { AdvancesTable } from '@/components/dashboard/advances-table'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdvances } from '@/hooks/use-advances'
import { ADVANCE_STATUSES, type AdvanceStatus } from '@wagr/types'
import { CreditCard } from 'lucide-react'
import { useState } from 'react'

type Filter = AdvanceStatus | 'all'

const STATUS_FILTER_LABELS: Record<Filter, string> = {
  all: 'All advances',
  pending: 'Pending',
  disbursed: 'Disbursed',
  failed: 'Failed',
  repaid: 'Repaid',
}

export default function AdvancesPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, isLoading, error } = useAdvances(filter === 'all' ? undefined : filter)

  const advances = data?.advances ?? []
  const showEmpty = !isLoading && !error && advances.length === 0

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-heading text-wagr-navy">Advances</h1>
            <p className="text-sm text-wagr-gray">
              Every advance your workers have requested. The Worker received column shows what
              actually landed on the worker's MoMo after the Wagr fee.
            </p>
          </div>
          <div className="w-full md:w-56">
            <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{STATUS_FILTER_LABELS.all}</SelectItem>
                {ADVANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_FILTER_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading && <p className="text-sm text-wagr-gray">Loading advances…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {showEmpty && filter === 'all' && (
          <EmptyState
            icon={CreditCard}
            title="No advances yet"
            description="When workers dial the Wagr USSD code and request an advance, the activity will show up here."
          />
        )}
        {showEmpty && filter !== 'all' && (
          <EmptyState
            icon={CreditCard}
            title={`No ${STATUS_FILTER_LABELS[filter].toLowerCase()} advances`}
            description="Try a different status filter or check back later."
          />
        )}

        {advances.length > 0 && <AdvancesTable advances={advances} />}
      </div>
    </main>
  )
}
