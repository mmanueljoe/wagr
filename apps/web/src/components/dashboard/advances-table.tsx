'use client'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useRetryAdvance } from '@/hooks/use-retry-advance'
import { type AdvanceListItem, type AdvanceStatus, formatGhs } from '@wagr/types'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<AdvanceStatus, string> = {
  pending: 'Pending',
  disbursed: 'Disbursed',
  failed: 'Failed',
  repaid: 'Repaid',
}

// Tailwind utility classes per status. Pending = neutral, disbursed = green,
// failed = red, repaid = navy (the "done" colour in Wagr's palette).
const STATUS_PILL_CLASSES: Record<AdvanceStatus, string> = {
  pending: 'bg-wagr-gray-light text-wagr-gray',
  disbursed: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  repaid: 'bg-wagr-navy/10 text-wagr-navy',
}

interface AdvancesTableProps {
  advances: AdvanceListItem[]
}

export function AdvancesTable({ advances }: Readonly<AdvancesTableProps>) {
  return (
    <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Worker</TableHead>
            <TableHead>MoMo</TableHead>
            <TableHead className="text-right">Requested</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Worker received</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {advances.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.worker_name}</TableCell>
              <TableCell className="font-mono text-sm">{a.worker_momo}</TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatGhs(a.requested_pesewas)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-wagr-gray">
                {formatGhs(a.fee_pesewas)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatGhs(a.net_pesewas)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_PILL_CLASSES[a.status]}`}
                >
                  {STATUS_LABELS[a.status]}
                </span>
              </TableCell>
              <TableCell className="text-sm text-wagr-gray">
                {formatRequestedAt(a.requested_at)}
              </TableCell>
              <TableCell className="text-right">
                {a.status === 'failed' && <RetryButton advanceId={a.id} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RetryButton({ advanceId }: Readonly<{ advanceId: string }>) {
  const retry = useRetryAdvance()

  function handleRetry() {
    retry.mutate(advanceId, {
      onSuccess: () => {
        toast.success('Disbursement retry initiated!')
      },
      onError: (err) => {
        toast.error(err.message || 'Retry failed')
      },
    })
  }

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={handleRetry}
      disabled={retry.isPending}
      className="text-xs py-1 h-7 text-wagr-navy hover:text-white hover:bg-wagr-navy"
    >
      {retry.isPending ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          Retrying…
        </>
      ) : (
        'Retry'
      )}
    </Button>
  )
}

function formatRequestedAt(iso: string): string {
  // Short relative-ish display: "15 Jun, 14:22". The full timestamp lives
  // in the row data; this is just the table-visible summary.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GH', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
