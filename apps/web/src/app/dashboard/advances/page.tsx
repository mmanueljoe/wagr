'use client'

import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAdvances, useRetryAdvance } from '@/hooks/use-advances'
import type { AdvanceFilters, AdvanceRequest, AdvanceStatus } from '@wagr/types'
import { formatGhs } from '@wagr/types'
import { ChevronLeft, ChevronRight, CreditCard, Download, RefreshCw } from 'lucide-react'
import { useState } from 'react'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'repaid', label: 'Repaid' },
  { value: 'failed', label: 'Failed' },
] as const

const STATUS_CLASSES: Record<AdvanceStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
  disbursed: 'bg-green-50 text-green-800 border border-green-200',
  repaid: 'bg-blue-50 text-blue-800 border border-blue-200',
  failed: 'bg-red-50 text-red-800 border border-red-200',
}

const STATUS_LABELS: Record<AdvanceStatus, string> = {
  pending: 'Pending',
  disbursed: 'Disbursed',
  repaid: 'Repaid',
  failed: 'Failed',
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function exportToCsv(advances: AdvanceRequest[]): void {
  const header = [
    'Employee',
    'Requested Amount (GHS)',
    'Fee (GHS)',
    'Net Disbursed (GHS)',
    'Status',
    'Requested At',
    'Disbursed At',
  ]
  const rows = advances.map((a) => [
    a.employee_name,
    (a.requested_amount_pesewas / 100).toFixed(2),
    (a.fee_amount_pesewas / 100).toFixed(2),
    (a.net_disbursed_pesewas / 100).toFixed(2),
    a.status,
    a.requested_at,
    a.disbursed_at ?? '',
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `wagr-advances-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

interface RetryButtonProps {
  advanceId: string
}

function RetryButton({ advanceId }: RetryButtonProps) {
  const { mutate, isPending } = useRetryAdvance()
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 px-2 text-xs"
      disabled={isPending}
      onClick={() => mutate(advanceId)}
    >
      <RefreshCw className="h-3 w-3 mr-1" />
      {isPending ? 'Retrying…' : 'Retry'}
    </Button>
  )
}

export default function AdvancesPage() {
  const [filters, setFilters] = useState<AdvanceFilters>({ status: 'all', page: 1 })
  const { data, isLoading, error } = useAdvances(filters)

  const activeStatus = filters.status ?? 'all'
  const currentPage = filters.page ?? 1
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1

  function setStatus(status: AdvanceFilters['status']) {
    setFilters((f) => ({ ...f, status, page: 1 }) as AdvanceFilters)
  }

  function setDateRange(from: string, to: string) {
    setFilters(
      (f) => ({ ...f, from: from || undefined, to: to || undefined, page: 1 }) as AdvanceFilters,
    )
  }

  function setPage(page: number) {
    setFilters((f) => ({ ...f, page }) as AdvanceFilters)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-wagr-navy">Advance Requests</h1>
          <p className="text-sm text-wagr-gray mt-1">
            All wage advances requested by your workers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => data && exportToCsv(data.advances)}
          disabled={!data || data.advances.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-wagr-lg bg-wagr-gray-light p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value as AdvanceFilters['status'])}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeStatus === tab.value
                  ? 'bg-wagr-white text-wagr-navy shadow-sm'
                  : 'text-wagr-gray hover:text-wagr-navy'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="date-from" className="text-wagr-gray">
            From
          </label>
          <input
            id="date-from"
            type="date"
            className="rounded-md border border-wagr-gray-light bg-wagr-white px-2 py-1 text-sm text-wagr-black focus:outline-none focus:ring-1 focus:ring-wagr-navy"
            value={filters.from ?? ''}
            onChange={(e) => setDateRange(e.target.value, filters.to ?? '')}
          />
          <label htmlFor="date-to" className="text-wagr-gray">
            to
          </label>
          <input
            id="date-to"
            type="date"
            className="rounded-md border border-wagr-gray-light bg-wagr-white px-2 py-1 text-sm text-wagr-black focus:outline-none focus:ring-1 focus:ring-wagr-navy"
            value={filters.to ?? ''}
            onChange={(e) => setDateRange(filters.from ?? '', e.target.value)}
          />
          {(filters.from || filters.to) && (
            <button
              type="button"
              className="text-xs text-wagr-gray hover:text-wagr-navy"
              onClick={() => setDateRange('', '')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && <p className="text-sm text-wagr-gray">Loading…</p>}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error.message}
        </p>
      )}

      {/* Empty state */}
      {!isLoading && data && data.advances.length === 0 && (
        <EmptyState
          icon={CreditCard}
          title="No advances found"
          description={
            activeStatus !== 'all' || filters.from || filters.to
              ? 'No advances match the current filters. Try adjusting the status or date range.'
              : 'Advances will appear here once workers start requesting them via USSD.'
          }
        />
      )}

      {/* Table */}
      {!isLoading && data && data.advances.length > 0 && (
        <>
          <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-right">Requested</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-right">Net Disbursed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Disbursed At</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.advances.map((advance) => (
                  <TableRow key={advance.id}>
                    <TableCell className="font-medium">{advance.employee_name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatGhs(advance.requested_amount_pesewas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-wagr-gray">
                      {formatGhs(advance.fee_amount_pesewas)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatGhs(advance.net_disbursed_pesewas)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[advance.status]}`}
                      >
                        {STATUS_LABELS[advance.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-wagr-gray">
                      {formatDate(advance.requested_at)}
                    </TableCell>
                    <TableCell className="text-sm text-wagr-gray">
                      {advance.disbursed_at ? formatDate(advance.disbursed_at) : '—'}
                    </TableCell>
                    <TableCell>
                      {advance.status === 'failed' && <RetryButton advanceId={advance.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-wagr-gray">
                Page {currentPage} of {totalPages} · {data.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
