'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import type { AuthUser } from '@wagr/types'

interface LoginInput {
  email: string
  password: string
}

export function useLogin() {
  return useMutation<AuthUser, ApiResponseError, LoginInput>({
    mutationFn: (input) => api.post<AuthUser>('/auth/login', input),
  })
}
