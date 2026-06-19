'use client'

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
import { useDismissFlag } from '@/hooks/use-dismiss-flag'
import type { Employee } from '@wagr/types'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface AdvancePatternFlagProps {
  employee: Employee
}

// Renders the warning icon + dialog for an employee whose advance pattern
// has triggered the flag. Returns null when the employee isn't flagged,
// so callers can safely drop this anywhere in the employees row without a
// conditional wrapper.
//
// Copy is deliberately framed as "advance pattern" / "check-in", never
// "credit risk" — Wagr does not score creditworthiness. See
// docs/specs/feature-ai.md "Advance Pattern Flag".
export function AdvancePatternFlag({ employee }: Readonly<AdvancePatternFlagProps>) {
  const dismissFlag = useDismissFlag()

  if (!employee.credit_flag) return null

  const onDismiss = () => {
    dismissFlag.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`Flag dismissed for ${employee.full_name}`)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          aria-label={`Advance pattern flag for ${employee.full_name}`}
          className="inline-flex items-center justify-center rounded-full bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Advance pattern — {employee.full_name}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block text-wagr-black">
              {employee.credit_flag_reason ?? 'Multiple advance requests in a short window.'}
            </span>
            {employee.credit_flag_at && (
              <span className="block text-xs text-wagr-gray">
                Flagged {formatFlagDate(employee.credit_flag_at)}
              </span>
            )}
            <span className="block text-xs text-wagr-gray pt-2">
              This is informational — Wagr does not block advances or score credit. If you've
              already checked in with {employee.full_name.split(' ')[0]}, you can dismiss the flag.
              It will return automatically if the pattern continues.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={dismissFlag.isPending}>Keep flag</AlertDialogCancel>
          <AlertDialogAction onClick={onDismiss} disabled={dismissFlag.isPending}>
            {dismissFlag.isPending ? 'Dismissing…' : 'Dismiss flag'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function formatFlagDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
