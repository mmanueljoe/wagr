'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value?: string
  onChange?: (e164Value: string) => void
}

// Ghana-only phone input. User sees: [🇬🇭 +233] [ 24 412 3456 ]
// User can paste 024…, +233…, raw digits — we strip and normalise.
// The value we hand back via onChange is always +233 + 9 digits, ready for the
// schema (registerEmployerSchema's GH_PHONE_REGEX).
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value = '', onChange, className, ...props },
  ref,
) {
  const localDigits = stripToLocalNineDigits(value)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = stripToLocalNineDigits(e.target.value)
    onChange?.(next.length === 9 ? `+233${next}` : '')
  }

  return (
    <div
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background overflow-hidden',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 px-3 text-sm text-muted-foreground bg-muted border-r border-input select-none">
        <span aria-hidden>🇬🇭</span>
        <span>+233</span>
      </span>
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={formatForDisplay(localDigits)}
        onChange={handleChange}
        placeholder="24 412 3456"
        className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
        {...props}
      />
    </div>
  )
})

// Take any user input — "0244123456", "+233244123456", "024 412 3456", "244 412 3456"
// — and return the 9 local digits we actually care about. We discard everything
// before the local part so paste-from-anywhere just works.
function stripToLocalNineDigits(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.startsWith('233')) return digits.slice(3, 12)
  if (digits.startsWith('0')) return digits.slice(1, 10)
  return digits.slice(0, 9)
}

// Pretty display: "244123456" -> "24 412 3456"
function formatForDisplay(digits: string): string {
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`
}
