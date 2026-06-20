'use client'

import { EmptyState } from '@/components/shared/empty-state'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePeriodClosePreview } from '@/hooks/use-period-close-preview'
import { usePeriodCloseRun } from '@/hooks/use-period-close-run'
import { usePeriodCloseStatus } from '@/hooks/use-period-close-status'
import { formatGhs } from '@wagr/types'
import { Calendar, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export default function PeriodClosePage() {
  const { data: preview, isLoading, error, refetch } = usePeriodClosePreview()
  const runMutation = usePeriodCloseRun()

  // Track the active repayment ID. Preferred source: the mutation result.
  // If the user lands on a page where a close is already in flight, we fall
  // back to the preview's pending_repayment_id so the polling banner shows
  // up without needing them to click again.
  const [activeRepaymentId, setActiveRepaymentId] = useState<string | null>(null)
  const pollingId = activeRepaymentId ?? preview?.pending_repayment_id ?? null
  const { data: status } = usePeriodCloseStatus(pollingId)

  const nothingToRecover = preview && preview.items.length === 0

  function onConfirm() {
    runMutation.mutate(undefined, {
      onSuccess: (res) => {
        setActiveRepaymentId(res.repayment_id)
        toast.success('Check your phone for the MoMo PIN prompt')
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  function onDismissResult() {
    setActiveRepaymentId(null)
    void refetch()
  }

  return (
    <main className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-heading text-wagr-navy">Close pay period</h1>
          <p className="text-sm text-wagr-gray">
            Recover this period's advances from your MoMo wallet. Your normal payroll process is
            unchanged.
          </p>
        </header>

        {isLoading && <p className="text-sm text-wagr-gray">Loading current period…</p>}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        )}

        {status && status.status !== 'pending' && (
          <ResultBanner status={status} onDismiss={onDismissResult} />
        )}

        {status?.status === 'pending' && <PendingBanner totalCedis={status.total_pesewas / 100} />}

        {preview && nothingToRecover && (
          <EmptyState
            icon={Calendar}
            title="Nothing to recover this period"
            description="When workers request advances via USSD, they'll appear here. Come back at the end of the pay period to close it."
          />
        )}

        {preview && !nothingToRecover && (
          <>
            <PeriodSummary preview={preview} />

            <div className="bg-wagr-white rounded-wagr-lg border border-wagr-gray-light overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Advances taken this period</TableHead>
                    <TableHead>Date of last advance</TableHead>
                    <TableHead className="text-right">Gross to recover</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.items.map((item) => (
                    <TableRow key={item.employee_id}>
                      <TableCell className="font-medium">{item.worker_name}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {item.advances_taken_count}
                      </TableCell>
                      <TableCell className="text-sm text-wagr-gray">
                        {formatDate(item.last_advance_at)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatGhs(item.gross_pesewas)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-medium text-wagr-navy">
                      Total advances to recover
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-wagr-navy">
                      {formatGhs(preview.total_to_recover_pesewas)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>

            <div className="flex justify-end">
              <ConfirmCloseButton
                preview={preview}
                onConfirm={onConfirm}
                pending={runMutation.isPending || !!pollingId}
              />
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function PeriodSummary({
  preview,
}: Readonly<{ preview: NonNullable<ReturnType<typeof usePeriodClosePreview>['data']> }>) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pay period"
          value={`${formatDate(preview.period_start)} → ${formatDate(preview.period_end)}`}
        />
        <Stat label="Workers with advances" value={String(preview.worker_count)} />
        <Stat
          label="Total to recover"
          value={formatGhs(preview.total_to_recover_pesewas)}
          emphasis
        />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  emphasis,
}: Readonly<{ label: string; value: string; emphasis?: boolean }>) {
  return (
    <div>
      <p className="text-xs text-wagr-gray">{label}</p>
      <p
        className={
          emphasis ? 'text-2xl font-heading text-wagr-navy mt-1' : 'text-sm text-wagr-navy mt-1'
        }
      >
        {value}
      </p>
    </div>
  )
}

function ConfirmCloseButton({
  preview,
  onConfirm,
  pending,
}: Readonly<{
  preview: NonNullable<ReturnType<typeof usePeriodClosePreview>['data']>
  onConfirm: () => void
  pending: boolean
}>) {
  const amountCedis = preview.total_to_recover_pesewas / 100

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={pending || preview.has_pending_close}>
          {pending ? 'Processing…' : 'Close pay period'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close this pay period?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                Wagr will pull{' '}
                <span className="font-medium text-wagr-navy">
                  {formatGhs(preview.total_to_recover_pesewas)}
                </span>{' '}
                from your MoMo
                {preview.employer_momo_number && (
                  <>
                    {' '}
                    (<span className="font-mono">{preview.employer_momo_number}</span>)
                  </>
                )}{' '}
                to recover advances. Your regular payroll process is unchanged — you still pay each
                worker their normal salary minus the advance amount they took.
              </p>
              <p className="text-wagr-gray">
                {preview.worker_count} {preview.worker_count === 1 ? 'worker' : 'workers'} will
                receive a WhatsApp summary of the advances they took this period.
              </p>
              <p className="text-xs text-wagr-gray">
                You'll get a MoMo PIN prompt on{' '}
                {preview.employer_momo_number ?? 'your saved number'} — approve it to complete the
                recovery. Estimated total:{' '}
                <span className="font-mono text-wagr-navy">GHS {amountCedis.toFixed(2)}</span>.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Send MoMo prompt</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function PendingBanner({ totalCedis }: Readonly<{ totalCedis: number }>) {
  return (
    <div className="rounded-lg border border-wagr-navy-light bg-wagr-navy/5 p-4 flex items-start gap-3">
      <Loader2 className="size-5 text-wagr-navy animate-spin mt-0.5" />
      <div>
        <p className="font-medium text-wagr-navy">Recovery in progress</p>
        <p className="text-sm text-wagr-gray">
          Approve the MoMo prompt on your phone to release GHS {totalCedis.toFixed(2)} to Wagr. This
          page will update as soon as Moolre confirms.
        </p>
      </div>
    </div>
  )
}

interface ResultBannerProps {
  status: NonNullable<ReturnType<typeof usePeriodCloseStatus>['data']>
  onDismiss: () => void
}

function ResultBanner({ status, onDismiss }: Readonly<ResultBannerProps>) {
  if (status.status === 'collected') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="size-5 text-green-700 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-green-900">Pay period closed</p>
          <p className="text-sm text-green-800">
            Recovered {formatGhs(status.total_pesewas)} to your float. Worker advance summaries are
            being sent.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <XCircle className="size-5 text-red-700 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-red-900">Recovery failed</p>
        <p className="text-sm text-red-800">
          {status.failure_reason ?? 'Moolre reported a failure.'} The pay period stays open — top up
          your MoMo wallet and try again.
        </p>
      </div>
      <Button variant="ghost" size="sm" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' })
}
