'use client'

import { env } from '@/lib/env'
import { useMutation } from '@tanstack/react-query'
import type { AuthUser } from '@wagr/types'

interface LoginError {
  code: string
  message: string
}

interface LoginInput {
  email: string
  password: string
}

async function loginRequest(input: LoginInput): Promise<AuthUser> {
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: LoginError } | null
    throw body?.error ?? { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password' }
  }

  return (await res.json()) as AuthUser
}

export function useLogin() {
  return useMutation<AuthUser, LoginError, LoginInput>({
    mutationFn: loginRequest,
  })
}
