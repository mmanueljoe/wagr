'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFloat } from '@/hooks/use-float'
import { useFundFloat } from '@/hooks/use-fund-float'
import { formatGhs, parseGhs } from '@wagr/types'
import { Loader2, Wallet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

export function FundFloatCard() {
  const { data, isLoading, isError } = useFloat()
  const fundFloat = useFundFloat()

  const [expanded, setExpanded] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-wagr-gray">Loading float…</p>
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <p className="text-sm text-red-600">Could not load float. Refresh to retry.</p>
      </div>
    )
  }

  const pending = data.has_pending_top_up

  function reset() {
    setAmountInput('')
    setFormError(null)
    setExpanded(false)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const amountPesewas = parseGhs(amountInput)
    if (amountPesewas === null || amountPesewas <= 0) {
      setFormError('Enter a valid amount in cedis, e.g. 5000')
      return
    }

    fundFloat.mutate(
      { amount_pesewas: amountPesewas },
      {
        onSuccess: (result) => {
          toast.success('Redirecting to the secure Moolre checkout…')
          // Moolre-hosted checkout. Employer authorises there; Moolre POSTs
          // our webhook + redirects them back to /dashboard when done.
          window.location.href = result.authorization_url
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Could not start float top-up'
          setFormError(message)
        },
      },
    )
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-wagr-gray">
            <Wallet className="size-4" />
            <span className="text-sm">Float balance</span>
          </div>
          <p className="mt-1 text-3xl font-heading text-wagr-navy">
            {formatGhs(data.balance_pesewas)}
          </p>
          {pending ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-wagr-gray">
              <Loader2 className="size-3 animate-spin" />
              Waiting for Moolre to confirm your top-up.
            </p>
          ) : (
            <p className="mt-2 text-sm text-wagr-gray">
              Workers can request advances against this balance.
            </p>
          )}
        </div>
        {!expanded && !pending && <Button onClick={() => setExpanded(true)}>Fund Float</Button>}
      </div>

      {expanded && !pending && (
        <form onSubmit={onSubmit} className="mt-6 space-y-4 border-t pt-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GHS)</Label>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="5000"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={fundFloat.isPending}
              autoFocus
            />
            <p className="text-xs text-wagr-gray">
              You'll be redirected to Moolre to enter your MoMo details and authorise the payment.
            </p>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={fundFloat.isPending}>
              {fundFloat.isPending ? 'Preparing…' : 'Continue to Moolre'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={reset}
              disabled={fundFloat.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
