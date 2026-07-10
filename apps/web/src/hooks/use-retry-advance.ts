'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useRetryAdvance() {
  const queryClient = useQueryClient()
  return useMutation<{ success: boolean }, ApiResponseError, string>({
    mutationFn: (id) => api.post<{ success: boolean }>(`/advances/${id}/retry`, undefined),
    onSuccess: () => {
      // Invalidate advances and float queries to update balances and statuses immediately
      queryClient.invalidateQueries({ queryKey: ['advances'] })
      queryClient.invalidateQueries({ queryKey: ['float'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })
}
