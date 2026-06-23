'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFloat } from '@/hooks/use-float'
import { useFundFloat } from '@/hooks/use-fund-float'
import { useSubmitFloatOtp } from '@/hooks/use-submit-float-otp'
import { EMPLOYEE_NETWORKS, type EmployeeNetwork, formatGhs, parseGhs } from '@wagr/types'
import { Loader2, Wallet } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

const NETWORK_LABELS: Record<EmployeeNetwork, string> = {
  mtn: 'MTN',
  telecel: 'Telecel',
  at: 'AirtelTigo',
}

export function FundFloatCard() {
  const { data, isLoading, isError } = useFloat()
  const fundFloat = useFundFloat()
  const submitOtp = useSubmitFloatOtp()

  const [expanded, setExpanded] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [momoInput, setMomoInput] = useState('')
  const [networkInput, setNetworkInput] = useState<EmployeeNetwork | ''>('')
  const [formError, setFormError] = useState<string | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [otpError, setOtpError] = useState<string | null>(null)

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

  const needsMomoDetails = !data.momo_number || !data.network
  const pending = data.has_pending_top_up
  const awaitingOtp = data.awaiting_otp_top_up

  function reset() {
    setAmountInput('')
    setMomoInput('')
    setNetworkInput('')
    setFormError(null)
    setExpanded(false)
  }

  function onSubmitOtp(e: FormEvent) {
    e.preventDefault()
    setOtpError(null)
    if (!awaitingOtp) return

    const trimmed = otpInput.trim()
    if (!trimmed) {
      setOtpError('Enter the OTP from your phone')
      return
    }

    submitOtp.mutate(
      { top_up_id: awaitingOtp.top_up_id, otpcode: trimmed },
      {
        onSuccess: () => {
          toast.success('OTP verified — check your phone for the MoMo PIN prompt')
          setOtpInput('')
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'OTP verification failed'
          setOtpError(message)
        },
      },
    )
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const amountPesewas = parseGhs(amountInput)
    if (amountPesewas === null || amountPesewas <= 0) {
      setFormError('Enter a valid amount in cedis, e.g. 5000')
      return
    }

    if (needsMomoDetails) {
      if (!/^0\d{9}$/.test(momoInput)) {
        setFormError('Enter a valid 10-digit MoMo number, e.g. 0241235993')
        return
      }
      if (!networkInput) {
        setFormError('Select your MoMo network')
        return
      }
    }

    fundFloat.mutate(
      {
        amount_pesewas: amountPesewas,
        ...(needsMomoDetails && momoInput ? { momo_number: momoInput } : {}),
        ...(needsMomoDetails && networkInput ? { network: networkInput } : {}),
      },
      {
        onSuccess: () => {
          toast.success('Check your phone for the MoMo PIN prompt')
          reset()
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
              Approve the prompt on your phone to complete top-up.
            </p>
          ) : awaitingOtp ? (
            <p className="mt-2 text-sm text-wagr-gray">
              Enter the OTP we sent to your phone to receive the MoMo prompt.
            </p>
          ) : (
            <p className="mt-2 text-sm text-wagr-gray">
              Workers can request advances against this balance.
            </p>
          )}
        </div>
        {!expanded && !pending && !awaitingOtp && (
          <Button onClick={() => setExpanded(true)}>Fund Float</Button>
        )}
      </div>

      {awaitingOtp && (
        <form onSubmit={onSubmitOtp} className="mt-6 space-y-4 border-t pt-6">
          <p className="text-sm text-wagr-gray">
            Top-up of <span className="font-medium">{formatGhs(awaitingOtp.amount_pesewas)}</span>{' '}
            is waiting for OTP verification.
          </p>
          <div className="space-y-2">
            <Label htmlFor="otp">One-time password</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value)
                setOtpError(null)
              }}
              disabled={submitOtp.isPending}
              autoFocus
            />
            <p className="text-xs text-wagr-gray">
              Check your SMS for a code from Moolre. Enter it here to trigger the MoMo prompt.
            </p>
          </div>
          {otpError && <p className="text-sm text-red-600">{otpError}</p>}
          <Button type="submit" disabled={submitOtp.isPending}>
            {submitOtp.isPending ? 'Verifying…' : 'Verify OTP'}
          </Button>
        </form>
      )}

      {expanded && !pending && !awaitingOtp && (
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
          </div>

          {needsMomoDetails && (
            <>
              <div className="space-y-2">
                <Label htmlFor="momo">Your MoMo number</Label>
                <Input
                  id="momo"
                  type="tel"
                  inputMode="numeric"
                  placeholder="0241235993"
                  value={momoInput}
                  onChange={(e) => setMomoInput(e.target.value)}
                  disabled={fundFloat.isPending}
                />
                <p className="text-xs text-wagr-gray">
                  This is the wallet Moolre will charge. Saved for next time.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="network">Network</Label>
                <Select
                  value={networkInput}
                  onValueChange={(value) => setNetworkInput(value as EmployeeNetwork)}
                  disabled={fundFloat.isPending}
                >
                  <SelectTrigger id="network">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {NETWORK_LABELS[n]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={fundFloat.isPending}>
              {fundFloat.isPending ? 'Sending prompt…' : 'Send MoMo prompt'}
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
