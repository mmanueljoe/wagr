'use client'

import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSuccess: () => {
      // Drop every cached query so a fresh login starts from a clean cache.
      queryClient.clear()
    },
  })
}
