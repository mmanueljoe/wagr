'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation } from '@tanstack/react-query'
import type { AuthUser, RegisterEmployerInput } from '@wagr/types'

export function useRegister() {
  return useMutation<AuthUser, ApiResponseError, RegisterEmployerInput>({
    mutationFn: (input) => api.post<AuthUser>('/auth/register', input),
  })
}
