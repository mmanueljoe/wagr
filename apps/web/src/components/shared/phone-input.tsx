'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { forwardRef, useEffect, useState } from 'react'

interface PhoneInputProps
  extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'type'> {
  value?: string
  onChange?: (e164Value: string) => void
}

// Ghana-only phone input. User sees: [🇬🇭 +233] [ 24 412 3456 ]
// User can paste 024…, +233…, raw digits — we strip and normalise.
//
// We hold the in-progress digits in local state and only sync to the form
// (via onChange) once the user has either a complete 9-digit number or an
// empty field. If we forwarded partial values the form would round-trip them
// back as the controlled value and wipe the user's typing on every keystroke.
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value = '', onChange, className, ...props },
  ref,
) {
  const [localDigits, setLocalDigits] = useState(() => stripToLocalNineDigits(value))

  // Keep local state in sync if the parent value changes from outside
  // (form reset, programmatic set, etc.).
  useEffect(() => {
    const fromProp = stripToLocalNineDigits(value)
    setLocalDigits((prev) => (fromProp === prev ? prev : fromProp))
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = stripToLocalNineDigits(e.target.value)
    setLocalDigits(next)
    // Only push to the form when the user has a complete number or has
    // cleared the field — keeps form state strictly E.164 or empty.
    if (next.length === 9) onChange?.(`+233${next}`)
    else if (next.length === 0) onChange?.('')
    else onChange?.('')
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
