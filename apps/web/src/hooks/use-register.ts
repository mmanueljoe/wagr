'use client'

import { env } from '@/lib/env'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import type { RegisterEmployerInput } from '@wagr/types'
import { useState } from 'react'

interface RegisterError {
  code: string
  message: string
}

export function useRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<RegisterError | null>(null)

  async function register(input: RegisterEmployerInput): Promise<{ ok: boolean }> {
    setIsSubmitting(true)
    setError(null)

    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: RegisterError } | null
      setError(body?.error ?? { code: 'UNKNOWN', message: 'Something went wrong. Try again.' })
      setIsSubmitting(false)
      return { ok: false }
    }

    // Registration succeeded on the api. Sign in on the client so the
    // Supabase session cookie is set — that's what the dashboard will read.
    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (signInError) {
      setError({
        code: 'SIGNIN_FAILED',
        message: 'Account created but sign-in failed. Try logging in.',
      })
      setIsSubmitting(false)
      return { ok: false }
    }

    setIsSubmitting(false)
    return { ok: true }
  }

  return { register, isSubmitting, error }
}
