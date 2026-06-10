'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { Employee } from '@wagr/types'

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    // TanStack passes an AbortSignal we forward to fetch — navigating away
    // while the list is loading cancels the in-flight request.
    queryFn: ({ signal }) => api.get<Employee[]>('/employees', { signal }),
  })
}
