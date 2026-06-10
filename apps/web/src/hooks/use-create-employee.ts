'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateEmployeeInput, Employee } from '@wagr/types'

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation<Employee, ApiResponseError, CreateEmployeeInput>({
    mutationFn: (input) => api.post<Employee>('/employees', input),
    onSuccess: () => {
      // List page needs to show the new worker immediately. Invalidate the
      // employees query so it refetches in the background.
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
