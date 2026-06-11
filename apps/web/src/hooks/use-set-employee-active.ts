'use client'

import { type ApiResponseError, api } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Employee } from '@wagr/types'

interface Variables {
  id: string
  is_active: boolean
}

export function useSetEmployeeActive() {
  const queryClient = useQueryClient()
  return useMutation<Employee, ApiResponseError, Variables>({
    mutationFn: ({ id, is_active }) => api.patch<Employee>(`/employees/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
