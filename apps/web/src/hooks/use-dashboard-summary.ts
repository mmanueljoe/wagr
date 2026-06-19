'use client'

import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import type { DashboardSummary } from '@wagr/types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: ({ signal }) => api.get<DashboardSummary>('/dashboard/summary', { signal }),
  })
}
