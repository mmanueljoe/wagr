'use client'

import { env } from '@/lib/env'
import { useMutation } from '@tanstack/react-query'
import type { AuthUser, RegisterEmployerInput } from '@wagr/types'

interface RegisterError {
  code: string
  message: string
}

async function registerRequest(input: RegisterEmployerInput): Promise<AuthUser> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: RegisterError } | null
    throw body?.error ?? { code: 'UNKNOWN', message: 'Something went wrong. Try again.' }
  }

  return (await res.json()) as AuthUser
}

export function useRegister() {
  return useMutation<AuthUser, RegisterError, RegisterEmployerInput>({
    mutationFn: registerRequest,
  })
}
