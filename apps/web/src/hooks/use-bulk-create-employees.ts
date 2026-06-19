'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { BulkCreateResult, CreateEmployeeInput } from '@wagr/types'

export function useBulkCreateEmployees() {
  const queryClient = useQueryClient()
  return useMutation<BulkCreateResult, ApiResponseError, CreateEmployeeInput[]>({
    mutationFn: (employees) => api.post<BulkCreateResult>('/employees/bulk', { employees }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
