'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { EmployerProfile, UpdateProfileInput } from '@wagr/types'

export function useProfile() {
  return useQuery<EmployerProfile, ApiResponseError>({
    queryKey: ['profile'],
    queryFn: () => api.get<EmployerProfile>('/auth/profile'),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation<EmployerProfile, ApiResponseError, UpdateProfileInput>({
    mutationFn: (input) => api.patch<EmployerProfile>('/auth/profile', input),
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile'], profile)
      // Also invalidate summary/float queries in case pay date changes
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['period-close-preview'] })
    },
  })
}
