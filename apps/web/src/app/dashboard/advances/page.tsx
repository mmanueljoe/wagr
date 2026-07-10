'use client'

import { AdvancesTable } from '@/components/dashboard/advances-table'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAdvances } from '@/hooks/use-advances'
import { ADVANCE_STATUSES, type AdvanceStatus } from '@wagr/types'
import { CreditCard, Download } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
  const [dateFilter, setDateFilter] = useState('')
  const { data, isLoading, error } = useAdvances(filter === 'all' ? undefined : filter)

  const advances = data?.advances ?? []

  const filteredAdvances = advances.filter((a) => {
    if (!dateFilter) return true
    const advanceDate = a.requested_at ? a.requested_at.split('T')[0] : undefined
    return !!advanceDate && advanceDate >= dateFilter
  })

  const showEmpty = !isLoading && !error && filteredAdvances.length === 0

  function exportToCsv() {
    if (filteredAdvances.length === 0) {
      toast.info('No advances to export')
      return
    }

    const headers =
      'Worker,MoMo,Requested (GHS),Fee (GHS),Worker Received (GHS),Status,Requested At\n'
    const rows = filteredAdvances
      .map((a) => {
        const req = (a.requested_pesewas / 100).toFixed(2)
        const fee = (a.fee_pesewas / 100).toFixed(2)
        const net = (a.net_pesewas / 100).toFixed(2)
        const cleanName = a.worker_name.replace(/"/g, '""')
        return `"${cleanName}","${a.worker_momo}",${req},${fee},${net},${a.status},"${a.requested_at}"`
      })
      .join('\n')

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `wagr_advances_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Advances list exported successfully!')
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-heading text-wagr-navy">Advances</h1>
            <p className="text-sm text-wagr-gray">
              Every advance your workers have requested. The Worker received column shows what
              actually landed on the worker's MoMo after the Wagr fee.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-44">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Start Date"
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-48">
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
            <Button
              variant="outline"
              onClick={exportToCsv}
              disabled={filteredAdvances.length === 0}
              className="w-full sm:w-auto border-wagr-navy text-wagr-navy hover:bg-wagr-navy hover:text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading && <p className="text-sm text-wagr-gray">Loading advances…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {showEmpty && filter === 'all' && !dateFilter && (
          <EmptyState
            icon={CreditCard}
            title="No advances yet"
            description="When workers dial the Wagr USSD code and request an advance, the activity will show up here."
          />
        )}
        {showEmpty && filter === 'all' && dateFilter && (
          <EmptyState
            icon={CreditCard}
            title="No advances match filters"
            description="Try expanding your start date range or clearing the date filter."
          />
        )}
        {showEmpty && filter !== 'all' && (
          <EmptyState
            icon={CreditCard}
            title={`No ${STATUS_FILTER_LABELS[filter].toLowerCase()} advances`}
            description="Try a different status filter or check back later."
          />
        )}

        {filteredAdvances.length > 0 && <AdvancesTable advances={filteredAdvances} />}
      </div>
    </main>
  )
}
