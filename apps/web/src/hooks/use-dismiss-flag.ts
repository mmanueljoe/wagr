'use client'

import { api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Employee } from '@wagr/types'

export function useDismissFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => api.post<Employee>(`/employees/${employeeId}/dismiss-flag`),
    onSuccess: () => {
      // Refresh the employees list so the flag icon disappears.
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
