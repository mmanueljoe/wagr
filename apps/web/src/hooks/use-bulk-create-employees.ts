'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BulkCreateEmployeesInput } from '@wagr/types'

export interface BulkCreateEmployeesResponse {
  inserted: number
  failed: { index: number; reason: string }[]
}

export function useBulkCreateEmployees() {
  const queryClient = useQueryClient()
  return useMutation<BulkCreateEmployeesResponse, ApiResponseError, BulkCreateEmployeesInput>({
    mutationFn: (input) => api.post<BulkCreateEmployeesResponse>('/employees/bulk', input),
    onSuccess: () => {
      // Invalidate the employees list query to trigger a background refetch
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
